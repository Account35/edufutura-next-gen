import { supabase } from '@/integrations/supabase/client';

export interface GradingResult {
  questionId: string;
  is_correct: boolean;
  points_earned: number;
  correct_answer: string;
  student_answer: string;
  explanation?: string;
  ai_feedback?: string;
  ai_confidence?: number;
  graded_by: 'deterministic' | 'ai';
  grading_duration_ms: number;
}

export interface QuizGradingResult {
  score_percentage: number;
  total_correct: number;
  total_questions: number;
  passed: boolean;
  points_earned: number;
  points_possible: number;
  graded_answers: GradingResult[];
}

// Grade Multiple Choice questions
export const gradeMultipleChoice = async (
  questionId: string,
  correctAnswer: string,
  studentAnswer: string,
  points: number
): Promise<GradingResult> => {
  const startTime = Date.now();
  
  // Normalize answers to lowercase for comparison
  const normalizedCorrect = correctAnswer?.toLowerCase().trim();
  const normalizedStudent = studentAnswer?.toLowerCase().trim();
  
  const isCorrect = normalizedCorrect === normalizedStudent;
  
  return {
    questionId,
    is_correct: isCorrect,
    points_earned: isCorrect ? points : 0,
    correct_answer: correctAnswer,
    student_answer: studentAnswer || 'Not answered',
    graded_by: 'deterministic',
    grading_duration_ms: Date.now() - startTime,
  };
};

// Grade True/False questions
export const gradeTrueFalse = async (
  questionId: string,
  correctAnswer: string,
  studentAnswer: string,
  points: number
): Promise<GradingResult> => {
  const startTime = Date.now();
  
  // Normalize various true/false formats
  const normalizeBoolean = (answer: string): string => {
    const lower = answer?.toLowerCase().trim();
    if (['true', 't', '1', 'yes'].includes(lower)) return 'true';
    if (['false', 'f', '0', 'no'].includes(lower)) return 'false';
    return lower;
  };
  
  const normalizedCorrect = normalizeBoolean(correctAnswer);
  const normalizedStudent = normalizeBoolean(studentAnswer);
  
  const isCorrect = normalizedCorrect === normalizedStudent;
  
  return {
    questionId,
    is_correct: isCorrect,
    points_earned: isCorrect ? points : 0,
    correct_answer: correctAnswer,
    student_answer: studentAnswer || 'Not answered',
    graded_by: 'deterministic',
    grading_duration_ms: Date.now() - startTime,
  };
};

// Grade Short Answer using AI
export const gradeShortAnswer = async (
  questionId: string,
  questionText: string,
  correctAnswer: string,
  studentAnswer: string,
  points: number,
  explanation?: string
): Promise<GradingResult> => {
  const startTime = Date.now();
  
  // If no answer provided, mark as incorrect
  if (!studentAnswer || studentAnswer.trim() === '') {
    return {
      questionId,
      is_correct: false,
      points_earned: 0,
      correct_answer: correctAnswer,
      student_answer: 'Not answered',
      graded_by: 'deterministic',
      grading_duration_ms: Date.now() - startTime,
    };
  }
  
  try {
    // Call AI grading edge function
    const { data, error } = await supabase.functions.invoke('ai-gpt4', {
      body: {
        messages: [
          {
            role: 'system',
            content: `You are an expert South African CAPS curriculum educator grading student answers. Be fair but maintain academic standards. Award partial credit for demonstrating understanding even if incomplete. Return your response as valid JSON only, no markdown formatting.`
          },
          {
            role: 'user',
            content: `Evaluate this answer:

Question: ${questionText}

Expected answer: ${correctAnswer}

${explanation ? `Additional context: ${explanation}` : ''}

Student answer: ${studentAnswer}

Evaluate if the student demonstrates correct understanding. Return ONLY valid JSON with this exact structure:
{
  "is_correct": boolean,
  "points_earned": number between 0 and ${points},
  "confidence": number between 0 and 1,
  "feedback": "brief explanation of the grade"
}`
          }
        ],
        temperature: 0.2,
        max_tokens: 500
      }
    });

    if (error) throw error;

    let evaluation;
    try {
      // Parse AI response - handle both direct JSON and markdown-wrapped JSON
      const responseText = data.choices[0].message.content.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      evaluation = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', data);
      throw new Error('Invalid AI response format');
    }

    // Validate response structure
    if (
      typeof evaluation.is_correct !== 'boolean' ||
      typeof evaluation.points_earned !== 'number' ||
      typeof evaluation.confidence !== 'number'
    ) {
      throw new Error('Invalid evaluation structure');
    }

    // Ensure points are within valid range
    evaluation.points_earned = Math.max(0, Math.min(points, evaluation.points_earned));

    return {
      questionId,
      is_correct: evaluation.is_correct,
      points_earned: evaluation.points_earned,
      correct_answer: correctAnswer,
      student_answer: studentAnswer,
      ai_feedback: evaluation.feedback,
      ai_confidence: evaluation.confidence,
      graded_by: 'ai',
      grading_duration_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('AI grading error:', error);
    
    // Fallback: Use simple keyword matching
    const keywords = correctAnswer.toLowerCase().split(/\s+/);
    const studentWords = studentAnswer.toLowerCase().split(/\s+/);
    const matchedKeywords = keywords.filter(kw => studentWords.includes(kw));
    const matchPercentage = matchedKeywords.length / keywords.length;
    
    const pointsEarned = Math.round(points * matchPercentage);
    
    return {
      questionId,
      is_correct: matchPercentage >= 0.7,
      points_earned: pointsEarned,
      correct_answer: correctAnswer,
      student_answer: studentAnswer,
      ai_feedback: 'Graded using keyword matching (AI unavailable)',
      ai_confidence: 0.5,
      graded_by: 'ai',
      grading_duration_ms: Date.now() - startTime,
    };
  }
};

// Grade Math Problem
export const gradeMathProblem = async (
  questionId: string,
  questionText: string,
  correctAnswer: string,
  studentAnswer: string,
  studentWorking: string,
  points: number,
  requiresWorking: boolean,
  explanation?: string
): Promise<GradingResult> => {
  const startTime = Date.now();
  
  let finalAnswerPoints = 0;
  let workingPoints = 0;
  const finalAnswerWeight = 0.6; // 60% for correct answer
  const workingWeight = 0.4; // 40% for working
  
  // Grade final answer (60% of points)
  const finalAnswerMaxPoints = Math.round(points * finalAnswerWeight);
  const answerIsCorrect = checkNumericAnswer(correctAnswer, studentAnswer);
  if (answerIsCorrect) {
    finalAnswerPoints = finalAnswerMaxPoints;
  }
  
  // Grade working if required (40% of points)
  if (requiresWorking && studentWorking && studentWorking.trim() !== '') {
    const workingMaxPoints = Math.round(points * workingWeight);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-gpt4', {
        body: {
          messages: [
            {
              role: 'system',
              content: 'You are a mathematics educator evaluating student working. Focus on mathematical method and logical steps. Return only valid JSON.'
            },
            {
              role: 'user',
              content: `Evaluate this mathematical working:

Problem: ${questionText}

Correct answer: ${correctAnswer}

Student's final answer: ${studentAnswer} (${answerIsCorrect ? 'correct' : 'incorrect'})

Student's working:
${studentWorking}

${explanation ? `Context: ${explanation}` : ''}

Evaluate the method and steps shown. Return ONLY valid JSON:
{
  "method_correct": boolean,
  "points_earned": number between 0 and ${workingMaxPoints},
  "feedback": "brief explanation"
}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        }
      });

      if (error) throw error;

      const responseText = data.choices[0].message.content.trim();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;
      const workingEval = JSON.parse(jsonText);
      
      workingPoints = Math.max(0, Math.min(workingMaxPoints, workingEval.points_earned));
    } catch (error) {
      console.error('Working grading error:', error);
      // Award partial points if answer is correct but working couldn't be graded
      if (answerIsCorrect) {
        workingPoints = Math.round(workingMaxPoints * 0.5);
      }
    }
  } else if (requiresWorking && (!studentWorking || studentWorking.trim() === '')) {
    // No working shown when required
    workingPoints = 0;
  } else {
    // Working not required, give full working points if answer correct
    workingPoints = answerIsCorrect ? Math.round(points * workingWeight) : 0;
  }
  
  const totalPointsEarned = finalAnswerPoints + workingPoints;
  const isCorrect = totalPointsEarned >= points * 0.75; // 75% threshold
  
  return {
    questionId,
    is_correct: isCorrect,
    points_earned: totalPointsEarned,
    correct_answer: correctAnswer,
    student_answer: studentAnswer,
    ai_feedback: `Answer: ${finalAnswerPoints}/${finalAnswerMaxPoints} points. Working: ${workingPoints}/${Math.round(points * workingWeight)} points.`,
    graded_by: 'ai',
    grading_duration_ms: Date.now() - startTime,
  };
};

// Helper: Check if numeric answers match (with tolerance)
const checkNumericAnswer = (correct: string, student: string): boolean => {
  try {
    const correctNum = parseFloat(correct.replace(/[^\d.-]/g, ''));
    const studentNum = parseFloat(student.replace(/[^\d.-]/g, ''));
    
    if (isNaN(correctNum) || isNaN(studentNum)) {
      // Not numeric, try exact match
      return correct.toLowerCase().trim() === student.toLowerCase().trim();
    }
    
    // Allow 1% tolerance for rounding
    const tolerance = Math.abs(correctNum * 0.01);
    return Math.abs(correctNum - studentNum) <= tolerance;
  } catch {
    return correct.toLowerCase().trim() === student.toLowerCase().trim();
  }
};

// Main grading function
export const gradeQuiz = async (
  questions: any[],
  answers: Record<string, any>,
  passingScore: number
): Promise<QuizGradingResult> => {
  const gradedAnswers: GradingResult[] = [];
  let totalPointsPossible = 0;
  
  for (const question of questions) {
    totalPointsPossible += question.points || 1;
    const answer = answers[question.id];
    
    if (!answer) {
      // Question not answered
      gradedAnswers.push({
        questionId: question.id,
        is_correct: false,
        points_earned: 0,
        correct_answer: question.correct_answer,
        student_answer: 'Not answered',
        graded_by: 'deterministic',
        grading_duration_ms: 0,
      });
      continue;
    }
    
    let result: GradingResult;
    
    switch (question.question_type) {
      case 'multiple_choice':
        result = await gradeMultipleChoice(
          question.id,
          question.correct_answer,
          answer.answer,
          question.points || 1
        );
        break;
        
      case 'true_false':
        result = await gradeTrueFalse(
          question.id,
          question.correct_answer,
          answer.answer,
          question.points || 1
        );
        break;
        
      case 'short_answer':
        result = await gradeShortAnswer(
          question.id,
          question.question_text,
          question.correct_answer,
          answer.answer,
          question.points || 1,
          question.explanation
        );
        break;
        
      case 'math_problem':
        result = await gradeMathProblem(
          question.id,
          question.question_text,
          question.correct_answer,
          answer.answer,
          answer.working || '',
          question.points || 1,
          question.requires_working || false,
          question.explanation
        );
        break;
        
      default:
        result = {
          questionId: question.id,
          is_correct: false,
          points_earned: 0,
          correct_answer: question.correct_answer,
          student_answer: answer.answer,
          graded_by: 'deterministic',
          grading_duration_ms: 0,
        };
    }
    
    gradedAnswers.push(result);
  }
  
  const totalPointsEarned = gradedAnswers.reduce((sum, r) => sum + r.points_earned, 0);
  const scorePercentage = (totalPointsEarned / totalPointsPossible) * 100;
  const totalCorrect = gradedAnswers.filter(r => r.is_correct).length;
  const passed = scorePercentage >= passingScore;
  
  return {
    score_percentage: Math.round(scorePercentage * 100) / 100,
    total_correct: totalCorrect,
    total_questions: questions.length,
    passed,
    points_earned: totalPointsEarned,
    points_possible: totalPointsPossible,
    graded_answers: gradedAnswers,
  };
};
