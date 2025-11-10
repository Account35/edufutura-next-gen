-- Add is_required flag to chapter_prerequisites table
ALTER TABLE public.chapter_prerequisites
ADD COLUMN is_required BOOLEAN NOT NULL DEFAULT true;

-- Add index for better query performance
CREATE INDEX idx_chapter_prerequisites_chapter_id ON public.chapter_prerequisites(chapter_id);
CREATE INDEX idx_chapter_prerequisites_prerequisite_id ON public.chapter_prerequisites(prerequisite_chapter_id);

COMMENT ON COLUMN public.chapter_prerequisites.is_required IS 'If true, prerequisite must be completed before accessing chapter. If false, it is only a recommendation.';