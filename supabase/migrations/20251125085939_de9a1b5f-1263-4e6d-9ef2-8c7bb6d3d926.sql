-- Phase 8: Community Platform & Social Learning Database Schema

-- Forums table for subject-based discussions
CREATE TABLE IF NOT EXISTS public.forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name TEXT NOT NULL,
  forum_title TEXT NOT NULL,
  forum_description TEXT,
  icon_name TEXT,
  color_theme TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  post_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  moderators UUID[],
  forum_rules TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forums_subject_name ON public.forums(subject_name);
CREATE INDEX idx_forums_is_active ON public.forums(is_active);

-- Forum posts table for discussion threads
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_title TEXT NOT NULL CHECK (LENGTH(post_title) <= 200),
  post_content TEXT NOT NULL CHECK (LENGTH(post_content) <= 5000),
  chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tags TEXT[],
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'flagged', 'removed')),
  flagged_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_forum_id ON public.forum_posts(forum_id);
CREATE INDEX idx_forum_posts_user_id ON public.forum_posts(user_id);
CREATE INDEX idx_forum_posts_moderation_status ON public.forum_posts(moderation_status);
CREATE INDEX idx_forum_posts_last_activity ON public.forum_posts(last_activity DESC);

-- Post replies table for threaded responses
CREATE TABLE IF NOT EXISTS public.post_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.forum_posts(id) ON DELETE CASCADE NOT NULL,
  parent_reply_id UUID REFERENCES public.post_replies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reply_content TEXT NOT NULL CHECK (LENGTH(reply_content) <= 2000),
  is_solution BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'flagged', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  depth_level INTEGER DEFAULT 0
);

CREATE INDEX idx_post_replies_post_id ON public.post_replies(post_id);
CREATE INDEX idx_post_replies_user_id ON public.post_replies(user_id);
CREATE INDEX idx_post_replies_is_solution ON public.post_replies(is_solution);

-- Reply upvotes junction table
CREATE TABLE IF NOT EXISTS public.reply_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id UUID REFERENCES public.post_replies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reply_id, user_id)
);

CREATE INDEX idx_reply_upvotes_reply_id ON public.reply_upvotes(reply_id);
CREATE INDEX idx_reply_upvotes_user_id ON public.reply_upvotes(user_id);

-- Study groups table
CREATE TABLE IF NOT EXISTS public.study_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL CHECK (LENGTH(group_name) <= 100),
  group_description TEXT CHECK (LENGTH(group_description) <= 500),
  subject_names TEXT[],
  grade_level INTEGER,
  max_members INTEGER DEFAULT 10 CHECK (max_members BETWEEN 3 AND 20),
  privacy_level TEXT DEFAULT 'public' CHECK (privacy_level IN ('public', 'invite_only', 'private')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meeting_schedule JSONB,
  group_avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_study_groups_privacy_level ON public.study_groups(privacy_level);
CREATE INDEX idx_study_groups_is_active ON public.study_groups(is_active);
CREATE INDEX idx_study_groups_grade_level ON public.study_groups(grade_level);
CREATE INDEX idx_study_groups_subject_names ON public.study_groups USING GIN(subject_names);

-- Group members junction table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);

-- Group chat messages table
CREATE TABLE IF NOT EXISTS public.group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_content TEXT NOT NULL CHECK (LENGTH(message_content) <= 1000),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system')),
  attachment_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  read_by UUID[],
  moderation_status TEXT DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_group_chat_messages_group_id ON public.group_chat_messages(group_id, created_at DESC);
CREATE INDEX idx_group_chat_messages_user_id ON public.group_chat_messages(user_id);

-- Shared resources table
CREATE TABLE IF NOT EXISTS public.shared_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource_title TEXT NOT NULL CHECK (LENGTH(resource_title) <= 150),
  resource_description TEXT CHECK (LENGTH(resource_description) <= 1000),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('notes', 'summary', 'diagram', 'worksheet', 'cheat_sheet', 'flashcards')),
  subject_name TEXT NOT NULL,
  chapter_id UUID REFERENCES public.curriculum_chapters(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_mb DECIMAL(5,2),
  download_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  tags TEXT[],
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('approved', 'pending', 'flagged', 'removed')),
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shared_resources_subject_name ON public.shared_resources(subject_name);
CREATE INDEX idx_shared_resources_chapter_id ON public.shared_resources(chapter_id);
CREATE INDEX idx_shared_resources_user_id ON public.shared_resources(user_id);
CREATE INDEX idx_shared_resources_moderation_status ON public.shared_resources(moderation_status);
CREATE INDEX idx_shared_resources_rating_average ON public.shared_resources(rating_average DESC);

-- Resource ratings table
CREATE TABLE IF NOT EXISTS public.resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.shared_resources(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT CHECK (LENGTH(review_text) <= 500),
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

CREATE INDEX idx_resource_ratings_resource_id ON public.resource_ratings(resource_id);
CREATE INDEX idx_resource_ratings_user_id ON public.resource_ratings(user_id);

-- Study buddies table
CREATE TABLE IF NOT EXISTS public.study_buddies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  common_subjects TEXT[],
  match_score DECIMAL(5,2),
  message TEXT CHECK (LENGTH(message) <= 500),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id),
  CHECK (requester_id != recipient_id)
);

CREATE INDEX idx_study_buddies_requester_id ON public.study_buddies(requester_id);
CREATE INDEX idx_study_buddies_recipient_id ON public.study_buddies(recipient_id);
CREATE INDEX idx_study_buddies_status ON public.study_buddies(status);

-- Buddy chat messages table (premium feature)
CREATE TABLE IF NOT EXISTS public.buddy_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buddy_connection_id UUID REFERENCES public.study_buddies(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_content TEXT NOT NULL CHECK (LENGTH(message_content) <= 1000),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  moderation_status TEXT DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_buddy_chat_messages_connection_id ON public.buddy_chat_messages(buddy_connection_id, created_at);
CREATE INDEX idx_buddy_chat_messages_sender_id ON public.buddy_chat_messages(sender_id);

-- Community reports table
CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_content_type TEXT NOT NULL CHECK (reported_content_type IN ('post', 'reply', 'message', 'resource', 'user', 'group')),
  reported_content_id UUID NOT NULL,
  report_reason TEXT NOT NULL CHECK (report_reason IN ('spam', 'harassment', 'inappropriate', 'cheating', 'personal_info', 'bullying', 'other')),
  report_description TEXT CHECK (LENGTH(report_description) <= 1000),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'action_taken', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  action_taken TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_community_reports_status ON public.community_reports(status);
CREATE INDEX idx_community_reports_content ON public.community_reports(reported_content_type, reported_content_id);
CREATE INDEX idx_community_reports_reporter_id ON public.community_reports(reporter_id);

-- User reputation table
CREATE TABLE IF NOT EXISTS public.user_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reputation_score INTEGER DEFAULT 0,
  helpful_posts INTEGER DEFAULT 0,
  quality_resources INTEGER DEFAULT 0,
  positive_ratings INTEGER DEFAULT 0,
  warnings_received INTEGER DEFAULT 0,
  reputation_level TEXT DEFAULT 'newcomer' CHECK (reputation_level IN ('newcomer', 'contributor', 'trusted', 'leader')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_reputation_score ON public.user_reputation(reputation_score DESC);
CREATE INDEX idx_user_reputation_user_id ON public.user_reputation(user_id);

-- Group quiz attempts table
CREATE TABLE IF NOT EXISTS public.group_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.study_groups(id) ON DELETE CASCADE NOT NULL,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_ids UUID[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  average_score DECIMAL(5,2),
  individual_scores JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_group_quiz_attempts_group_id ON public.group_quiz_attempts(group_id);
CREATE INDEX idx_group_quiz_attempts_quiz_id ON public.group_quiz_attempts(quiz_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_buddies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forums (public read, admin/moderator write)
CREATE POLICY "Anyone can view active forums"
  ON public.forums FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage forums"
  ON public.forums FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for forum_posts
CREATE POLICY "Anyone can view approved posts"
  ON public.forum_posts FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Users can create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.forum_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for post_replies
CREATE POLICY "Anyone can view approved replies"
  ON public.post_replies FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Users can create replies"
  ON public.post_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON public.post_replies FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for reply_upvotes
CREATE POLICY "Users can view upvotes"
  ON public.reply_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Users can create own upvotes"
  ON public.reply_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
  ON public.reply_upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for study_groups
CREATE POLICY "Users can view public and their groups"
  ON public.study_groups FOR SELECT
  USING (
    privacy_level = 'public' OR
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = study_groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.study_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners can update groups"
  ON public.study_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = study_groups.id AND user_id = auth.uid() AND role = 'owner'
    )
  );

-- RLS Policies for group_members
CREATE POLICY "Members can view group membership"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups"
  ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for group_chat_messages
CREATE POLICY "Group members can view messages"
  ON public.group_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_chat_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON public.group_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_chat_messages.group_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for shared_resources
CREATE POLICY "Anyone can view approved resources"
  ON public.shared_resources FOR SELECT
  USING (moderation_status = 'approved');

CREATE POLICY "Users can upload resources"
  ON public.shared_resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resources"
  ON public.shared_resources FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for resource_ratings
CREATE POLICY "Anyone can view ratings"
  ON public.resource_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create ratings"
  ON public.resource_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.resource_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for study_buddies
CREATE POLICY "Users can view own buddy connections"
  ON public.study_buddies FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can create buddy requests"
  ON public.study_buddies FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Recipients can update buddy status"
  ON public.study_buddies FOR UPDATE
  USING (auth.uid() = recipient_id OR auth.uid() = requester_id);

-- RLS Policies for buddy_chat_messages
CREATE POLICY "Buddies can view messages"
  ON public.buddy_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_buddies
      WHERE id = buddy_chat_messages.buddy_connection_id
        AND (requester_id = auth.uid() OR recipient_id = auth.uid())
        AND status = 'accepted'
    )
  );

CREATE POLICY "Buddies can send messages"
  ON public.buddy_chat_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for community_reports
CREATE POLICY "Users can view own reports"
  ON public.community_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON public.community_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can review reports"
  ON public.community_reports FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_reputation
CREATE POLICY "Anyone can view reputation"
  ON public.user_reputation FOR SELECT
  USING (true);

CREATE POLICY "System can update reputation"
  ON public.user_reputation FOR ALL
  USING (true);

-- RLS Policies for group_quiz_attempts
CREATE POLICY "Group members can view quiz attempts"
  ON public.group_quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_quiz_attempts.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create quiz attempts"
  ON public.group_quiz_attempts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_quiz_attempts.group_id AND user_id = auth.uid()
    )
  );

-- Triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_forums_updated_at
  BEFORE UPDATE ON public.forums
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_groups_updated_at
  BEFORE UPDATE ON public.study_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_reputation_updated_at
  BEFORE UPDATE ON public.user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();