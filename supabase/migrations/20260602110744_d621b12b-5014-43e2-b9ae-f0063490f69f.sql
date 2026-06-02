
-- ============================================================
-- 1. account_lockouts and failed_login_attempts: lock down RLS
-- ============================================================
DROP POLICY IF EXISTS "anon_auth_select_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "anon_auth_insert_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "anon_auth_select_failed_attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "anon_auth_insert_failed_attempts" ON public.failed_login_attempts;

-- Revoke direct table access from anon/authenticated; force RPC usage
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.account_lockouts FROM anon, authenticated;
REVOKE INSERT, SELECT, UPDATE, DELETE ON public.failed_login_attempts FROM anon, authenticated;
GRANT ALL ON public.account_lockouts TO service_role;
GRANT ALL ON public.failed_login_attempts TO service_role;

-- (Existing "Admins can view ..." SELECT policies remain in place for admin reads)

-- ============================================================
-- 2. Restrict ai_prompt_templates and email_templates to admins
-- ============================================================
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.ai_prompt_templates;
DROP POLICY IF EXISTS "Anyone can read active templates" ON public.email_templates;

CREATE POLICY "Admins can read prompt templates"
  ON public.ai_prompt_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read email templates"
  ON public.email_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

REVOKE SELECT ON public.ai_prompt_templates FROM anon;
REVOKE SELECT ON public.email_templates FROM anon;

-- ============================================================
-- 3. role_permissions: signed-in users only (not anon)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.role_permissions;

CREATE POLICY "Authenticated users can view permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.role_permissions FROM anon;

-- ============================================================
-- 4. SECURITY DEFINER helpers for the login flow
-- ============================================================

-- Record a failed login attempt and lock the account after 5 failures in 1 hour.
-- Callable by anon (pre-login) and authenticated users.
CREATE OR REPLACE FUNCTION public.record_failed_login(
  p_email TEXT,
  p_failure_reason TEXT DEFAULT 'invalid_credentials',
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_count INTEGER;
  v_max INTEGER := 5;
  v_unlock_at TIMESTAMPTZ;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' OR length(v_email) > 320 THEN
    RETURN jsonb_build_object('is_locked', false, 'remaining_attempts', v_max);
  END IF;

  INSERT INTO public.failed_login_attempts (email, failure_reason, user_agent, attempted_at)
  VALUES (v_email, COALESCE(p_failure_reason, 'invalid_credentials'), p_user_agent, now());

  SELECT count(*) INTO v_count
  FROM public.failed_login_attempts
  WHERE email = v_email
    AND attempted_at >= now() - interval '1 hour';

  IF v_count >= v_max THEN
    v_unlock_at := now() + interval '1 hour';
    INSERT INTO public.account_lockouts (email, locked_at, unlock_at, failure_count)
    VALUES (v_email, now(), v_unlock_at, v_count)
    ON CONFLICT (email) DO UPDATE
      SET locked_at = EXCLUDED.locked_at,
          unlock_at = EXCLUDED.unlock_at,
          failure_count = EXCLUDED.failure_count;

    RETURN jsonb_build_object(
      'is_locked', true,
      'remaining_attempts', 0,
      'unlock_at', v_unlock_at
    );
  END IF;

  RETURN jsonb_build_object(
    'is_locked', false,
    'remaining_attempts', GREATEST(0, v_max - v_count)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_failed_login(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_failed_login(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Check whether an email is currently locked out. Returns only a boolean + unlock time.
CREATE OR REPLACE FUNCTION public.check_account_locked(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_unlock_at TIMESTAMPTZ;
BEGIN
  v_email := lower(trim(p_email));
  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('is_locked', false);
  END IF;

  SELECT unlock_at INTO v_unlock_at
  FROM public.account_lockouts
  WHERE email = v_email;

  IF v_unlock_at IS NULL OR v_unlock_at <= now() THEN
    -- Expired lockout: clean it up
    IF v_unlock_at IS NOT NULL THEN
      DELETE FROM public.account_lockouts WHERE email = v_email;
    END IF;
    RETURN jsonb_build_object('is_locked', false);
  END IF;

  RETURN jsonb_build_object('is_locked', true, 'unlock_at', v_unlock_at);
END;
$$;

REVOKE ALL ON FUNCTION public.check_account_locked(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_account_locked(TEXT) TO anon, authenticated;

-- Authenticated user clears their own failed attempts (after a successful login).
-- Uses auth.email() so a caller cannot clear someone else's history.
CREATE OR REPLACE FUNCTION public.clear_my_failed_attempts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := lower(coalesce(auth.email(), ''));
  IF v_email = '' THEN
    RETURN;
  END IF;
  DELETE FROM public.failed_login_attempts WHERE email = v_email;
  DELETE FROM public.account_lockouts WHERE email = v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_my_failed_attempts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clear_my_failed_attempts() TO authenticated;

NOTIFY pgrst, 'reload schema';
