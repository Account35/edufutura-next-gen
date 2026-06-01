ALTER TABLE public.curriculum_subjects
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

NOTIFY pgrst, 'reload schema';