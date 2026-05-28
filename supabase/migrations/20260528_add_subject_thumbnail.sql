-- Add thumbnail_url column to curriculum_subjects if it doesn't exist
ALTER TABLE curriculum_subjects
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN curriculum_subjects.thumbnail_url IS 'Placeholder image URL for the subject displayed on student dashboard';
