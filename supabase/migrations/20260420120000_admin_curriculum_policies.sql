DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_subjects'
      AND policyname = 'Admins and educators can manage curriculum subjects'
  ) THEN
    CREATE POLICY "Admins and educators can manage curriculum subjects"
    ON public.curriculum_subjects
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'educator')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'educator')
      )
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'curriculum_chapters'
      AND policyname = 'Admins and educators can manage curriculum chapters'
  ) THEN
    CREATE POLICY "Admins and educators can manage curriculum chapters"
    ON public.curriculum_chapters
    FOR ALL
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'educator')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'educator')
      )
    );
  END IF;
END
$$;
