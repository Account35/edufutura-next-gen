
-- 1) Remove materialized views from PostgREST API exposure
REVOKE ALL ON public.user_performance_summary FROM anon, authenticated;
REVOKE ALL ON public.quiz_statistics FROM anon, authenticated;
REVOKE ALL ON public.community_activity_summary FROM anon, authenticated;

-- 2) Replace permissive "System can ..." policies with service_role-only equivalents
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE 'System can %'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Recreate as service_role-only ALL policies (backend writes via service key)
CREATE POLICY "Service role manages cooldowns" ON public.quiz_cooldowns
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages reputation" ON public.user_reputation
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role inserts moderation logs" ON public.content_moderation_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts reputation changes" ON public.reputation_changes
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts grading logs" ON public.grading_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role manages background jobs" ON public.background_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role logs api calls" ON public.api_call_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role logs user actions" ON public.user_actions
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role logs performance" ON public.performance_metrics
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role logs hourly active users" ON public.hourly_active_users
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role logs daily content metrics" ON public.daily_content_metrics
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts failed responses" ON public.failed_ai_responses
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role manages cache" ON public.ai_response_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages cache metrics" ON public.ai_cache_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages predictions" ON public.performance_predictions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages risk scores" ON public.dropout_risk_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages trends" ON public.performance_trends
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages benchmarks" ON public.peer_benchmarks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages rankings" ON public.user_percentile_rankings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages recommendations" ON public.recommendations_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages content features" ON public.content_features
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages similarity scores" ON public.item_similarity_scores
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role inserts notification analytics" ON public.notification_analytics
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts audit logs" ON public.admin_audit_log
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role creates access notifications" ON public.user_access_notifications
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts ab assignments" ON public.ab_test_assignments
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role inserts ab conversions" ON public.ab_test_conversions
  FOR INSERT TO service_role WITH CHECK (true);

-- 3) Tighten lockout/failed-attempt policies that previously allowed anyone to update/delete
DROP POLICY IF EXISTS "anon_auth_update_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "anon_auth_delete_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "anon_auth_delete_failed_attempts" ON public.failed_login_attempts;

CREATE POLICY "Service role updates lockouts" ON public.account_lockouts
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role deletes lockouts" ON public.account_lockouts
  FOR DELETE TO service_role USING (true);
CREATE POLICY "Service role deletes failed attempts" ON public.failed_login_attempts
  FOR DELETE TO service_role USING (true);
