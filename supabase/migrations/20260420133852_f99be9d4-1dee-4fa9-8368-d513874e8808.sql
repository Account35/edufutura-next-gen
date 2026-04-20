-- Create private bucket for curriculum import staging files
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculum-imports', 'curriculum-imports', false)
ON CONFLICT (id) DO NOTHING;

-- Admins/educators can upload
CREATE POLICY "Admins/educators can upload curriculum imports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'curriculum-imports'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'))
);

-- Admins/educators can read
CREATE POLICY "Admins/educators can read curriculum imports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'curriculum-imports'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'))
);

-- Admins/educators can delete
CREATE POLICY "Admins/educators can delete curriculum imports"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'curriculum-imports'
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'educator'))
);