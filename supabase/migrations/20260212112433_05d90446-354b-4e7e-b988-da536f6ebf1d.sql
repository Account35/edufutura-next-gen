
-- Drop existing restrictive policies on account_lockouts
DROP POLICY IF EXISTS "Users can view their own lockout status" ON public.account_lockouts;
DROP POLICY IF EXISTS "System can manage lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Anyone can check account lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Anyone can create account lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Anyone can update account lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Authenticated users can clear lockouts" ON public.account_lockouts;

-- Drop existing restrictive policies on failed_login_attempts
DROP POLICY IF EXISTS "Users can view their own failed attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "System can track failed logins" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Anyone can insert failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Anyone can view failed login attempts" ON public.failed_login_attempts;
DROP POLICY IF EXISTS "Authenticated users can clear failed attempts" ON public.failed_login_attempts;

-- account_lockouts: allow anon + authenticated to SELECT, INSERT, UPDATE (needed during login)
CREATE POLICY "anon_auth_select_lockouts" ON public.account_lockouts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_auth_insert_lockouts" ON public.account_lockouts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_auth_update_lockouts" ON public.account_lockouts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_auth_delete_lockouts" ON public.account_lockouts FOR DELETE TO anon, authenticated USING (true);

-- failed_login_attempts: allow anon + authenticated to SELECT, INSERT, DELETE
CREATE POLICY "anon_auth_select_failed_attempts" ON public.failed_login_attempts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_auth_insert_failed_attempts" ON public.failed_login_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_auth_delete_failed_attempts" ON public.failed_login_attempts FOR DELETE TO anon, authenticated USING (true);
