ALTER TABLE public.curriculum_chapters ADD COLUMN IF NOT EXISTS video_url TEXT;
NOTIFY pgrst, 'reload schema';