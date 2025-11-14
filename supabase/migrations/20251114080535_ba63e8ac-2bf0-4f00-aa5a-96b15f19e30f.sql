-- Phase 5: Assessment Engine & Evaluation System Database Schema

-- Store quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  quiz_title TEXT NOT NULL,
  quiz_description TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  time_limit_minutes INTEGER,
  passing_score_percentage INTEGER DEFAULT 75,
  total_questions INTEGER NOT NULL,
  question_shuffle BOOLEAN DEFAULT true,
  option_shuffle BOOLEAN DEFAULT true,
  instant_feedback BOOLEAN DEFAULT false,
  created_by TEXT DEFAULT 'ai',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store individual questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'math_problem')),
  question_text TEXT NOT NULL,
  question_number INTEGER NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  reference_section TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('Beginner', 'Intermediate', 'Advanced')),
  points INTEGER DEFAULT 1,
  requires_working BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store student quiz attempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  score_percentage DECIMAL(5,2),
  total_correct INTEGER,
  total_questions INTEGER,
  passed BOOLEAN,
  answers JSONB NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track attempt cooldowns
CREATE TABLE quiz_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL,
  next_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

-- Store performance analytics
CREATE TABLE quiz_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  chapter_id UUID REFERENCES curriculum_chapters(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  average_score DECIMAL(5,2),
  best_score DECIMAL(5,2),
  total_attempts INTEGER DEFAULT 0,
  passed_attempts INTEGER DEFAULT 0,
  weak_topics TEXT[],
  strong_topics TEXT[],
  last_attempt_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

-- Create indexes
CREATE INDEX idx_quizzes_chapter ON quizzes(chapter_id);
CREATE INDEX idx_quizzes_subject ON quizzes(subject_name);
CREATE INDEX idx_quizzes_published ON quizzes(is_published);
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_completed ON quiz_attempts(is_completed);
CREATE INDEX idx_quiz_cooldowns_user_quiz ON quiz_cooldowns(user_id, quiz_id);
CREATE INDEX idx_quiz_performance_user ON quiz_performance(user_id);
CREATE INDEX idx_quiz_performance_subject ON quiz_performance(subject_name);

-- Row Level Security for quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published quizzes" ON quizzes
FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage quizzes" ON quizzes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'educator')
  )
);

-- Row Level Security for quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions from published quizzes" ON quiz_questions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM quizzes 
    WHERE id = quiz_questions.quiz_id 
    AND is_published = true
  )
);

CREATE POLICY "Admins can manage questions" ON quiz_questions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'educator')
  )
);

-- Row Level Security for quiz_attempts
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON quiz_attempts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts" ON quiz_attempts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts" ON quiz_attempts
FOR UPDATE USING (auth.uid() = user_id);

-- Row Level Security for quiz_cooldowns
ALTER TABLE quiz_cooldowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cooldowns" ON quiz_cooldowns
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage cooldowns" ON quiz_cooldowns
FOR ALL USING (true);

-- Row Level Security for quiz_performance
ALTER TABLE quiz_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance" ON quiz_performance
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update performance" ON quiz_performance
FOR ALL USING (auth.uid() = user_id);

-- Update user_chapter_progress table with quiz fields
ALTER TABLE user_chapter_progress 
ADD COLUMN IF NOT EXISTS quiz_passed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiz_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS quiz_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_attempt TIMESTAMP WITH TIME ZONE;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON quizzes
FOR EACH ROW
EXECUTE FUNCTION update_quiz_updated_at();

CREATE TRIGGER update_quiz_performance_updated_at
BEFORE UPDATE ON quiz_performance
FOR EACH ROW
EXECUTE FUNCTION update_quiz_updated_at();