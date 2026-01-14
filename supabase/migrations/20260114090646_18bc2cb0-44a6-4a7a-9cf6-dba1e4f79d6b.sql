-- Allow admins to view all user profiles for the admin users page
-- RLS is already enabled on public.users

DO $$
BEGIN
  -- Create policy only if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can view all users'
  ) THEN
    CREATE POLICY "Admins can view all users"
      ON public.users
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;