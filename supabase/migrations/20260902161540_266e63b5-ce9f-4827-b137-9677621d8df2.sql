CREATE TABLE public.study_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.curriculum_chapters(id) ON DELETE CASCADE,
  highlighted_text TEXT NOT NULL,
  note TEXT,
  color TEXT NOT NULL DEFAULT 'yellow',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_highlights_user_chapter ON public.study_highlights(user_id, chapter_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_highlights TO authenticated;
GRANT ALL ON public.study_highlights TO service_role;

ALTER TABLE public.study_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own highlights"
ON public.study_highlights FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_study_highlights_updated_at
BEFORE UPDATE ON public.study_highlights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';