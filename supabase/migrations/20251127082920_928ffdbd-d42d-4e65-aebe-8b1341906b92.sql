-- Create reputation_changes table for activity timeline
CREATE TABLE IF NOT EXISTS public.reputation_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  points_change INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_changes_user_id ON public.reputation_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_changes_created_at ON public.reputation_changes(created_at DESC);

-- Enable RLS
ALTER TABLE public.reputation_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reputation changes"
  ON public.reputation_changes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert reputation changes"
  ON public.reputation_changes FOR INSERT
  WITH CHECK (true);

-- Function to calculate reputation level
CREATE OR REPLACE FUNCTION calculate_reputation_level(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score >= 1000 THEN
    RETURN 'Leader';
  ELSIF score >= 500 THEN
    RETURN 'Trusted';
  ELSIF score >= 100 THEN
    RETURN 'Contributor';
  ELSE
    RETURN 'Newcomer';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation(
  p_user_id UUID,
  p_change_type TEXT,
  p_points_change INTEGER,
  p_description TEXT
)
RETURNS VOID AS $$
DECLARE
  v_new_score INTEGER;
  v_new_level TEXT;
BEGIN
  -- Insert or update reputation record
  INSERT INTO public.user_reputation (user_id, reputation_score, updated_at)
  VALUES (p_user_id, GREATEST(0, p_points_change), now())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    reputation_score = GREATEST(0, public.user_reputation.reputation_score + p_points_change),
    updated_at = now()
  RETURNING reputation_score INTO v_new_score;

  -- Calculate new level
  v_new_level := calculate_reputation_level(v_new_score);

  -- Update level
  UPDATE public.user_reputation
  SET current_level = v_new_level
  WHERE user_id = p_user_id;

  -- Log the change
  INSERT INTO public.reputation_changes (user_id, change_type, points_change, description)
  VALUES (p_user_id, p_change_type, p_points_change, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for reply upvotes (helpful posts)
CREATE OR REPLACE FUNCTION check_helpful_post_reputation()
RETURNS TRIGGER AS $$
DECLARE
  v_upvote_count INTEGER;
  v_already_rewarded BOOLEAN;
BEGIN
  -- Count current upvotes for this reply
  SELECT COUNT(*) INTO v_upvote_count
  FROM public.reply_upvotes
  WHERE reply_id = NEW.reply_id;

  -- Check if we've already rewarded this reply
  SELECT EXISTS(
    SELECT 1 FROM public.reputation_changes
    WHERE user_id = (SELECT user_id FROM public.post_replies WHERE id = NEW.reply_id)
    AND change_type = 'helpful_post'
    AND description LIKE '%' || NEW.reply_id || '%'
  ) INTO v_already_rewarded;

  -- Award points when crossing threshold of 5 upvotes (only once)
  IF v_upvote_count = 5 AND NOT v_already_rewarded THEN
    PERFORM update_user_reputation(
      (SELECT user_id FROM public.post_replies WHERE id = NEW.reply_id),
      'helpful_post',
      10,
      'Reply received 5+ upvotes (Reply ID: ' || NEW.reply_id || ')'
    );

    -- Increment helpful_posts counter
    UPDATE public.user_reputation
    SET helpful_posts = helpful_posts + 1
    WHERE user_id = (SELECT user_id FROM public.post_replies WHERE id = NEW.reply_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS reply_upvote_reputation_trigger ON public.reply_upvotes;
CREATE TRIGGER reply_upvote_reputation_trigger
AFTER INSERT ON public.reply_upvotes
FOR EACH ROW
EXECUTE FUNCTION check_helpful_post_reputation();

-- Trigger function for quality resources
CREATE OR REPLACE FUNCTION check_quality_resource_reputation()
RETURNS TRIGGER AS $$
DECLARE
  v_already_rewarded BOOLEAN;
BEGIN
  -- Check if rating average crosses 4.0 threshold
  IF NEW.rating_average >= 4.0 AND (OLD.rating_average IS NULL OR OLD.rating_average < 4.0) THEN
    -- Check if already rewarded
    SELECT EXISTS(
      SELECT 1 FROM public.reputation_changes
      WHERE user_id = NEW.user_id
      AND change_type = 'quality_resource'
      AND description LIKE '%' || NEW.id || '%'
    ) INTO v_already_rewarded;

    IF NOT v_already_rewarded THEN
      PERFORM update_user_reputation(
        NEW.user_id,
        'quality_resource',
        25,
        'Resource achieved 4.0+ rating (Resource: ' || NEW.resource_title || ')'
      );

      -- Increment quality_resources counter
      UPDATE public.user_reputation
      SET quality_resources = quality_resources + 1
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS quality_resource_reputation_trigger ON public.shared_resources;
CREATE TRIGGER quality_resource_reputation_trigger
AFTER UPDATE ON public.shared_resources
FOR EACH ROW
EXECUTE FUNCTION check_quality_resource_reputation();

-- Trigger function for positive ratings
CREATE OR REPLACE FUNCTION add_positive_rating_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points for ratings of 4-5 stars
  IF NEW.rating >= 4 THEN
    PERFORM update_user_reputation(
      (SELECT user_id FROM public.shared_resources WHERE id = NEW.resource_id),
      'positive_rating',
      5,
      'Received ' || NEW.rating || '-star rating'
    );

    -- Increment positive_ratings counter
    UPDATE public.user_reputation
    SET positive_ratings = positive_ratings + 1
    WHERE user_id = (SELECT user_id FROM public.shared_resources WHERE id = NEW.resource_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS positive_rating_reputation_trigger ON public.resource_ratings;
CREATE TRIGGER positive_rating_reputation_trigger
AFTER INSERT ON public.resource_ratings
FOR EACH ROW
EXECUTE FUNCTION add_positive_rating_reputation();

-- Trigger function for solution marking
CREATE OR REPLACE FUNCTION add_solution_marked_reputation()
RETURNS TRIGGER AS $$
BEGIN
  -- Award points when reply is marked as solution
  IF NEW.is_solution = true AND (OLD.is_solution IS NULL OR OLD.is_solution = false) THEN
    PERFORM update_user_reputation(
      NEW.user_id,
      'solution_marked',
      15,
      'Reply marked as solution'
    );

    -- Increment solutions_marked counter
    UPDATE public.user_reputation
    SET solutions_marked = solutions_marked + 1
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS solution_marked_reputation_trigger ON public.post_replies;
CREATE TRIGGER solution_marked_reputation_trigger
AFTER UPDATE ON public.post_replies
FOR EACH ROW
EXECUTE FUNCTION add_solution_marked_reputation();

-- Trigger function for warnings (penalty)
CREATE OR REPLACE FUNCTION subtract_warning_reputation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_user_reputation(
    NEW.user_id,
    'warning_received',
    -50,
    'Moderation warning: ' || NEW.warning_reason
  );

  -- Increment warnings_received counter
  UPDATE public.user_reputation
  SET warnings_received = warnings_received + 1
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS warning_reputation_trigger ON public.user_warnings;
CREATE TRIGGER warning_reputation_trigger
AFTER INSERT ON public.user_warnings
FOR EACH ROW
EXECUTE FUNCTION subtract_warning_reputation();