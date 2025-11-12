-- Extend ai_conversations table with new fields
ALTER TABLE ai_conversations 
ADD COLUMN IF NOT EXISTS conversation_title TEXT,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Extend ai_messages table with new fields
ALTER TABLE ai_messages 
ADD COLUMN IF NOT EXISTS ai_model TEXT,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS context_data JSONB;

-- Track daily AI usage for rate limiting
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL,
  questions_asked INTEGER DEFAULT 0,
  account_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- Store AI-generated study schedules
CREATE TABLE IF NOT EXISTS study_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  schedule_title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  schedule_data JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by_ai BOOLEAN DEFAULT true,
  ical_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log AI safety incidents
CREATE TABLE IF NOT EXISTS ai_safety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  incident_type TEXT NOT NULL,
  user_message TEXT,
  ai_response TEXT,
  flagged_content TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_archived ON ai_conversations(is_archived);
CREATE INDEX IF NOT EXISTS idx_ai_messages_model ON ai_messages(ai_model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_date ON ai_usage_tracking(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_study_schedules_user ON study_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_study_schedules_active ON study_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_safety_logs_user ON ai_safety_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_safety_logs_reviewed ON ai_safety_logs(reviewed);

-- Enable RLS on new tables
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_safety_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_usage_tracking
CREATE POLICY "Users can view own usage" ON ai_usage_tracking
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can track usage" ON ai_usage_tracking
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update usage" ON ai_usage_tracking
FOR UPDATE USING (true);

-- RLS Policies for study_schedules
CREATE POLICY "Users can view own schedules" ON study_schedules
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules" ON study_schedules
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON study_schedules
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON study_schedules
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ai_safety_logs
CREATE POLICY "Admins can view safety logs" ON ai_safety_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "System can create safety logs" ON ai_safety_logs
FOR INSERT WITH CHECK (true);