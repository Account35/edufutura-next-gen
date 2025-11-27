-- Create content moderation log table
CREATE TABLE IF NOT EXISTS public.content_moderation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('forum_post', 'forum_reply', 'group_message', 'buddy_message', 'resource', 'profile')),
  content_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_confidence NUMERIC(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  issues_detected TEXT[],
  moderation_decision TEXT NOT NULL CHECK (moderation_decision IN ('approved', 'flagged', 'removed')),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user warnings table
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_reason TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  warned_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create buddy study sessions table
CREATE TABLE IF NOT EXISTS public.buddy_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_connection_id UUID NOT NULL REFERENCES study_buddies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user bans table
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  ban_reason TEXT NOT NULL,
  ban_duration_days INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'appealed', 'lifted')),
  appeal_text TEXT,
  appeal_status TEXT CHECK (appeal_status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.content_moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_moderation_log
CREATE POLICY "Moderators can view all moderation logs"
  ON public.content_moderation_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "System can insert moderation logs"
  ON public.content_moderation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Moderators can update moderation logs"
  ON public.content_moderation_log FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- RLS Policies for user_warnings
CREATE POLICY "Users can view own warnings"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all warnings"
  ON public.user_warnings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can create warnings"
  ON public.user_warnings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- RLS Policies for buddy_study_sessions
CREATE POLICY "Buddies can view own sessions"
  ON public.buddy_study_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_buddies
      WHERE id = buddy_connection_id
      AND (requester_id = auth.uid() OR recipient_id = auth.uid())
      AND status = 'accepted'
    )
  );

CREATE POLICY "Buddies can create sessions"
  ON public.buddy_study_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_buddies
      WHERE id = buddy_connection_id
      AND (requester_id = auth.uid() OR recipient_id = auth.uid())
      AND status = 'accepted'
    )
  );

-- RLS Policies for user_bans
CREATE POLICY "Users can view own bans"
  ON public.user_bans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all bans"
  ON public.user_bans FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Moderators can manage bans"
  ON public.user_bans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Create indexes
CREATE INDEX idx_moderation_log_reviewed ON content_moderation_log(reviewed);
CREATE INDEX idx_moderation_log_decision ON content_moderation_log(moderation_decision);
CREATE INDEX idx_moderation_log_user ON content_moderation_log(user_id);
CREATE INDEX idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX idx_user_warnings_created ON user_warnings(created_at);
CREATE INDEX idx_buddy_sessions_connection ON buddy_study_sessions(buddy_connection_id);
CREATE INDEX idx_buddy_sessions_scheduled ON buddy_study_sessions(scheduled_at);
CREATE INDEX idx_user_bans_user ON user_bans(user_id);
CREATE INDEX idx_user_bans_status ON user_bans(status);
CREATE INDEX idx_user_bans_expires ON user_bans(expires_at);