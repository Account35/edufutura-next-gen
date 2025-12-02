
-- ============================================
-- FIX: Infinite recursion in group_members RLS policy
-- ============================================
DROP POLICY IF EXISTS "Members can leave groups" ON group_members;

CREATE POLICY "Members can leave groups"
ON group_members
FOR DELETE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
    AND gm.role IN ('owner', 'moderator')
  )
);

-- ============================================
-- BACKGROUND JOBS AND QUEUE SYSTEM
-- ============================================

-- Background jobs table for async task processing
CREATE TABLE IF NOT EXISTS background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  worker_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_background_jobs_status_scheduled ON background_jobs(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_background_jobs_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_created ON background_jobs(created_at DESC);

-- Logging tables for monitoring and analytics
CREATE TABLE IF NOT EXISTS api_call_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  parameters JSONB,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  user_id UUID,
  error_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_call_log_timestamp ON api_call_log(timestamp DESC);
CREATE INDEX idx_api_call_log_user ON api_call_log(user_id);
CREATE INDEX idx_api_call_log_endpoint ON api_call_log(endpoint);

CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  action_data JSONB,
  user_id UUID NOT NULL,
  session_id TEXT,
  device_type TEXT,
  browser TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_actions_user ON user_actions(user_id, timestamp DESC);
CREATE INDEX idx_user_actions_type ON user_actions(action_type);
CREATE INDEX idx_user_actions_timestamp ON user_actions(timestamp DESC);

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value_ms INTEGER NOT NULL,
  device_type TEXT NOT NULL,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_page ON performance_metrics(page, metric_name);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- Quiz performance history for trending
CREATE TABLE IF NOT EXISTS quiz_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  average_score NUMERIC,
  quizzes_completed INTEGER DEFAULT 0,
  total_time_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quiz_performance_history_user_date ON quiz_performance_history(user_id, snapshot_date DESC);
CREATE INDEX idx_quiz_performance_history_subject ON quiz_performance_history(subject_name);

-- Certificate queue for batch generation
CREATE TABLE IF NOT EXISTS certificate_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'generated', 'failed')),
  certificate_url TEXT,
  error_message TEXT,
  queued_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_certificate_queue_status ON certificate_queue(status, queued_at);
CREATE INDEX idx_certificate_queue_user ON certificate_queue(user_id);

-- Notification digests for batched email delivery
CREATE TABLE IF NOT EXISTS notification_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  notification_ids UUID[] NOT NULL,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_digests_user ON notification_digests(user_id, created_at DESC);
CREATE INDEX idx_notification_digests_sent ON notification_digests(sent_at);

-- Hourly active users for analytics
CREATE TABLE IF NOT EXISTS hourly_active_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hour_timestamp TIMESTAMPTZ NOT NULL,
  grade_level INTEGER,
  account_type TEXT,
  active_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hourly_active_users_timestamp ON hourly_active_users(hour_timestamp DESC);

-- Daily content metrics for admin dashboard
CREATE TABLE IF NOT EXISTS daily_content_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  forum_posts_created INTEGER DEFAULT 0,
  resources_shared INTEGER DEFAULT 0,
  group_messages_sent INTEGER DEFAULT 0,
  engagement_rate NUMERIC,
  avg_post_upvotes NUMERIC,
  avg_resource_rating NUMERIC,
  moderation_actions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_content_metrics_date ON daily_content_metrics(metric_date DESC);

-- RLS Policies
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_performance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_digests ENABLE ROW LEVEL SECURITY;

-- Admin-only access to background jobs and metrics
CREATE POLICY "Admins can view background jobs" ON background_jobs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can manage background jobs" ON background_jobs FOR ALL USING (true);

-- Users can view own logs
CREATE POLICY "Users can view own api logs" ON api_call_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own actions" ON user_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own performance" ON performance_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own quiz history" ON quiz_performance_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own certificate queue" ON certificate_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own digests" ON notification_digests FOR SELECT USING (auth.uid() = user_id);

-- System can insert logs
CREATE POLICY "System can log api calls" ON api_call_log FOR INSERT WITH CHECK (true);
CREATE POLICY "System can log user actions" ON user_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "System can log performance" ON performance_metrics FOR INSERT WITH CHECK (true);

COMMENT ON TABLE background_jobs IS 'Async job queue for batch processing and scheduled tasks';
COMMENT ON TABLE api_call_log IS 'Logs all API calls for debugging and analytics';
COMMENT ON TABLE user_actions IS 'Tracks significant user actions for behavioral analytics';
COMMENT ON TABLE performance_metrics IS 'Measures critical user journey performance';
