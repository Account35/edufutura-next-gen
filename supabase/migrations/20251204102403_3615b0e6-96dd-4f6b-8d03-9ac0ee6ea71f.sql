-- Phase 10: AI Prompt Templates and Intelligence Layer

-- Create ai_prompt_templates table for centralized prompt management
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_version INTEGER NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  system_context TEXT,
  model_name TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1000,
  response_format TEXT,
  created_by UUID REFERENCES auth.users(id),
  performance_metrics JSONB DEFAULT '{"success_rate": 0, "average_user_rating": 0, "cost_per_use": 0, "total_uses": 0}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(template_name, template_version)
);

-- Create failed_ai_responses table for tracking failures and optimization
CREATE TABLE IF NOT EXISTS public.failed_ai_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  template_version INTEGER,
  model_name TEXT,
  input_data JSONB NOT NULL,
  ai_response TEXT,
  failure_reason TEXT NOT NULL,
  human_corrected_response TEXT,
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ai_template_changelog for tracking template iterations
CREATE TABLE IF NOT EXISTS public.ai_template_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  changes_made TEXT NOT NULL,
  reason_for_change TEXT NOT NULL,
  expected_improvement TEXT,
  actual_improvement TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ai_ab_tests for A/B testing prompt versions
CREATE TABLE IF NOT EXISTS public.ai_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  version_a INTEGER NOT NULL,
  version_b INTEGER NOT NULL,
  rollout_percentage INTEGER NOT NULL DEFAULT 50,
  metrics_version_a JSONB DEFAULT '{}'::jsonb,
  metrics_version_b JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  winner_version INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.failed_ai_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_template_changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_ab_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_prompt_templates
CREATE POLICY "Anyone can read active templates" ON public.ai_prompt_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON public.ai_prompt_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for failed_ai_responses  
CREATE POLICY "Admins can view failed responses" ON public.failed_ai_responses
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert failed responses" ON public.failed_ai_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update failed responses" ON public.failed_ai_responses
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ai_template_changelog
CREATE POLICY "Anyone can view changelog" ON public.ai_template_changelog
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert changelog" ON public.ai_template_changelog
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ai_ab_tests
CREATE POLICY "Admins can manage AB tests" ON public.ai_ab_tests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_templates_name ON public.ai_prompt_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_ai_templates_active ON public.ai_prompt_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_failed_responses_template ON public.failed_ai_responses(template_name);
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON public.ai_ab_tests(is_active);

-- Insert default prompt templates

-- Mathematics Quiz Generation Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'quiz_generation_mathematics',
  1,
  'You are an expert South African CAPS curriculum mathematics educator creating Grade {grade_level} assessment questions for {chapter_title}. Generate {question_count} questions testing understanding of: {key_concepts}. Question types: {question_type_distribution}. Difficulty: {difficulty_level}. Requirements: 1) Align exactly with CAPS curriculum objectives, 2) Use South African contexts in word problems (rands, provinces, local scenarios), 3) Progress from basic recall to application to analysis following Bloom''s taxonomy, 4) Ensure all calculations have clean integer or simple fraction answers suitable for mental math or basic calculator, 5) Include step-by-step solutions showing mathematical reasoning, 6) Avoid culturally biased content, 7) Use correct mathematical notation and terminology. Return JSON array with fields: question_text, question_type, options array for multiple choice with 4 choices, correct_answer, detailed_explanation showing solution steps, difficulty_level, blooms_level, caps_alignment.',
  'You are an expert South African CAPS curriculum mathematics educator. Always respond with valid JSON. Focus on Grade 8-12 mathematics including algebra, geometry, trigonometry, calculus, and statistics aligned with CAPS standards.',
  'gpt-4o-mini',
  0.8,
  4000,
  'json_array',
  true
);

-- Life Sciences Quiz Generation Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'quiz_generation_life_sciences',
  1,
  'You are a South African CAPS Life Sciences educator creating Grade {grade_level} questions for {chapter_title} covering {key_concepts}. Generate {question_count} questions. Context requirements: 1) Use South African examples - local biomes (fynbos, savanna, grassland), endemic species (proteas, penguins, big five), local health issues (HIV/AIDS, TB, malnutrition), 2) Include diagrams descriptions where visual understanding tested, 3) Apply scientific method and inquiry skills, 4) Connect to real-world applications and careers, 5) Address common misconceptions explicitly in explanations. Question types: multiple choice testing conceptual understanding, true/false with justification preventing guessing, short answer requiring explanations, diagram labeling with descriptions. Return structured JSON with question data including diagram_description for visual questions, misconception_addressed noting common errors students make, real_world_connection showing practical application, scientific_vocabulary highlighting key terms.',
  'You are an expert South African CAPS Life Sciences educator. Always respond with valid JSON. Focus on biology, biodiversity, human physiology, genetics, evolution, and ecology with South African context.',
  'gpt-4o-mini',
  0.7,
  4000,
  'json_array',
  true
);

-- English Language Quiz Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'quiz_generation_english',
  1,
  'You are a South African CAPS English Home Language educator for Grade {grade_level} assessing {chapter_title} focusing on {key_concepts}. Generate {question_count} questions. Cultural context: 1) Acknowledge multilingual learners with explanations considering English as additional language, 2) Use South African literature examples when relevant (Nadine Gordimer, J.M. Coetzee, Zakes Mda), 3) Include local English varieties recognizing South African English conventions, 4) Address language structures clearly with grammatical terminology, 5) Test comprehension, analysis, and language use. Question types: comprehension passages with questions testing literal and inferential understanding, language usage testing grammar and vocabulary in context, creative writing prompts evaluating expression, poetry analysis using South African poets. Format questions with passage texts clearly separated, multiple sub-questions where appropriate, rubrics for open-ended responses. Return JSON including passage_text for comprehension questions, rubric_criteria array for subjective questions, language_focus identifying specific language skills assessed.',
  'You are an expert South African CAPS English educator. Always respond with valid JSON. Focus on reading comprehension, grammar, vocabulary, literature analysis, and creative writing skills.',
  'gpt-4o-mini',
  0.6,
  4000,
  'json_array',
  true
);

-- Physical Sciences Quiz Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'quiz_generation_physical_sciences',
  1,
  'You are a South African CAPS Physical Sciences educator creating Grade {grade_level} questions for {chapter_title} covering {key_concepts}. Generate {question_count} questions. Requirements: 1) Include both Physics and Chemistry concepts as per CAPS, 2) Use South African contexts (mining, energy, manufacturing), 3) Provide formula references where needed, 4) Include worked examples in explanations, 5) Test conceptual understanding and mathematical application, 6) Reference SI units throughout. Question types: calculations with working shown, conceptual multiple choice, practical investigation scenarios, data analysis from tables/graphs. Return JSON with fields: question_text, question_type, options, correct_answer, formula_used, worked_solution, units_required, difficulty_level.',
  'You are an expert South African CAPS Physical Sciences educator covering Physics and Chemistry. Always respond with valid JSON. Focus on mechanics, waves, electricity, matter, chemical reactions, and stoichiometry.',
  'gpt-4o-mini',
  0.7,
  4000,
  'json_array',
  true
);

-- Short Answer Grading Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'grading_short_answer',
  1,
  'You are grading a South African CAPS curriculum assessment for Grade {grade_level} {subject_name}. Question: {question_text}. Correct Answer/Marking Rubric: {correct_answer_rubric}. Student Answer: {student_answer}. Instructions: 1) Evaluate correctness comparing student response to rubric criteria, 2) Award partial credit for partially correct responses showing understanding, 3) Identify demonstrated understanding listing concepts student grasped, 4) Note missing concepts explaining what student didn''t address, 5) Provide constructive feedback encouraging improvement with specific guidance, 6) Consider South African English variations accepting valid local expressions, 7) Award points from 0 to {max_points} following rubric strictly, 8) Determine pass/fail if student earned 50% or more marks. Return JSON with exact_score number, score_percentage calculated, is_correct boolean based on passing threshold, concepts_demonstrated array of strings, concepts_missing array of strings, detailed_feedback string with encouraging tone, grading_confidence 0-1 indicating certainty where ambiguous responses get lower confidence flagging for human review.',
  'You are an expert educator providing fair and consistent grading for South African CAPS curriculum assessments. Always respond with valid JSON. Be encouraging while maintaining academic standards.',
  'gpt-4o-mini',
  0.2,
  800,
  'json_object',
  true
);

-- Content Moderation Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'content_moderation_community',
  1,
  'You are a content moderator for EduFutura, an educational platform serving South African high school students aged 11-18. Content Type: {content_type}. Content: ''{content_text}''. Context: {context_metadata}. Moderation Criteria: 1) Profanity and inappropriate language - flag explicit language while allowing age-appropriate colloquial South African terms, 2) Personal information - detect emails, phone numbers, physical addresses, full surnames protecting privacy, 3) Bullying, harassment, threats - identify targeting, name-calling, intimidation, 4) Academic dishonesty - detect homework selling, test answer sharing, plagiarism, 5) Sexual content - flag all sexual references inappropriate for school platform, 6) Violence or self-harm - detect concerning references requiring intervention, 7) Spam or promotional content - identify advertising, repetitive posting, 8) Hate speech or discrimination - flag content targeting race, ethnicity, gender, religion, 9) Misinformation - catch false educational information, conspiracy theories. Consider: Content intent distinguishing genuine questions from problematic content, Age appropriateness for high school context, Cultural sensitivity to South African diversity. Return JSON with approved boolean, issues_found array with specific_issue, severity, evidence_quote, overall_severity low/medium/high, confidence_score 0-1, suggested_action approve/flag/remove, explanation_for_user if not approved, moderation_reasoning for internal logs.',
  'You are a content moderation AI for an educational platform serving South African high school students. Always respond with valid JSON. Prioritize student safety while allowing educational discourse.',
  'gpt-4o-mini',
  0.1,
  600,
  'json_object',
  true
);

-- Career Counseling Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'career_counseling_guidance',
  1,
  'You are a South African career counselor helping a Grade {grade_level} student explore career options. Student Profile: Subjects studying {subjects_list}, Academic performance {performance_summary}, Interests {stated_interests}, Location {province}. Available Career: {career_name} with description {career_description}, required subjects {required_subjects}, salary range {salary_range}, job outlook {job_outlook}, South African demand {sa_demand}. Task: Provide personalized career counseling addressing: 1) Alignment with student''s strengths showing how their strong subjects match career requirements, 2) Gap analysis identifying subjects or skills student needs to develop, 3) Realistic expectations discussing entry-level vs experienced salaries, job competition, 4) Pathway guidance explaining typical education route - university programs, colleges, technical training with specific South African institutions, 5) Alternative careers suggesting related fields if perfect match lacking, 6) Actionable next steps listing concrete actions like specific subjects to improve, programs to research, experiences to gain, 7) Local context discussing opportunities in student''s province and nationally, 8) Encouragement maintaining positive supportive tone. Tone: Encouraging but realistic, age-appropriate language, culturally sensitive to South African diversity and economic realities. Return markdown formatted response with clear sections, bullet points for readability, avoiding overwhelming information.',
  'You are an expert South African career counselor with deep knowledge of local job market, universities, TVET colleges, and career pathways. Be encouraging but realistic about opportunities.',
  'gpt-4o-mini',
  0.7,
  1200,
  'markdown',
  true
);

-- Study Tips Generation Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'study_tips_personalized',
  1,
  'You are an expert learning strategist helping a South African Grade {grade_level} student improve their {subject_name} performance. Student Context: Current average {current_average}%, Learning style {learning_style}, Study pace {study_pace}, Weak areas {weak_topics}, Time available {study_time_available} minutes per day. Task: Generate personalized study plan including: 1) Prioritization ranking topics to study first focusing on weak areas with high quiz weight, 2) Study techniques specific to subject and learning style - visual learners get diagram suggestions, auditory get discussion prompts, kinesthetic get hands-on activities, reading/writing get note-taking strategies, 3) Time allocation distributing study minutes across topics with more time for difficult concepts, 4) Practice recommendations suggesting specific question types to practice, 5) Memory strategies using mnemonics, associations, spaced repetition for retention, 6) Self-testing approach explaining active recall benefits with sample self-quiz questions, 7) Resource suggestions pointing to EduFutura features - relevant chapters, practice quizzes, study groups, AI tutor questions to ask, 8) Progress milestones setting achievable weekly goals building confidence, 9) South African context incorporating matric exam format, common challenges for SA students, local study culture. Tone: Motivational and empowering, practical and specific, acknowledging student''s current level without judgment. Return markdown with clear sections, actionable bullet points, realistic timeline.',
  'You are an expert learning strategist specializing in South African education system and matric preparation. Be motivational while providing practical, actionable advice.',
  'gpt-4o-mini',
  0.6,
  1000,
  'markdown',
  true
);

-- Forum Post Suggestion Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'forum_post_improvement',
  1,
  'A student is about to post a question in the {subject_name} forum about {chapter_title}. Draft Question: {draft_question_text}. Task: Analyze draft and provide suggestions for improvement if needed. Check: 1) Clarity - is question understandable, specific about what student needs help with, 2) Context - does student provide relevant information like what they''ve tried, where they''re stuck, 3) Formatting - is question readable with paragraphs, not wall of text, 4) Tone - is question respectful, avoiding demanding language, 5) Searchability - does title accurately describe question for others searching, 6) Completeness - has student included all necessary information for meaningful answer. If draft good quality return {needs_improvement: false, suggestion: ''Your question is clear and well-structured''}. If needs improvement return {needs_improvement: true, improved_title: suggested better title, improved_question: rewritten version maintaining student''s voice, explanation: friendly explanation of improvements made like ''I made your question more specific by...''}. Tone: Helpful and educational not critical, teaching good question-asking skills.',
  'You are a helpful writing assistant teaching students to ask better questions. Always respond with valid JSON. Be encouraging and educational.',
  'gpt-4o-mini',
  0.5,
  500,
  'json_object',
  true
);

-- Report Card Analysis Template
INSERT INTO public.ai_prompt_templates (template_name, template_version, prompt_text, system_context, model_name, temperature, max_tokens, response_format, is_active)
VALUES (
  'report_card_analysis',
  1,
  'You are analyzing a South African school report card for Grade {grade_level} student, Academic Year {academic_year}. Image contains: {extracted_text_from_ocr}. Task: Extract and structure all academic information: 1) Overall performance identifying pass/fail status, aggregate percentage or average, promotion status, 2) Subject grades listing each subject with percentage, symbol if shown, converting symbols to percentages (7 equals 80-100%, 6 equals 70-79%, down to 1 equals 0-29%), rank in class if shown, 3) Teacher comments extracting verbatim for each subject and overall, 4) Attendance statistics if present, 5) Conduct or behavior reports if included. Analysis: Compare report grades to EduFutura quiz performance identifying discrepancies where student performs differently on quizzes versus exams suggesting exam anxiety if quiz performance higher, or suggesting quiz difficulty calibration if report performance significantly higher. Identify strengths and weaknesses ranking subjects by performance, noting improvement opportunities. Provide insights like ''Strong performance in sciences (80%+ average) suggests STEM career paths. Mathematics needs attention (58%) - focus on algebra and geometry identified as weak areas in quizzes.'' Validation flags: Mark extraction confidence as high if text clear and structured, medium if some OCR errors, low if handwritten or poor quality requiring human review. Return structured JSON with extracted_data containing all fields, analysis_insights object with strengths array, weaknesses array, recommendations array, validation object with confidence_level and issues_found array, requires_human_verification boolean.',
  'You are an expert at analyzing South African school report cards. Always respond with valid JSON. Extract data accurately and provide actionable insights.',
  'gpt-4o-mini',
  0.3,
  1500,
  'json_object',
  true
);

-- Create function to get active template
CREATE OR REPLACE FUNCTION public.get_active_template(p_template_name TEXT)
RETURNS TABLE (
  id UUID,
  template_name TEXT,
  template_version INTEGER,
  prompt_text TEXT,
  system_context TEXT,
  model_name TEXT,
  temperature DECIMAL,
  max_tokens INTEGER,
  response_format TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.template_name,
    t.template_version,
    t.prompt_text,
    t.system_context,
    t.model_name,
    t.temperature,
    t.max_tokens,
    t.response_format
  FROM public.ai_prompt_templates t
  WHERE t.template_name = p_template_name
    AND t.is_active = true
  ORDER BY t.template_version DESC
  LIMIT 1;
END;
$$;

-- Create function to update template metrics
CREATE OR REPLACE FUNCTION public.update_template_metrics(
  p_template_name TEXT,
  p_template_version INTEGER,
  p_success BOOLEAN,
  p_rating INTEGER DEFAULT NULL,
  p_cost DECIMAL DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_metrics JSONB;
  v_total_uses INTEGER;
  v_success_count INTEGER;
  v_total_rating DECIMAL;
  v_rating_count INTEGER;
BEGIN
  SELECT performance_metrics INTO v_current_metrics
  FROM public.ai_prompt_templates
  WHERE template_name = p_template_name AND template_version = p_template_version;

  v_total_uses := COALESCE((v_current_metrics->>'total_uses')::INTEGER, 0) + 1;
  v_success_count := COALESCE((v_current_metrics->>'success_count')::INTEGER, 0) + (CASE WHEN p_success THEN 1 ELSE 0 END);
  v_total_rating := COALESCE((v_current_metrics->>'total_rating')::DECIMAL, 0);
  v_rating_count := COALESCE((v_current_metrics->>'rating_count')::INTEGER, 0);

  IF p_rating IS NOT NULL THEN
    v_total_rating := v_total_rating + p_rating;
    v_rating_count := v_rating_count + 1;
  END IF;

  UPDATE public.ai_prompt_templates
  SET 
    performance_metrics = jsonb_build_object(
      'total_uses', v_total_uses,
      'success_count', v_success_count,
      'success_rate', ROUND((v_success_count::DECIMAL / v_total_uses) * 100, 2),
      'total_rating', v_total_rating,
      'rating_count', v_rating_count,
      'average_user_rating', CASE WHEN v_rating_count > 0 THEN ROUND(v_total_rating / v_rating_count, 2) ELSE 0 END,
      'cost_per_use', p_cost,
      'total_cost', COALESCE((v_current_metrics->>'total_cost')::DECIMAL, 0) + p_cost
    ),
    updated_at = now()
  WHERE template_name = p_template_name AND template_version = p_template_version;
END;
$$;