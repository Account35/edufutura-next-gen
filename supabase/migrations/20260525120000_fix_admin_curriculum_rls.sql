-- Allow admin curriculum screens to see and manage draft content.
-- Student-facing reads remain limited by the existing published-only policies.

CREATE POLICY "Admins and educators can view all subjects"
ON public.curriculum_subjects
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can create subjects"
ON public.curriculum_subjects
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can update subjects"
ON public.curriculum_subjects
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can delete subjects"
ON public.curriculum_subjects
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can view all chapters"
ON public.curriculum_chapters
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can create chapters"
ON public.curriculum_chapters
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can update chapters"
ON public.curriculum_chapters
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);

CREATE POLICY "Admins and educators can delete chapters"
ON public.curriculum_chapters
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'educator'::public.app_role)
);
