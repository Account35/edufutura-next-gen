
-- Add missing columns to admin_audit_log if not exists
ALTER TABLE public.admin_audit_log 
ADD COLUMN IF NOT EXISTS old_value JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS new_value JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS entity_id UUID DEFAULT NULL;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id ON public.admin_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_entity ON public.admin_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);

-- Create impersonation_log table
CREATE TABLE IF NOT EXISTS public.impersonation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  reason TEXT NOT NULL,
  support_ticket_id UUID REFERENCES public.support_tickets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create impersonation_actions table
CREATE TABLE IF NOT EXISTS public.impersonation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  impersonation_id UUID NOT NULL REFERENCES public.impersonation_log(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_description TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_access_notifications table for transparency
CREATE TABLE IF NOT EXISTS public.user_access_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  access_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for impersonation_log
CREATE POLICY "Admins can view impersonation logs"
  ON public.impersonation_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create impersonation logs"
  ON public.impersonation_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update impersonation logs"
  ON public.impersonation_log FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for impersonation_actions
CREATE POLICY "Admins can view impersonation actions"
  ON public.impersonation_actions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create impersonation actions"
  ON public.impersonation_actions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_access_notifications
CREATE POLICY "Users can view own access notifications"
  ON public.user_access_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create access notifications"
  ON public.user_access_notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can mark notifications as read"
  ON public.user_access_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin ON public.impersonation_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_target ON public.impersonation_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_actions_session ON public.impersonation_actions(impersonation_id);
CREATE INDEX IF NOT EXISTS idx_user_access_notifications_user ON public.user_access_notifications(user_id);

-- Enable realtime for audit log
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_audit_log;
