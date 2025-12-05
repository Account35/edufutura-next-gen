import { supabase } from '@/integrations/supabase/client';
import { ExternalServiceError } from '@/lib/errors';
import { logApiUsage } from './cerebras.service';
import { getCachedResponse, cacheResponse } from './ai-cache.service';

export interface QuizQuestion {
  question_number: number;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'math_problem';
  question_text: string;
  correct_answer: string;
  options?: string[];
  explanation?: string;
  points: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
}

export interface GradingResult {
  score: number;
  feedback: string;
  is_correct: boolean;
  confidence: number;
}

export interface ModerationResult {
  approved: boolean;
  issues: string[];
  confidence: number;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function generateQuizQuestions(
  chapterContent: string,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  questionCount: number,
  subjectName?: string,
  gradeLevel?: number
): Promise<QuizQuestion[]> {
  // Build query string for caching
  const queryKey = `quiz|${difficulty}|${questionCount}|${chapterContent.slice(0, 200)}`;
  const context = {
    templateName: 'quiz_generation',
    subjectName,
    gradeLevel,
  };

  // Check database cache first
  const cacheResult = await getCachedResponse(queryKey, context);
  if (cacheResult.hit && cacheResult.data) {
    console.log('Returning cached quiz questions from database');
    return cacheResult.data as QuizQuestion[];
  }

  const startTime = Date.now();
  const result = await retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('generate-quiz', {
      body: {
        chapter_content: chapterContent,
        difficulty,
        question_count: questionCount,
      }
    });

    if (error) throw error;
    if (!data?.questions) throw new Error('Invalid response format');

    return data.questions as QuizQuestion[];
  });

  // Cache to database
  await cacheResponse(queryKey, result, 'gpt-4o-mini', context, Date.now() - startTime);

  return result;
}

export async function gradeShortAnswer(
  questionText: string,
  studentAnswer: string,
  expectedAnswer: string,
  explanation?: string
): Promise<GradingResult> {
  const result = await retryWithBackoff(async () => {
    const { data, error } = await supabase.functions.invoke('grade-short-answer', {
      body: {
        question_text: questionText,
        student_answer: studentAnswer,
        expected_answer: expectedAnswer,
        explanation,
      }
    });

    if (error) throw error;
    if (!data) throw new Error('Invalid grading response');

    return data as GradingResult;
  });

  // Log grading decision for analytics
  try {
    await (supabase as any).from('grading_log').insert({
      question_text: questionText,
      student_answer: studentAnswer,
      score: result.score,
      is_correct: result.is_correct,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error('Failed to log grading decision:', error);
  }

  return result;
}

let moderationFailureCount = 0;
const MAX_FAILURES = 5;

export async function moderateContent(
  contentType: 'forum_post' | 'forum_reply' | 'group_message' | 'resource',
  content: string,
  userId: string
): Promise<ModerationResult> {
  // Circuit breaker pattern
  if (moderationFailureCount >= MAX_FAILURES) {
    console.warn('Moderation service circuit breaker open - auto-approving with manual review');
    
    // Queue for manual review
    await supabase.from('content_moderation_log').insert({
      content_type: contentType,
      content_id: crypto.randomUUID(),
      user_id: userId,
      moderation_decision: 'pending',
      issues_detected: ['Circuit breaker open - needs manual review'],
    });

    return {
      approved: true,
      issues: ['Queued for manual review'],
      confidence: 0,
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: {
        content_type: contentType,
        content,
        user_id: userId,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (error) throw error;

    // Reset failure count on success
    moderationFailureCount = 0;

    return data as ModerationResult;
  } catch (error) {
    moderationFailureCount++;
    console.error('Moderation error:', error);

    // Auto-approve with manual review on failure
    await supabase.from('content_moderation_log').insert({
      content_type: contentType,
      content_id: crypto.randomUUID(),
      user_id: userId,
      moderation_decision: 'pending',
      issues_detected: [`Moderation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    });

    return {
      approved: true,
      issues: ['Moderation service unavailable - queued for review'],
      confidence: 0,
    };
  }
}
