-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public) 
VALUES ('profile-pictures', 'profile-pictures', true);

-- Storage policies for profile pictures
CREATE POLICY "Users can view any profile picture"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add onboarding_completed_at field to users table
ALTER TABLE public.users 
ADD COLUMN onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Add platform_language field for future i18n
ALTER TABLE public.users 
ADD COLUMN platform_language TEXT DEFAULT 'en' CHECK (platform_language IN ('en', 'af'));

-- Add communication preferences
ALTER TABLE public.users 
ADD COLUMN comm_study_tips BOOLEAN DEFAULT true,
ADD COLUMN comm_content_updates BOOLEAN DEFAULT true,
ADD COLUMN comm_assessment_reminders BOOLEAN DEFAULT true,
ADD COLUMN comm_progress_reports BOOLEAN DEFAULT true;

-- Add parent/guardian email for minors
ALTER TABLE public.users 
ADD COLUMN guardian_email TEXT;