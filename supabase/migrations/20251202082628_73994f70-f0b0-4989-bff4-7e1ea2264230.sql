
-- Fix RLS on hourly_active_users and daily_content_metrics tables
ALTER TABLE hourly_active_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_content_metrics ENABLE ROW LEVEL SECURITY;

-- Admin-only access to analytics tables
CREATE POLICY "Admins can view hourly active users" ON hourly_active_users 
FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view daily content metrics" ON daily_content_metrics 
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- System can insert analytics
CREATE POLICY "System can log hourly active users" ON hourly_active_users 
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can log daily content metrics" ON daily_content_metrics 
FOR INSERT WITH CHECK (true);
