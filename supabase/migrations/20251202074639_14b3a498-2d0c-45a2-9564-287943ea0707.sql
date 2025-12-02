-- ============================================
-- PHASE 9: DATABASE OPTIMIZATION & PERFORMANCE
-- ============================================

-- ============================================
-- SECTION 1: COMPOSITE INDEXES
-- ============================================

-- Quiz Attempts Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created 
  ON quiz_attempts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_completed_score 
  ON quiz_attempts(quiz_id, is_completed, score_percentage);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_quiz 
  ON quiz_attempts(user_id, quiz_id);

-- User Chapter Progress Indexes
CREATE INDEX IF NOT EXISTS idx_user_chapter_progress_user_status_accessed 
  ON user_chapter_progress(user_id, status, last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_user_chapter_progress_chapter_status 
  ON user_chapter_progress(chapter_id, status);

-- Group Chat Messages Indexes
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_group_created 
  ON group_chat_messages(group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_chat_messages_user_created 
  ON group_chat_messages(user_id, created_at DESC);

-- Partial Index for Moderation Queue (only pending items)
CREATE INDEX IF NOT EXISTS idx_forum_posts_moderation_pending 
  ON forum_posts(created_at DESC) 
  WHERE moderation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_shared_resources_moderation_pending 
  ON shared_resources(upload_date DESC) 
  WHERE moderation_status = 'pending';

-- ============================================
-- SECTION 2: GIN INDEXES FOR ARRAYS & JSONB
-- ============================================

-- Study Groups - Subject Names Array
CREATE INDEX IF NOT EXISTS idx_study_groups_subject_names_gin 
  ON study_groups USING gin(subject_names);

-- Shared Resources - Tags Array
CREATE INDEX IF NOT EXISTS idx_shared_resources_tags_gin 
  ON shared_resources USING gin(tags);

-- Users - Subjects Studying JSONB
CREATE INDEX IF NOT EXISTS idx_users_subjects_studying_gin 
  ON users USING gin(subjects_studying);

-- ============================================
-- SECTION 3: FULL-TEXT SEARCH INDEXES
-- ============================================

-- Chapters Full-Text Search
CREATE INDEX IF NOT EXISTS idx_chapters_fts 
  ON curriculum_chapters USING gin(
    to_tsvector('english', 
      COALESCE(chapter_title, '') || ' ' || 
      COALESCE(chapter_description, '') || ' ' ||
      COALESCE(content_markdown, '')
    )
  );

-- Forum Posts Full-Text Search
CREATE INDEX IF NOT EXISTS idx_forum_posts_fts 
  ON forum_posts USING gin(
    to_tsvector('english', 
      COALESCE(post_title, '') || ' ' || 
      COALESCE(post_content, '')
    )
  );

-- Shared Resources Full-Text Search
CREATE INDEX IF NOT EXISTS idx_shared_resources_fts 
  ON shared_resources USING gin(
    to_tsvector('english', 
      COALESCE(resource_title, '') || ' ' || 
      COALESCE(resource_description, '')
    )
  );

-- ============================================
-- SECTION 4: MATERIALIZED VIEWS
-- ============================================

-- User Performance Summary (Phase 5 Quiz Aggregates)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_performance_summary AS
SELECT 
  user_id,
  quiz_id,
  COUNT(DISTINCT quiz_id) as quizzes_taken,
  AVG(score_percentage) as average_score,
  MAX(score_percentage) as best_score,
  COUNT(*) FILTER (WHERE passed = true) as quizzes_passed,
  SUM(time_spent_seconds) as total_study_time,
  MIN(created_at) as first_attempt,
  MAX(created_at) as last_attempt
FROM quiz_attempts
WHERE is_completed = true
GROUP BY user_id, quiz_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_performance_summary_user_quiz 
  ON user_performance_summary(user_id, quiz_id);

-- Quiz Statistics (Quiz-Level Analytics)
CREATE MATERIALIZED VIEW IF NOT EXISTS quiz_statistics AS
SELECT 
  quiz_id,
  COUNT(*) as total_attempts,
  AVG(score_percentage) as average_score,
  COUNT(*) FILTER (WHERE passed = true) as pass_count,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY score_percentage) as median_score,
  MIN(time_spent_seconds) as fastest_completion,
  MAX(time_spent_seconds) as slowest_completion,
  MAX(created_at) as last_attempted
FROM quiz_attempts
WHERE is_completed = true
GROUP BY quiz_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_statistics_quiz 
  ON quiz_statistics(quiz_id);

-- Community Activity Summary (Daily Metrics)
CREATE MATERIALIZED VIEW IF NOT EXISTS community_activity_summary AS
SELECT 
  DATE(created_at) as activity_date,
  COUNT(*) FILTER (WHERE activity_type = 'forum_post_created') as posts_created,
  COUNT(*) FILTER (WHERE activity_type = 'group_message_sent') as messages_sent,
  COUNT(*) FILTER (WHERE activity_type = 'resource_uploaded') as resources_shared,
  COUNT(DISTINCT user_id) as active_users
FROM activity_log
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_activity_summary_date 
  ON community_activity_summary(activity_date DESC);

-- ============================================
-- SECTION 5: DATABASE TRIGGERS
-- ============================================

-- Trigger: Update User Progress After Quiz Completion
CREATE OR REPLACE FUNCTION update_user_progress_after_quiz()
RETURNS TRIGGER AS $$
DECLARE
  v_subject_name TEXT;
  v_chapter_id UUID;
BEGIN
  -- Only process completed quiz attempts
  IF NEW.is_completed = true THEN
    -- Get subject name and chapter from quiz
    SELECT q.subject_name, q.chapter_id 
    INTO v_subject_name, v_chapter_id
    FROM quizzes q
    WHERE q.id = NEW.quiz_id;

    -- Update user_progress for the subject
    INSERT INTO user_progress (
      user_id, 
      subject_name, 
      average_quiz_score, 
      last_accessed,
      updated_at
    )
    VALUES (
      NEW.user_id,
      v_subject_name,
      NEW.score_percentage,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, subject_name) DO UPDATE
    SET 
      average_quiz_score = (
        SELECT AVG(score_percentage) 
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        WHERE qa.user_id = NEW.user_id 
        AND q.subject_name = v_subject_name
        AND qa.is_completed = true
      ),
      last_accessed = NOW(),
      updated_at = NOW();

    -- Update chapter progress if quiz was passed
    IF NEW.passed = true AND v_chapter_id IS NOT NULL THEN
      UPDATE user_chapter_progress
      SET 
        status = 'completed',
        completed_at = NOW()
      WHERE user_id = NEW.user_id 
      AND chapter_id = v_chapter_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS quiz_completion_progress_trigger ON quiz_attempts;
CREATE TRIGGER quiz_completion_progress_trigger
AFTER INSERT OR UPDATE ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION update_user_progress_after_quiz();

-- Trigger: Update Group Activity After Message
CREATE OR REPLACE FUNCTION update_group_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update group's updated_at timestamp
  UPDATE study_groups
  SET updated_at = NOW()
  WHERE id = NEW.group_id;

  -- Update sender's last_active in group_members
  UPDATE group_members
  SET last_active = NOW()
  WHERE group_id = NEW.group_id 
  AND user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS group_message_activity_trigger ON group_chat_messages;
CREATE TRIGGER group_message_activity_trigger
AFTER INSERT ON group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_group_activity();

-- Trigger: Update Forum Post Counts
CREATE OR REPLACE FUNCTION update_forum_post_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reply count and last activity
  UPDATE forum_posts
  SET 
    reply_count = (
      SELECT COUNT(*) 
      FROM post_replies 
      WHERE post_id = NEW.post_id
    ),
    last_activity = NOW()
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS forum_reply_count_trigger ON post_replies;
CREATE TRIGGER forum_reply_count_trigger
AFTER INSERT ON post_replies
FOR EACH ROW
EXECUTE FUNCTION update_forum_post_counts();

-- Trigger: Audit Log for Users Table
CREATE TABLE IF NOT EXISTS user_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_details JSONB,
  performed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_audit_log_user ON user_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_log_created ON user_audit_log(created_at DESC);

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log subscription changes
  IF (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status) 
     OR (OLD.account_type IS DISTINCT FROM NEW.account_type) THEN
    INSERT INTO user_audit_log (user_id, action_type, action_details)
    VALUES (
      NEW.id,
      'subscription_change',
      jsonb_build_object(
        'old_status', OLD.subscription_status,
        'new_status', NEW.subscription_status,
        'old_type', OLD.account_type,
        'new_type', NEW.account_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS user_changes_audit_trigger ON users;
CREATE TRIGGER user_changes_audit_trigger
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION log_user_changes();

-- ============================================
-- SECTION 6: REFRESH FUNCTIONS FOR MATERIALIZED VIEWS
-- ============================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY quiz_statistics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY community_activity_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS: DATA RETENTION POLICIES
-- ============================================
-- NOTE: These would typically be implemented as scheduled jobs (cron)
-- 
-- 1. Delete expired sessions older than 30 days:
--    DELETE FROM auth.sessions WHERE created_at < NOW() - INTERVAL '30 days';
--
-- 2. Archive moderation logs older than 90 days:
--    DELETE FROM content_moderation_log WHERE created_at < NOW() - INTERVAL '90 days' AND reviewed = true;
--
-- 3. Archive inactive users (not logged in for 365 days):
--    UPDATE users SET archived = true WHERE last_login < NOW() - INTERVAL '365 days';
--
-- 4. Purge notification logs older than 180 days:
--    -- This would apply to a notifications table when Phase 9 notification system is built