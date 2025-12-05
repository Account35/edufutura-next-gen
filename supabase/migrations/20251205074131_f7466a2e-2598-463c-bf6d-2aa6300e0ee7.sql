
-- Performance predictions table
CREATE TABLE public.performance_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  prediction_type TEXT NOT NULL CHECK (prediction_type IN ('quiz_score', 'completion_time', 'trend_forecast')),
  subject_name TEXT,
  chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE SET NULL,
  quiz_id UUID,
  predicted_value NUMERIC NOT NULL,
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  actual_value NUMERIC,
  accuracy_score NUMERIC,
  features_used JSONB DEFAULT '{}',
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE
);

-- Dropout risk tracking
CREATE TABLE public.dropout_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  risk_score NUMERIC DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  login_frequency_score NUMERIC DEFAULT 0,
  study_gap_score NUMERIC DEFAULT 0,
  progress_stagnation_score NUMERIC DEFAULT 0,
  performance_decline_score NUMERIC DEFAULT 0,
  social_isolation_score NUMERIC DEFAULT 0,
  last_login_days INTEGER DEFAULT 0,
  days_since_study INTEGER DEFAULT 0,
  risk_factors JSONB DEFAULT '[]',
  intervention_needed BOOLEAN DEFAULT false,
  last_intervention_at TIMESTAMP WITH TIME ZONE,
  intervention_type TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Performance trends table
CREATE TABLE public.performance_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  trend_type TEXT NOT NULL CHECK (trend_type IN ('improving', 'plateau', 'declining', 'stable')),
  slope NUMERIC,
  improvement_rate NUMERIC,
  plateau_duration_weeks INTEGER,
  forecast_4_weeks NUMERIC,
  forecast_confidence NUMERIC,
  data_points INTEGER DEFAULT 0,
  analysis_period_start DATE,
  analysis_period_end DATE,
  insights JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, subject_name)
);

-- Peer benchmarks table
CREATE TABLE public.peer_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade_level INTEGER NOT NULL,
  subject_name TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('quiz_score', 'completion_time', 'study_hours')),
  percentile_10 NUMERIC,
  percentile_25 NUMERIC,
  percentile_50 NUMERIC,
  percentile_75 NUMERIC,
  percentile_90 NUMERIC,
  mean_value NUMERIC,
  std_deviation NUMERIC,
  sample_size INTEGER DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(grade_level, subject_name, metric_type)
);

-- User percentile rankings
CREATE TABLE public.user_percentile_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  user_value NUMERIC,
  percentile_rank NUMERIC,
  peer_comparison TEXT,
  gap_to_median NUMERIC,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, subject_name, metric_type)
);

-- Enable RLS
ALTER TABLE public.performance_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropout_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_percentile_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own predictions" ON public.performance_predictions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage predictions" ON public.performance_predictions FOR ALL USING (true);

CREATE POLICY "Users can view own risk scores" ON public.dropout_risk_scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage risk scores" ON public.dropout_risk_scores FOR ALL USING (true);

CREATE POLICY "Users can view own trends" ON public.performance_trends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage trends" ON public.performance_trends FOR ALL USING (true);

CREATE POLICY "Anyone can view peer benchmarks" ON public.peer_benchmarks FOR SELECT USING (true);
CREATE POLICY "System can manage benchmarks" ON public.peer_benchmarks FOR ALL USING (true);

CREATE POLICY "Users can view own rankings" ON public.user_percentile_rankings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage rankings" ON public.user_percentile_rankings FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_predictions_user ON public.performance_predictions(user_id, prediction_type);
CREATE INDEX idx_dropout_risk_level ON public.dropout_risk_scores(risk_level, intervention_needed);
CREATE INDEX idx_trends_user_subject ON public.performance_trends(user_id, subject_name);
CREATE INDEX idx_benchmarks_grade_subject ON public.peer_benchmarks(grade_level, subject_name);
CREATE INDEX idx_rankings_user ON public.user_percentile_rankings(user_id);
