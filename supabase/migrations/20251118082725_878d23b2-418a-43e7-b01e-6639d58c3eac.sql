-- Phase 7: Career Guidance System Database Schema

-- Create career_paths table storing South African career information
CREATE TABLE IF NOT EXISTS public.career_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  career_name TEXT NOT NULL,
  career_category TEXT NOT NULL,
  career_description TEXT,
  skills_required TEXT[],
  subjects_alignment JSONB DEFAULT '{}'::jsonb,
  education_level TEXT,
  average_salary_zar INTEGER,
  job_outlook TEXT,
  growth_rate DECIMAL,
  typical_workplaces TEXT[],
  career_progression TEXT,
  related_careers TEXT[],
  sa_specific_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_career_paths_category ON public.career_paths(career_category);
CREATE INDEX IF NOT EXISTS idx_career_paths_subjects ON public.career_paths USING GIN(subjects_alignment);

-- Create tertiary_institutions table storing SA universities and colleges
CREATE TABLE IF NOT EXISTS public.tertiary_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT,
  contact_info JSONB DEFAULT '{}'::jsonb,
  courses_offered JSONB DEFAULT '[]'::jsonb,
  admission_requirements JSONB DEFAULT '{}'::jsonb,
  application_deadlines JSONB DEFAULT '{}'::jsonb,
  fees_info JSONB DEFAULT '{}'::jsonb,
  campus_facilities TEXT[],
  student_support TEXT,
  accreditation TEXT,
  rankings JSONB DEFAULT '{}'::jsonb,
  institution_logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for location filtering
CREATE INDEX IF NOT EXISTS idx_institutions_province ON public.tertiary_institutions(province);
CREATE INDEX IF NOT EXISTS idx_institutions_type ON public.tertiary_institutions(institution_type);

-- Create career_recommendations table tracking personalized suggestions
CREATE TABLE IF NOT EXISTS public.career_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_path_id UUID REFERENCES public.career_paths(id) ON DELETE CASCADE,
  recommendation_score DECIMAL CHECK (recommendation_score >= 0 AND recommendation_score <= 1),
  recommendation_reason TEXT,
  based_on JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  viewed BOOLEAN DEFAULT false,
  interested BOOLEAN DEFAULT false,
  notes TEXT
);

-- Create RLS policies for career_recommendations
ALTER TABLE public.career_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
  ON public.career_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON public.career_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations"
  ON public.career_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create institution_recommendations table
CREATE TABLE IF NOT EXISTS public.institution_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES public.tertiary_institutions(id) ON DELETE CASCADE,
  program_name TEXT,
  match_score DECIMAL CHECK (match_score >= 0 AND match_score <= 1),
  match_factors JSONB DEFAULT '{}'::jsonb,
  admission_probability TEXT,
  application_status TEXT,
  saved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create RLS policies for institution_recommendations
ALTER TABLE public.institution_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own institution recommendations"
  ON public.institution_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own institution recommendations"
  ON public.institution_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own institution recommendations"
  ON public.institution_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create career_assessments table storing interest and aptitude evaluations
CREATE TABLE IF NOT EXISTS public.career_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_type TEXT NOT NULL,
  assessment_data JSONB DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  validity_period DATE
);

-- Create RLS policies for career_assessments
ALTER TABLE public.career_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON public.career_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.career_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Public read access for career paths and institutions
ALTER TABLE public.career_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view career paths"
  ON public.career_paths FOR SELECT
  USING (true);

ALTER TABLE public.tertiary_institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view institutions"
  ON public.tertiary_institutions FOR SELECT
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_career_recs_user ON public.career_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_career_recs_career ON public.career_recommendations(career_path_id);
CREATE INDEX IF NOT EXISTS idx_institution_recs_user ON public.institution_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_institution_recs_inst ON public.institution_recommendations(institution_id);
CREATE INDEX IF NOT EXISTS idx_assessments_user ON public.career_assessments(user_id);