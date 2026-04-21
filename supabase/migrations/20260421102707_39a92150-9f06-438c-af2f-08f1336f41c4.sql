
-- Allow admins and educators to manage curriculum subjects
CREATE POLICY "Admins and educators can view all subjects"
  ON public.curriculum_subjects FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));

CREATE POLICY "Admins and educators can insert subjects"
  ON public.curriculum_subjects FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));

CREATE POLICY "Admins and educators can update subjects"
  ON public.curriculum_subjects FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));

CREATE POLICY "Admins can delete subjects"
  ON public.curriculum_subjects FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins and educators to manage curriculum chapters (including drafts)
CREATE POLICY "Admins and educators can view all chapters"
  ON public.curriculum_chapters FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));

CREATE POLICY "Admins and educators can insert chapters"
  ON public.curriculum_chapters FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));

CREATE POLICY "Admins and educators can update chapters"
  ON public.curriculum_chapters FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'));

CREATE POLICY "Admins can delete chapters"
  ON public.curriculum_chapters FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
