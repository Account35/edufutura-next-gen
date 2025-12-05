
-- Learning goals table for personalized achievement tracking
CREATE TABLE public.learning_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('completion', 'performance', 'consistency', 'improvement', 'social', 'contribution')),
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  subject_name TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'abandoned')),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Learning recommendations table
CREATE TABLE public.learning_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('next_chapter', 'practice_quiz', 'study_resource', 'study_group', 'remediation', 'review')),
  priority_score NUMERIC DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  target_id UUID,
  target_type TEXT,
  subject_name TEXT,
  reason TEXT,
  is_dismissed BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Learning style profiles
CREATE TABLE public.learning_style_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  visual_score NUMERIC DEFAULT 0,
  auditory_score NUMERIC DEFAULT 0,
  kinesthetic_score NUMERIC DEFAULT 0,
  reading_writing_score NUMERIC DEFAULT 0,
  dominant_style TEXT,
  content_preferences JSONB DEFAULT '{}',
  effectiveness_data JSONB DEFAULT '{}',
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Spaced repetition schedule
CREATE TABLE public.spaced_repetition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE CASCADE,
  topic_name TEXT,
  ease_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetition_count INTEGER DEFAULT 0,
  next_review_date DATE NOT NULL,
  last_review_date DATE,
  last_quality INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, chapter_id, topic_name)
);

-- Prerequisite gaps tracking
CREATE TABLE public.prerequisite_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE CASCADE,
  prerequisite_chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE CASCADE,
  gap_severity TEXT DEFAULT 'moderate' CHECK (gap_severity IN ('minor', 'moderate', 'severe')),
  quiz_score NUMERIC,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_style_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prerequisite_gaps ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own learning goals" ON public.learning_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own recommendations" ON public.learning_recommendations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own learning style" ON public.learning_style_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own spaced repetition" ON public.spaced_repetition_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own prerequisite gaps" ON public.prerequisite_gaps FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_learning_goals_user_status ON public.learning_goals(user_id, status);
CREATE INDEX idx_learning_recommendations_user ON public.learning_recommendations(user_id, is_dismissed, is_completed);
CREATE INDEX idx_spaced_repetition_review ON public.spaced_repetition_items(user_id, next_review_date);
CREATE INDEX idx_prerequisite_gaps_user ON public.prerequisite_gaps(user_id, is_resolved);

-- Function to calculate spaced repetition interval (SM-2 algorithm)
CREATE OR REPLACE FUNCTION calculate_next_review(
  p_quality INTEGER,
  p_ease_factor NUMERIC,
  p_interval INTEGER,
  p_repetition INTEGER
) RETURNS TABLE(new_interval INTEGER, new_ease_factor NUMERIC, new_repetition INTEGER) AS $$
DECLARE
  v_ease NUMERIC;
  v_interval INTEGER;
  v_rep INTEGER;
BEGIN
  v_ease := p_ease_factor;
  
  IF p_quality < 3 THEN
    v_rep := 0;
    v_interval := 1;
  ELSE
    v_rep := p_repetition + 1;
    IF v_rep = 1 THEN
      v_interval := 1;
    ELSIF v_rep = 2 THEN
      v_interval := 6;
    ELSE
      v_interval := ROUND(p_interval * v_ease);
    END IF;
    
    v_ease := v_ease + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    IF v_ease < 1.3 THEN v_ease := 1.3; END IF;
  END IF;
  
  RETURN QUERY SELECT v_interval, v_ease, v_rep;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
