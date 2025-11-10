-- Create curriculum_subjects table
CREATE TABLE curriculum_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_name TEXT NOT NULL UNIQUE,
  subject_code TEXT,
  grade_level INTEGER NOT NULL,
  description TEXT,
  learning_objectives TEXT[],
  total_chapters INTEGER DEFAULT 0,
  estimated_hours NUMERIC,
  icon_name TEXT,
  color_scheme TEXT,
  caps_aligned BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create curriculum_chapters table
CREATE TABLE curriculum_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  chapter_description TEXT,
  content_markdown TEXT,
  thumbnail_url TEXT,
  estimated_duration_minutes INTEGER,
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  caps_code TEXT,
  caps_description TEXT,
  learning_outcomes TEXT[],
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, chapter_number)
);

-- Create curriculum_topics table
CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  topic_number INTEGER NOT NULL,
  topic_title TEXT NOT NULL,
  content_markdown TEXT,
  examples JSONB,
  practice_questions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create chapter_prerequisites table
CREATE TABLE chapter_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  prerequisite_chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chapter_id, prerequisite_chapter_id)
);

-- Create user_chapter_progress table
CREATE TABLE user_chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
  progress_percentage NUMERIC DEFAULT 0,
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

-- Create bookmarks table
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

-- Create search_history table
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for curriculum_subjects
CREATE POLICY "Anyone can view published subjects"
ON curriculum_subjects FOR SELECT
TO authenticated USING (is_published = true);

-- RLS Policies for curriculum_chapters
CREATE POLICY "Anyone can view published chapters"
ON curriculum_chapters FOR SELECT
TO authenticated USING (is_published = true);

-- RLS Policies for curriculum_topics
CREATE POLICY "Anyone can view topics"
ON curriculum_topics FOR SELECT
TO authenticated USING (true);

-- RLS Policies for chapter_prerequisites
CREATE POLICY "Anyone can view prerequisites"
ON chapter_prerequisites FOR SELECT
TO authenticated USING (true);

-- RLS Policies for user_chapter_progress
CREATE POLICY "Users can view own chapter progress"
ON user_chapter_progress FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chapter progress"
ON user_chapter_progress FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chapter progress"
ON user_chapter_progress FOR UPDATE
TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for bookmarks
CREATE POLICY "Users can view own bookmarks"
ON bookmarks FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
ON bookmarks FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks"
ON bookmarks FOR UPDATE
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
ON bookmarks FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for search_history
CREATE POLICY "Users can view own search history"
ON search_history FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
ON search_history FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance (only for new tables)
CREATE INDEX idx_chapters_subject ON curriculum_chapters(subject_id);
CREATE INDEX idx_topics_chapter ON curriculum_topics(chapter_id);
CREATE INDEX idx_prerequisites_chapter ON chapter_prerequisites(chapter_id);
CREATE INDEX idx_user_chapter_progress_user ON user_chapter_progress(user_id);
CREATE INDEX idx_user_chapter_progress_chapter ON user_chapter_progress(chapter_id);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_search_history_user ON search_history(user_id);

-- Apply updated_at triggers
CREATE TRIGGER update_curriculum_subjects_updated_at
BEFORE UPDATE ON curriculum_subjects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_curriculum_chapters_updated_at
BEFORE UPDATE ON curriculum_chapters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_chapter_progress_updated_at
BEFORE UPDATE ON user_chapter_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at
BEFORE UPDATE ON bookmarks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();