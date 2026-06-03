-- Fix achievements RLS: allow authenticated users to insert their own badges
DROP POLICY IF EXISTS "System can insert achievements" ON public.achievements;

CREATE POLICY "Users can insert own achievements"
  ON public.achievements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
