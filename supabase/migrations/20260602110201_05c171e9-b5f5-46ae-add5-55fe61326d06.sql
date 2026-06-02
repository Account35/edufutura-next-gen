
-- 1. voice_usage_log table
CREATE TABLE public.voice_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_usage_log_user_created ON public.voice_usage_log(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.voice_usage_log TO authenticated;
GRANT ALL ON public.voice_usage_log TO service_role;

ALTER TABLE public.voice_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own voice usage"
  ON public.voice_usage_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own voice usage"
  ON public.voice_usage_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all voice usage"
  ON public.voice_usage_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Certificates storage bucket policies
-- Files stored as: {user_id}/{verification_code}.html
CREATE POLICY "Users can view their own certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service role manages certificates"
  ON storage.objects FOR ALL
  TO service_role
  USING (bucket_id = 'certificates')
  WITH CHECK (bucket_id = 'certificates');
