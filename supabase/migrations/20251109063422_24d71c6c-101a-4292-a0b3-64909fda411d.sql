-- Create user_progress table for tracking subject-level progress
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  current_chapter TEXT,
  current_chapter_number INTEGER,
  chapters_completed INTEGER DEFAULT 0,
  total_chapters INTEGER,
  progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  last_accessed TIMESTAMP DEFAULT NOW(),
  average_quiz_score DECIMAL(5,2),
  next_topic TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subject_name)
);

-- Create achievements table for badges and milestones
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_type TEXT NOT NULL,
  badge_description TEXT,
  subject_name TEXT,
  icon_url TEXT,
  earned_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create activity_log table for recent activity feed
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  subject_name TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create study_preferences table for learning preferences
CREATE TABLE public.study_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  learning_style TEXT,
  study_pace TEXT,
  preferred_study_time TEXT,
  daily_goal_minutes INTEGER DEFAULT 30,
  weekly_goal_hours INTEGER DEFAULT 5,
  study_reminders_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create year_end_reports table for uploaded academic reports
CREATE TABLE public.year_end_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  grade_level INTEGER NOT NULL CHECK (grade_level >= 6 AND grade_level <= 12),
  report_file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  pass_status TEXT,
  ai_analysis JSONB,
  subject_grades JSONB,
  overall_percentage DECIMAL(5,2),
  verified BOOLEAN DEFAULT false,
  verified_by UUID,
  upload_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create subscription_history table for tracking transactions
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id TEXT,
  transaction_type TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  amount_zar DECIMAL(10,2),
  currency TEXT DEFAULT 'ZAR',
  payment_method TEXT DEFAULT 'payfast',
  payment_status TEXT,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  transaction_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add new fields to existing users table
ALTER TABLE public.users
ADD COLUMN last_dashboard_visit TIMESTAMP,
ADD COLUMN total_study_hours DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN study_streak_days INTEGER DEFAULT 0,
ADD COLUMN last_study_date DATE;

-- Create indexes for optimal performance
CREATE INDEX idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_subject ON public.user_progress(subject_name);
CREATE INDEX idx_achievements_user ON public.achievements(user_id);
CREATE INDEX idx_achievements_earned ON public.achievements(earned_at DESC);
CREATE INDEX idx_activity_log_user ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON public.activity_log(timestamp DESC);
CREATE INDEX idx_year_end_reports_user ON public.year_end_reports(user_id);
CREATE INDEX idx_subscription_history_user ON public.subscription_history(user_id);

-- Enable RLS on all new tables
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.year_end_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_progress
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.user_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for achievements
CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" ON public.achievements
  FOR INSERT WITH CHECK (true);

-- RLS policies for activity_log
CREATE POLICY "Users can view own activity" ON public.activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON public.activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for study_preferences
CREATE POLICY "Users can view own preferences" ON public.study_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.study_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.study_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON public.study_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for year_end_reports
CREATE POLICY "Users can view own reports" ON public.year_end_reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.year_end_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for subscription_history
CREATE POLICY "Users can view own subscription history" ON public.subscription_history
  FOR SELECT USING (auth.uid() = user_id);

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_progress_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_preferences_updated_at
  BEFORE UPDATE ON public.study_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();