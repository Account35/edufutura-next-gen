-- Create security_log table for tracking security events
CREATE TABLE IF NOT EXISTS public.security_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create failed_login_attempts table for tracking auth failures
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  failure_reason TEXT,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create account_lockouts table for tracking locked accounts
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create data_export_requests table for POPIA compliance
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  export_url TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create data_deletion_requests table for POPIA right to be forgotten
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all security tables
ALTER TABLE public.security_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Security log policies (admin only read, system insert)
CREATE POLICY "Admins can view security logs" ON public.security_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Failed login attempts (admin only)
CREATE POLICY "Admins can view failed logins" ON public.failed_login_attempts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Account lockouts (admin only read)
CREATE POLICY "Admins can view lockouts" ON public.account_lockouts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Data export requests (users can see own, admins see all)
CREATE POLICY "Users can view own export requests" ON public.data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create export requests" ON public.data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Data deletion requests (users can see own, admins see all)
CREATE POLICY "Users can view own deletion requests" ON public.data_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create deletion requests" ON public.data_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deletion requests" ON public.data_deletion_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deletion requests" ON public.data_deletion_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_log_user_id ON public.security_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_log_event_type ON public.security_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_log_created_at ON public.security_log(created_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_email ON public.failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON public.failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON public.account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_data_export_user ON public.data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_user ON public.data_deletion_requests(user_id);