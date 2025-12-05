-- Create recommendations_cache table for pre-computed recommendations
CREATE TABLE public.recommendations_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'chapter', 'quiz', 'resource', 'study_group', 'study_buddy'
  ranked_item_ids UUID[] NOT NULL DEFAULT '{}',
  scores NUMERIC[] DEFAULT '{}',
  explanations TEXT[] DEFAULT '{}',
  algorithm_used TEXT DEFAULT 'hybrid', -- 'content_based', 'collaborative', 'hybrid', 'popularity'
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_item_interactions table for building user-item matrix
CREATE TABLE public.user_item_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'chapter', 'quiz', 'resource', 'study_group'
  interaction_type TEXT NOT NULL, -- 'view', 'complete', 'rate', 'bookmark', 'share', 'dismiss'
  interaction_value NUMERIC DEFAULT 1, -- rating value, time spent, etc.
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, item_id, item_type, interaction_type)
);

-- Create content_features table for content-based filtering
CREATE TABLE public.content_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'chapter', 'quiz', 'resource'
  feature_vector NUMERIC[] DEFAULT '{}', -- normalized feature values
  feature_names TEXT[] DEFAULT '{}', -- corresponding feature names
  subject_name TEXT,
  difficulty_score NUMERIC, -- 0-1 normalized
  complexity_score NUMERIC, -- 0-1 normalized
  key_concepts TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_id, item_type)
);

-- Create user_preferences table for learned preferences
CREATE TABLE public.user_content_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preference_type TEXT NOT NULL, -- 'subject', 'difficulty', 'content_type', 'concept'
  preference_value TEXT NOT NULL,
  weight NUMERIC DEFAULT 1.0, -- learned weight from interactions
  interaction_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, preference_type, preference_value)
);

-- Create recommendation_feedback table for tracking effectiveness
CREATE TABLE public.recommendation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_id UUID,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  feedback_type TEXT NOT NULL, -- 'click', 'dismiss', 'complete', 'rate'
  feedback_value NUMERIC,
  algorithm_used TEXT,
  position_shown INTEGER, -- position in recommendation list
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create similarity_scores table for caching item-item similarities
CREATE TABLE public.item_similarity_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_a_id UUID NOT NULL,
  item_b_id UUID NOT NULL,
  item_type TEXT NOT NULL,
  similarity_score NUMERIC NOT NULL, -- 0-1 cosine similarity
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(item_a_id, item_b_id, item_type)
);

-- Enable RLS on all tables
ALTER TABLE public.recommendations_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_item_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_content_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_similarity_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recommendations" ON public.recommendations_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage recommendations" ON public.recommendations_cache FOR ALL USING (true);

CREATE POLICY "Users can view own interactions" ON public.user_item_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interactions" ON public.user_item_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interactions" ON public.user_item_interactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view content features" ON public.content_features FOR SELECT USING (true);
CREATE POLICY "System can manage content features" ON public.content_features FOR ALL USING (true);

CREATE POLICY "Users can view own preferences" ON public.user_content_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own preferences" ON public.user_content_preferences FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback" ON public.recommendation_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON public.recommendation_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view similarity scores" ON public.item_similarity_scores FOR SELECT USING (true);
CREATE POLICY "System can manage similarity scores" ON public.item_similarity_scores FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_recommendations_cache_user ON public.recommendations_cache(user_id);
CREATE INDEX idx_recommendations_cache_type ON public.recommendations_cache(recommendation_type);
CREATE INDEX idx_recommendations_cache_expires ON public.recommendations_cache(expires_at);
CREATE INDEX idx_user_item_interactions_user ON public.user_item_interactions(user_id);
CREATE INDEX idx_user_item_interactions_item ON public.user_item_interactions(item_id, item_type);
CREATE INDEX idx_content_features_item ON public.content_features(item_id, item_type);
CREATE INDEX idx_content_features_subject ON public.content_features(subject_name);
CREATE INDEX idx_user_preferences_user ON public.user_content_preferences(user_id);
CREATE INDEX idx_recommendation_feedback_user ON public.recommendation_feedback(user_id);
CREATE INDEX idx_item_similarity_item ON public.item_similarity_scores(item_a_id, item_type);

-- Function to compute cosine similarity
CREATE OR REPLACE FUNCTION compute_cosine_similarity(vector_a NUMERIC[], vector_b NUMERIC[])
RETURNS NUMERIC AS $$
DECLARE
  dot_product NUMERIC := 0;
  norm_a NUMERIC := 0;
  norm_b NUMERIC := 0;
  i INTEGER;
BEGIN
  IF array_length(vector_a, 1) IS NULL OR array_length(vector_b, 1) IS NULL THEN
    RETURN 0;
  END IF;
  
  IF array_length(vector_a, 1) != array_length(vector_b, 1) THEN
    RETURN 0;
  END IF;
  
  FOR i IN 1..array_length(vector_a, 1) LOOP
    dot_product := dot_product + (vector_a[i] * vector_b[i]);
    norm_a := norm_a + (vector_a[i] * vector_a[i]);
    norm_b := norm_b + (vector_b[i] * vector_b[i]);
  END LOOP;
  
  IF norm_a = 0 OR norm_b = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
END;
$$ LANGUAGE plpgsql IMMUTABLE;