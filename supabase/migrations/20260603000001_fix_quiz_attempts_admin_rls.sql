-- Allow admins to read all quiz_attempts for statistics
CREATE POLICY "Admins can view all attempts"
  ON public.quiz_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'educator')
    )
  );
