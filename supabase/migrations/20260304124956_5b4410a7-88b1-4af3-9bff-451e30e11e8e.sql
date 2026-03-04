
-- Restore materialized view access for authenticated users (needed for admin analytics)
-- The previous migration was overly aggressive in revoking access
GRANT SELECT ON public.user_performance_summary TO authenticated;
GRANT SELECT ON public.quiz_statistics TO authenticated;
GRANT SELECT ON public.community_activity_summary TO authenticated;
