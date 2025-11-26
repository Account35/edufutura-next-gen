-- Drop all existing policies comprehensively
DROP POLICY IF EXISTS "Users can create own upvotes" ON reply_upvotes;
DROP POLICY IF EXISTS "Users can delete own upvotes" ON reply_upvotes;
DROP POLICY IF EXISTS "Users can view upvotes" ON reply_upvotes;
DROP POLICY IF EXISTS "Anyone can view public groups" ON study_groups;
DROP POLICY IF EXISTS "Members can view own groups" ON study_groups;
DROP POLICY IF EXISTS "Users can create groups" ON study_groups;
DROP POLICY IF EXISTS "Group owners can update groups" ON study_groups;
DROP POLICY IF EXISTS "Members can view group membership" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Members can leave groups" ON group_members;
DROP POLICY IF EXISTS "Group members can view messages" ON group_chat_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON group_chat_messages;
DROP POLICY IF EXISTS "Users can update own messages within 5 minutes" ON group_chat_messages;
DROP POLICY IF EXISTS "Anyone can view approved resources" ON shared_resources;
DROP POLICY IF EXISTS "Users can upload resources" ON shared_resources;
DROP POLICY IF EXISTS "Users can update own resources" ON shared_resources;
DROP POLICY IF EXISTS "Anyone can view ratings" ON resource_ratings;
DROP POLICY IF EXISTS "Users can create ratings" ON resource_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON resource_ratings;
DROP POLICY IF EXISTS "Users can view own buddy connections" ON study_buddies;
DROP POLICY IF EXISTS "Users can create buddy requests" ON study_buddies;
DROP POLICY IF EXISTS "Recipients can update requests" ON study_buddies;
DROP POLICY IF EXISTS "Connected buddies can view chat" ON buddy_chat_messages;
DROP POLICY IF EXISTS "Premium users can send buddy messages" ON buddy_chat_messages;
DROP POLICY IF EXISTS "Users can view own reports" ON community_reports;
DROP POLICY IF EXISTS "Users can create reports" ON community_reports;
DROP POLICY IF EXISTS "Admins can review reports" ON community_reports;
DROP POLICY IF EXISTS "Anyone can view reputation" ON user_reputation;
DROP POLICY IF EXISTS "System can update reputation" ON user_reputation;
DROP POLICY IF EXISTS "Group members can view quiz attempts" ON group_quiz_attempts;
DROP POLICY IF EXISTS "Group members can create quiz attempts" ON group_quiz_attempts;

-- Reply upvotes policies
CREATE POLICY "Users can create own upvotes"
ON reply_upvotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
ON reply_upvotes FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view upvotes"
ON reply_upvotes FOR SELECT
USING (true);

-- Study groups policies
CREATE POLICY "Anyone can view public groups"
ON study_groups FOR SELECT
USING (privacy_level = 'public' AND is_active = true);

CREATE POLICY "Members can view own groups"
ON study_groups FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_id = study_groups.id 
  AND user_id = auth.uid()
));

CREATE POLICY "Users can create groups"
ON study_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group owners can update groups"
ON study_groups FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_id = study_groups.id 
  AND user_id = auth.uid() 
  AND role = 'owner'
));

-- Group members policies
CREATE POLICY "Members can view group membership"
ON group_members FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members gm
  WHERE gm.group_id = group_members.group_id 
  AND gm.user_id = auth.uid()
));

CREATE POLICY "Users can join groups"
ON group_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can leave groups"
ON group_members FOR DELETE
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_members.group_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'moderator')
  )
);

-- Group chat messages policies
CREATE POLICY "Group members can view messages"
ON group_chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_id = group_chat_messages.group_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Group members can send messages"
ON group_chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_chat_messages.group_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own messages within 5 minutes"
ON group_chat_messages FOR UPDATE
USING (
  auth.uid() = user_id AND 
  created_at > NOW() - INTERVAL '5 minutes'
);

-- Shared resources policies
CREATE POLICY "Anyone can view approved resources"
ON shared_resources FOR SELECT
USING (moderation_status = 'approved');

CREATE POLICY "Users can upload resources"
ON shared_resources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resources"
ON shared_resources FOR UPDATE
USING (auth.uid() = user_id);

-- Resource ratings policies
CREATE POLICY "Anyone can view ratings"
ON resource_ratings FOR SELECT
USING (true);

CREATE POLICY "Users can create ratings"
ON resource_ratings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
ON resource_ratings FOR UPDATE
USING (auth.uid() = user_id);

-- Study buddies policies
CREATE POLICY "Users can view own buddy connections"
ON study_buddies FOR SELECT
USING (auth.uid() IN (requester_id, recipient_id));

CREATE POLICY "Users can create buddy requests"
ON study_buddies FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Recipients can update requests"
ON study_buddies FOR UPDATE
USING (auth.uid() = recipient_id);

-- Buddy chat messages policies (premium feature)
CREATE POLICY "Connected buddies can view chat"
ON buddy_chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM study_buddies 
  JOIN users ON users.id = auth.uid()
  WHERE study_buddies.id = buddy_chat_messages.buddy_connection_id 
  AND auth.uid() IN (requester_id, recipient_id) 
  AND status = 'accepted' 
  AND users.account_type = 'premium'
));

CREATE POLICY "Premium users can send buddy messages"
ON buddy_chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND 
  EXISTS (
    SELECT 1 FROM study_buddies 
    JOIN users ON users.id = auth.uid()
    WHERE study_buddies.id = buddy_chat_messages.buddy_connection_id 
    AND auth.uid() IN (requester_id, recipient_id) 
    AND status = 'accepted' 
    AND users.account_type = 'premium'
  )
);

-- Community reports policies
CREATE POLICY "Users can view own reports"
ON community_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
ON community_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can review reports"
ON community_reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- User reputation policies
CREATE POLICY "Anyone can view reputation"
ON user_reputation FOR SELECT
USING (true);

CREATE POLICY "System can update reputation"
ON user_reputation FOR ALL
USING (true);

-- Group quiz attempts policies
CREATE POLICY "Group members can view quiz attempts"
ON group_quiz_attempts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_id = group_quiz_attempts.group_id 
  AND user_id = auth.uid()
));

CREATE POLICY "Group members can create quiz attempts"
ON group_quiz_attempts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_id = group_quiz_attempts.group_id 
  AND user_id = auth.uid()
));