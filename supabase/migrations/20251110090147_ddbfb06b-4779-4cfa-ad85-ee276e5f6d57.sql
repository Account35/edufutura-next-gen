
-- Create storage buckets for curriculum content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('curriculum-pdfs', 'curriculum-pdfs', true, 26214400, ARRAY['application/pdf']),
  ('curriculum-images', 'curriculum-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies: Public read, admin/educator write
CREATE POLICY "Public can view curriculum PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'curriculum-pdfs');

CREATE POLICY "Public can view curriculum images"
ON storage.objects FOR SELECT
USING (bucket_id = 'curriculum-images');

CREATE POLICY "Admins and educators can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'curriculum-pdfs'
  AND auth.role() = 'authenticated'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'educator'::app_role)
  )
);

CREATE POLICY "Admins and educators can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'curriculum-images'
  AND auth.role() = 'authenticated'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'educator'::app_role)
  )
);

CREATE POLICY "Admins and educators can update PDFs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'curriculum-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'educator'::app_role)
  )
);

CREATE POLICY "Admins and educators can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'curriculum-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'educator'::app_role)
  )
);

CREATE POLICY "Admins and educators can delete PDFs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'curriculum-pdfs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'educator'::app_role)
  )
);

CREATE POLICY "Admins and educators can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'curriculum-images'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'educator'::app_role)
  )
);

-- Add reading preferences to study_preferences table
ALTER TABLE public.study_preferences
ADD COLUMN IF NOT EXISTS reading_font_size text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS dark_mode_enabled boolean DEFAULT false;

-- Add content management fields to curriculum_chapters
ALTER TABLE public.curriculum_chapters
ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'rich_text',
ADD COLUMN IF NOT EXISTS content_url text,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS key_concepts text[],
ADD COLUMN IF NOT EXISTS glossary_terms jsonb DEFAULT '{}';

-- Create AI conversation tables for Phase 4 preparation
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name text,
  chapter_id uuid REFERENCES public.curriculum_chapters(id),
  started_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  message_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  message_text text NOT NULL,
  tokens_used integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.ai_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback_text text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on AI tables
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for AI conversations
CREATE POLICY "Users can view own conversations"
ON public.ai_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
ON public.ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.ai_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for AI messages
CREATE POLICY "Users can view own messages"
ON public.ai_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = ai_messages.conversation_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own messages"
ON public.ai_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_conversations
    WHERE id = ai_messages.conversation_id
    AND user_id = auth.uid()
  )
);

-- RLS policies for AI feedback
CREATE POLICY "Users can view own feedback"
ON public.ai_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
ON public.ai_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback"
ON public.ai_feedback FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_chapter_id ON public.ai_conversations(chapter_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message_id ON public.ai_feedback(message_id);
