import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminQuiz {
  id: string;
  quiz_title: string;
  subject_name: string;
  chapter_id: string | null;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  is_published: boolean;
  total_questions: number;
  passing_score_percentage: number;
  time_limit_minutes: number | null;
  created_at: string;
  created_by: string;
  quiz_description: string | null;
  question_shuffle: boolean;
  option_shuffle: boolean;
  instant_feedback: boolean;
}

export interface QuizStats {
  totalAttempts: number;
  uniqueStudents: number;
  averageScore: number;
  passRate: number;
  averageTimeMinutes: number;
}

export interface QuestionStats {
  questionId: string;
  questionText: string;
  questionType: string;
  correctPercentage: number;
  averageTime: number;
  skipRate: number;
  totalAttempts: number;
}

export const useAdminQuizzes = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading quizzes:', error);
      toast({
        title: "Error",
        description: "Failed to load quizzes",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const createQuiz = async (quizData: Partial<AdminQuiz>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('quizzes')
        .insert({
          ...quizData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz created successfully",
      });

      await loadQuizzes();
      return data;
    } catch (error: any) {
      console.error('Error creating quiz:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create quiz",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateQuiz = async (quizId: string, updates: Partial<AdminQuiz>) => {
    try {
      const { error } = await (supabase as any)
        .from('quizzes')
        .update(updates)
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz updated successfully",
      });

      await loadQuizzes();
      return true;
    } catch (error: any) {
      console.error('Error updating quiz:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update quiz",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteQuiz = async (quizId: string) => {
    try {
      // Check if quiz has attempts
      const { data: attempts } = await (supabase as any)
        .from('quiz_attempts')
        .select('id')
        .eq('quiz_id', quizId)
        .limit(1);

      if (attempts && attempts.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "Quiz has student attempts and cannot be deleted",
          variant: "destructive",
        });
        return false;
      }

      // Delete questions first
      await (supabase as any)
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      // Delete quiz
      const { error } = await (supabase as any)
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quiz deleted successfully",
      });

      await loadQuizzes();
      return true;
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete quiz",
        variant: "destructive",
      });
      return false;
    }
  };

  const duplicateQuiz = async (quizId: string) => {
    try {
      // Get original quiz
      const { data: original, error: quizError } = await (supabase as any)
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;

      // Get questions
      const { data: questions, error: questionsError } = await (supabase as any)
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId);

      if (questionsError) throw questionsError;

      // Create new quiz
      const newQuiz = await createQuiz({
        ...original,
        id: undefined,
        quiz_title: `${original.quiz_title} (Copy)`,
        is_published: false,
        created_at: undefined,
      });

      if (!newQuiz) return null;

      // Copy questions
      if (questions && questions.length > 0) {
        const newQuestions = questions.map((q: any) => ({
          ...q,
          id: undefined,
          quiz_id: newQuiz.id,
        }));

        const { error: insertError } = await (supabase as any)
          .from('quiz_questions')
          .insert(newQuestions);

        if (insertError) throw insertError;
      }

      toast({
        title: "Success",
        description: "Quiz duplicated successfully",
      });

      return newQuiz;
    } catch (error: any) {
      console.error('Error duplicating quiz:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate quiz",
        variant: "destructive",
      });
      return null;
    }
  };

  const getQuizStats = async (quizId: string): Promise<QuizStats | null> => {
    try {
      const { data: attempts, error } = await (supabase as any)
        .from('quiz_attempts')
        .select('score_percentage, passed, time_spent_seconds, user_id')
        .eq('quiz_id', quizId)
        .eq('is_completed', true);

      if (error) throw error;

      if (!attempts || attempts.length === 0) {
        return {
          totalAttempts: 0,
          uniqueStudents: 0,
          averageScore: 0,
          passRate: 0,
          averageTimeMinutes: 0,
        };
      }

      const uniqueStudents = new Set(attempts.map((a: any) => a.user_id)).size;
      const totalScore = attempts.reduce((sum: number, a: any) => sum + (a.score_percentage || 0), 0);
      const passedCount = attempts.filter((a: any) => a.passed).length;
      const totalTime = attempts.reduce((sum: number, a: any) => sum + (a.time_spent_seconds || 0), 0);

      return {
        totalAttempts: attempts.length,
        uniqueStudents,
        averageScore: totalScore / attempts.length,
        passRate: (passedCount / attempts.length) * 100,
        averageTimeMinutes: totalTime / attempts.length / 60,
      };
    } catch (error: any) {
      console.error('Error getting quiz stats:', error);
      return null;
    }
  };

  const getQuestionStats = async (quizId: string): Promise<QuestionStats[]> => {
    try {
      // Get all questions
      const { data: questions, error: qError } = await (supabase as any)
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId);

      if (qError) throw qError;

      // Get all attempts
      const { data: attempts, error: aError } = await (supabase as any)
        .from('quiz_attempts')
        .select('answers')
        .eq('quiz_id', quizId)
        .eq('is_completed', true);

      if (aError) throw aError;

      // Calculate stats per question
      const stats: QuestionStats[] = (questions || []).map((q: any) => {
        let correct = 0;
        let totalTime = 0;
        let skipped = 0;
        let totalAnswers = 0;

        (attempts || []).forEach((attempt: any) => {
          const answer = attempt.answers?.[q.id];
          if (answer) {
            totalAnswers++;
            if (answer.is_correct) correct++;
            if (answer.time_spent) totalTime += answer.time_spent;
            if (answer.skipped) skipped++;
          }
        });

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          correctPercentage: totalAnswers > 0 ? (correct / totalAnswers) * 100 : 0,
          averageTime: totalAnswers > 0 ? totalTime / totalAnswers : 0,
          skipRate: totalAnswers > 0 ? (skipped / totalAnswers) * 100 : 0,
          totalAttempts: totalAnswers,
        };
      });

      return stats.sort((a, b) => a.correctPercentage - b.correctPercentage);
    } catch (error: any) {
      console.error('Error getting question stats:', error);
      return [];
    }
  };

  const bulkPublish = async (quizIds: string[]) => {
    try {
      const { error } = await (supabase as any)
        .from('quizzes')
        .update({ is_published: true })
        .in('id', quizIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Published ${quizIds.length} quiz${quizIds.length !== 1 ? 'zes' : ''}`,
      });

      await loadQuizzes();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to publish quizzes",
        variant: "destructive",
      });
      return false;
    }
  };

  const bulkUnpublish = async (quizIds: string[]) => {
    try {
      const { error } = await (supabase as any)
        .from('quizzes')
        .update({ is_published: false })
        .in('id', quizIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Unpublished ${quizIds.length} quiz${quizIds.length !== 1 ? 'zes' : ''}`,
      });

      await loadQuizzes();
      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to unpublish quizzes",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    quizzes,
    loading,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    duplicateQuiz,
    getQuizStats,
    getQuestionStats,
    bulkPublish,
    bulkUnpublish,
    refreshQuizzes: loadQuizzes,
  };
};
