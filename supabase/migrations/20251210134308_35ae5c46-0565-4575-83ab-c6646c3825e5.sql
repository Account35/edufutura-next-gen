
-- Create role_permissions table using TEXT for role_name (more flexible)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  has_permission BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_name, permission_key)
);

-- Create admin_audit_log for security monitoring
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_description TEXT,
  target_type TEXT,
  target_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_alerts table for dashboard notifications
CREATE TABLE public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'warning',
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_permissions
CREATE POLICY "Authenticated users can view permissions"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.role_permissions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for admin_audit_log
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log FOR INSERT
WITH CHECK (true);

-- RLS policies for admin_alerts
CREATE POLICY "Admins can view alerts"
ON public.admin_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage alerts"
ON public.admin_alerts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default permissions for admin role
INSERT INTO public.role_permissions (role_name, permission_key, has_permission) VALUES
('admin', 'users.view', true),
('admin', 'users.edit', true),
('admin', 'users.delete', true),
('admin', 'content.moderate', true),
('admin', 'curriculum.view', true),
('admin', 'curriculum.edit', true),
('admin', 'system.configure', true),
('admin', 'analytics.view', true),
('admin', 'support.tickets', true),
('educator', 'curriculum.view', true),
('educator', 'curriculum.edit', true),
('educator', 'content.moderate', true);

-- Create indexes for performance
CREATE INDEX idx_admin_audit_log_user ON public.admin_audit_log(user_id);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action_type);
CREATE INDEX idx_admin_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_alerts_acknowledged ON public.admin_alerts(is_acknowledged);
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_name);

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role::text = rp.role_name
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.has_permission = true
  )
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  _user_id uuid,
  _action_type text,
  _action_description text,
  _target_type text DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _severity text DEFAULT 'info',
  _metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _log_id uuid;
BEGIN
  INSERT INTO public.admin_audit_log (
    user_id, action_type, action_description, target_type, target_id, severity, metadata
  )
  VALUES (
    _user_id, _action_type, _action_description, _target_type, _target_id, _severity, _metadata
  )
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;
