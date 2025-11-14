import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Quiz {
  id: string;
  chapter_id: string | null;
  subject_name: string;
  quiz_title: string;
  quiz_description: string | null;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  time_limit_minutes: number | null;
  passing_score_percentage: number;
  total_questions: number;
  question_shuffle: boolean;
  option_shuffle: boolean;
  instant_feedback: boolean;
  created_by: string;
  is_published: boolean;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'math_problem';
  question_text: string;
  question_number: number;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
  reference_section: string | null;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  points: number;
  requires_working: boolean;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  attempt_number: number;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  score_percentage: number | null;
  total_correct: number | null;
  total_questions: number | null;
  passed: boolean | null;
  answers: Record<string, any>;
  is_completed: boolean;
}

export const useQuiz = () => {
  const { toast } = useToast();

  const fetchQuizzesByChapter = async (chapterId: string) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('chapter_id', chapterId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Quiz[];
    } catch (error: any) {
      toast({
        title: "Error loading quizzes",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchQuiz = async (quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      return data as Quiz | null;
    } catch (error: any) {
      toast({
        title: "Error loading quiz",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchQuizQuestions = async (quizId: string, shuffle: boolean = false) => {
    try {
      let query = supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('question_number');

      const { data, error } = await query;

      if (error) throw error;
      
      let questions = data as QuizQuestion[];
      
      if (shuffle) {
        questions = questions.sort(() => Math.random() - 0.5);
      }

      return questions;
    } catch (error: any) {
      toast({
        title: "Error loading questions",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const checkCooldown = async (userId: string, quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_cooldowns')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const nextAvailable = new Date(data.next_available_at);
        const now = new Date();
        
        if (now < nextAvailable) {
          const minutesLeft = Math.ceil((nextAvailable.getTime() - now.getTime()) / 60000);
          return { canAttempt: false, minutesLeft };
        }
      }

      return { canAttempt: true, minutesLeft: 0 };
    } catch (error: any) {
      return { canAttempt: true, minutesLeft: 0 };
    }
  };

  const fetchUserAttempts = async (userId: string, quizId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .eq('is_completed', true)
        .order('attempt_number', { ascending: false });

      if (error) throw error;
      return data as QuizAttempt[];
    } catch (error: any) {
      return [];
    }
  };

  const startQuizAttempt = async (userId: string, quizId: string) => {
    try {
      const attempts = await fetchUserAttempts(userId, quizId);
      const attemptNumber = attempts.length + 1;

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: quizId,
          attempt_number: attemptNumber,
          answers: {},
          is_completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as QuizAttempt;
    } catch (error: any) {
      toast({
        title: "Error starting quiz",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const saveQuizProgress = async (attemptId: string, answers: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({ answers })
        .eq('id', attemptId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      return false;
    }
  };

  const submitQuiz = async (
    attemptId: string,
    answers: Record<string, any>,
    timeSpent: number,
    scoreData: {
      score_percentage: number;
      total_correct: number;
      total_questions: number;
      passed: boolean;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .update({
          answers,
          submitted_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
          is_completed: true,
          ...scoreData,
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (error) throw error;

      // Set cooldown
      const attempt = data as QuizAttempt;
      const nextAvailable = new Date();
      nextAvailable.setHours(nextAvailable.getHours() + 1);

      await supabase
        .from('quiz_cooldowns')
        .upsert({
          user_id: attempt.user_id,
          quiz_id: attempt.quiz_id,
          last_attempt_at: new Date().toISOString(),
          next_available_at: nextAvailable.toISOString(),
        });

      return data as QuizAttempt;
    } catch (error: any) {
      toast({
        title: "Error submitting quiz",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    fetchQuizzesByChapter,
    fetchQuiz,
    fetchQuizQuestions,
    checkCooldown,
    fetchUserAttempts,
    startQuizAttempt,
    saveQuizProgress,
    submitQuiz,
  };
};
