-- ============================================
-- PHASE 9: API USAGE TRACKING AND RATE LIMITING TABLES
-- ============================================

-- API Usage Log Table
CREATE TABLE IF NOT EXISTS api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('cerebras', 'openai', 'elevenlabs')),
  model_version TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  fallback_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_usage_user ON api_usage_log(user_id);
CREATE INDEX idx_api_usage_created ON api_usage_log(created_at DESC);
CREATE INDEX idx_api_usage_service ON api_usage_log(service);

-- Rate Limits Table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, action_type)
);

CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);
CREATE INDEX idx_rate_limits_reset ON rate_limits(reset_time);

-- Rate Limit Log Table
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  limit_hit INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limit_log_user ON rate_limit_log(user_id);
CREATE INDEX idx_rate_limit_log_created ON rate_limit_log(created_at DESC);

-- Grading Log Table
CREATE TABLE IF NOT EXISTS grading_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  student_answer TEXT NOT NULL,
  score NUMERIC NOT NULL,
  is_correct BOOLEAN NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grading_log_user ON grading_log(user_id);
CREATE INDEX idx_grading_log_created ON grading_log(created_at DESC);

-- Enable RLS
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE grading_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_log
CREATE POLICY "Users can view own API usage"
  ON api_usage_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert API usage"
  ON api_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rate_limits
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits"
  ON rate_limits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for rate_limit_log
CREATE POLICY "Users can view own rate limit logs"
  ON rate_limit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert rate limit logs"
  ON rate_limit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for grading_log
CREATE POLICY "Users can view own grading logs"
  ON grading_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert grading logs"
  ON grading_log FOR INSERT
  TO authenticated
  WITH CHECK (true);