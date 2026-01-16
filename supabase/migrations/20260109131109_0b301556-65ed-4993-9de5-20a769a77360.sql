-- Cohort Analysis Tables
CREATE TABLE public.user_cohorts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_month TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE public.cohort_retention (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_month TEXT NOT NULL,
  month_offset INTEGER NOT NULL,
  total_users INTEGER NOT NULL DEFAULT 0,
  retained_users INTEGER NOT NULL DEFAULT 0,
  retention_rate NUMERIC DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cohort_month, month_offset)
);

-- Funnel Analysis Tables
CREATE TABLE public.conversion_funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_name TEXT NOT NULL,
  funnel_description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.funnel_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID REFERENCES public.conversion_funnels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_id TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.funnel_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funnel_id UUID REFERENCES public.conversion_funnels(id) ON DELETE CASCADE,
  analysis_date DATE NOT NULL,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  total_users INTEGER NOT NULL DEFAULT 0,
  converted_users INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  drop_off_rate NUMERIC DEFAULT 0,
  avg_time_to_convert_minutes NUMERIC,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(funnel_id, analysis_date, step_name)
);

-- A/B Testing Framework Tables
CREATE TABLE public.ab_experiments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_name TEXT NOT NULL,
  experiment_description TEXT,
  variant_a_name TEXT NOT NULL DEFAULT 'Control',
  variant_a_config JSONB DEFAULT '{}',
  variant_b_name TEXT NOT NULL DEFAULT 'Treatment',
  variant_b_config JSONB DEFAULT '{}',
  target_metric TEXT NOT NULL,
  target_audience JSONB DEFAULT '{}',
  traffic_percentage INTEGER NOT NULL DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  winner_variant TEXT,
  is_significant BOOLEAN,
  p_value NUMERIC,
  confidence_level NUMERIC,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.ab_test_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(experiment_id, user_id)
);

CREATE TABLE public.ab_test_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.ab_test_assignments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 1,
  converted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE public.ab_experiment_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  experiment_id UUID REFERENCES public.ab_experiments(id) ON DELETE CASCADE,
  result_date DATE NOT NULL,
  variant_a_users INTEGER NOT NULL DEFAULT 0,
  variant_a_conversions INTEGER NOT NULL DEFAULT 0,
  variant_a_rate NUMERIC DEFAULT 0,
  variant_b_users INTEGER NOT NULL DEFAULT 0,
  variant_b_conversions INTEGER NOT NULL DEFAULT 0,
  variant_b_rate NUMERIC DEFAULT 0,
  relative_improvement NUMERIC,
  p_value NUMERIC,
  is_significant BOOLEAN DEFAULT false,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(experiment_id, result_date)
);

-- Platform Forecasting Tables
CREATE TABLE public.platform_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('user_growth', 'revenue', 'churn', 'load')),
  forecast_date DATE NOT NULL,
  predicted_value NUMERIC NOT NULL,
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  actual_value NUMERIC,
  accuracy_score NUMERIC,
  model_version TEXT DEFAULT 'v1',
  features_used JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  validated_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(forecast_type, forecast_date)
);

-- Enable RLS
ALTER TABLE public.user_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_retention ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_experiment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin access
CREATE POLICY "Admins can manage cohorts" ON public.user_cohorts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage cohort retention" ON public.cohort_retention
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage funnels" ON public.conversion_funnels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage funnel events" ON public.funnel_events
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view funnel analytics" ON public.funnel_analytics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage experiments" ON public.ab_experiments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view assignments" ON public.ab_test_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert assignments" ON public.ab_test_assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view conversions" ON public.ab_test_conversions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert conversions" ON public.ab_test_conversions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view experiment results" ON public.ab_experiment_results
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage forecasts" ON public.platform_forecasts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_user_cohorts_month ON public.user_cohorts(cohort_month);
CREATE INDEX idx_cohort_retention_month ON public.cohort_retention(cohort_month);
CREATE INDEX idx_funnel_events_funnel ON public.funnel_events(funnel_id, step_order);
CREATE INDEX idx_funnel_events_user ON public.funnel_events(user_id);
CREATE INDEX idx_ab_assignments_experiment ON public.ab_test_assignments(experiment_id, variant);
CREATE INDEX idx_ab_conversions_experiment ON public.ab_test_conversions(experiment_id, variant);
CREATE INDEX idx_platform_forecasts_type ON public.platform_forecasts(forecast_type, forecast_date);

-- Insert default conversion funnel
INSERT INTO public.conversion_funnels (funnel_name, funnel_description, steps) VALUES
('User Onboarding', 'Tracks user journey from visit to first quiz completion', 
 '[{"name": "Visitor", "order": 1, "event": "page_view"}, {"name": "Registered", "order": 2, "event": "signup_complete"}, {"name": "Profile Complete", "order": 3, "event": "profile_complete"}, {"name": "First Quiz", "order": 4, "event": "quiz_complete"}, {"name": "Premium", "order": 5, "event": "subscription_upgrade"}]'::jsonb);