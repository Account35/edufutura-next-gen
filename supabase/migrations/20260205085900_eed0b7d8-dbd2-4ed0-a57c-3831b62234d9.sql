-- Add additional onboarding tracking fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS onboarding_skipped_steps TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_onboarding_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying incomplete onboardings
CREATE INDEX IF NOT EXISTS idx_users_incomplete_onboarding 
ON public.users (onboarding_started_at) 
WHERE onboarding_completed = false AND onboarding_started_at IS NOT NULL;

-- Add index for reminder scheduling
CREATE INDEX IF NOT EXISTS idx_users_onboarding_reminders 
ON public.users (last_onboarding_reminder_sent_at) 
WHERE onboarding_completed = false;

-- Create table for onboarding reminder logs
CREATE TABLE IF NOT EXISTS public.onboarding_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'email_day1', 'email_day3', 'email_day7', 'sms', 'in_app'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  channel TEXT NOT NULL, -- 'email', 'sms', 'in_app'
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  completed_after BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_reminder_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for onboarding_reminder_log
CREATE POLICY "Users can view own reminder logs"
ON public.onboarding_reminder_log
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reminder logs"
ON public.onboarding_reminder_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get incomplete onboarding users for reminders
CREATE OR REPLACE FUNCTION public.get_incomplete_onboarding_users(
  hours_since_start INTEGER DEFAULT 24,
  max_reminders_per_day INTEGER DEFAULT 1
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  onboarding_started_at TIMESTAMP WITH TIME ZONE,
  onboarding_step INTEGER,
  last_reminder_sent TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id as user_id,
    u.email,
    u.full_name,
    u.phone_number,
    u.onboarding_started_at,
    u.onboarding_step,
    u.last_onboarding_reminder_sent_at as last_reminder_sent
  FROM public.users u
  WHERE u.onboarding_started_at IS NOT NULL
    AND u.onboarding_completed = false
    AND u.onboarding_started_at < NOW() - (hours_since_start || ' hours')::INTERVAL
    AND (
      u.last_onboarding_reminder_sent_at IS NULL 
      OR u.last_onboarding_reminder_sent_at < NOW() - INTERVAL '24 hours'
    )
  ORDER BY u.onboarding_started_at ASC;
$$;

-- Create function to calculate onboarding completion stats
CREATE OR REPLACE FUNCTION public.get_onboarding_stats()
RETURNS TABLE (
  total_started BIGINT,
  total_completed BIGINT,
  completion_rate NUMERIC,
  avg_completion_time_hours NUMERIC,
  abandoned_24h BIGINT,
  abandoned_72h BIGINT,
  abandoned_7d BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE onboarding_started_at IS NOT NULL) as started,
      COUNT(*) FILTER (WHERE onboarding_completed = true) as completed,
      AVG(
        EXTRACT(EPOCH FROM (onboarding_completed_at - onboarding_started_at)) / 3600
      ) FILTER (WHERE onboarding_completed = true AND onboarding_started_at IS NOT NULL) as avg_time,
      COUNT(*) FILTER (
        WHERE onboarding_completed = false 
        AND onboarding_started_at IS NOT NULL
        AND onboarding_started_at < NOW() - INTERVAL '24 hours'
      ) as abandoned_1d,
      COUNT(*) FILTER (
        WHERE onboarding_completed = false 
        AND onboarding_started_at IS NOT NULL
        AND onboarding_started_at < NOW() - INTERVAL '72 hours'
      ) as abandoned_3d,
      COUNT(*) FILTER (
        WHERE onboarding_completed = false 
        AND onboarding_started_at IS NOT NULL
        AND onboarding_started_at < NOW() - INTERVAL '7 days'
      ) as abandoned_7d
    FROM public.users
  )
  SELECT 
    started as total_started,
    completed as total_completed,
    CASE WHEN started > 0 THEN ROUND((completed::NUMERIC / started) * 100, 2) ELSE 0 END as completion_rate,
    ROUND(COALESCE(avg_time, 0), 2) as avg_completion_time_hours,
    abandoned_1d as abandoned_24h,
    abandoned_3d as abandoned_72h,
    abandoned_7d as abandoned_7d
  FROM stats;
$$;