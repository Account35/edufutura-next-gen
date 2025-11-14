import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AnalyticsOverview {
  averageScore: number;
  totalQuizzes: number;
  passRate: number;
  studyStreak: number;
  weeklyTrend: number;
}

export interface SubjectPerformance {
  subjectName: string;
  quizCount: number;
  averageScore: number;
  bestScore: number;
  lastAttemptDate: string | null;
  knowledgeGaps: number;
}

export interface QuizAttemptData {
  id: string;
  quiz_id: string;
  submitted_at: string;
  score_percentage: number;
  passed: boolean;
  time_spent_seconds: number;
  quiz_title: string;
  subject_name: string;
  chapter_id: string | null;
  difficulty_level: string | null;
  answers: any;
}

export interface QuestionTypeStats {
  type: string;
  totalAnswered: number;
  correctAnswered: number;
  averageScore: number;
  averageTime: number;
}

export interface KnowledgeGap {
  topic: string;
  accuracy: number;
  quizCount: number;
  lastAttempted: string;
}

export const useAnalytics = (userId: string | undefined, subjectName?: string) => {
  const { toast } = useToast();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [attempts, setAttempts] = useState<QuizAttemptData[]>([]);
  const [questionTypeStats, setQuestionTypeStats] = useState<QuestionTypeStats[]>([]);
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadAnalytics();
    }
  }, [userId, subjectName]);

  const loadAnalytics = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);

      // Fetch all quiz attempts with quiz details
      let attemptsQuery = (supabase as any)
        .from('quiz_attempts')
        .select(`
          *,
          quizzes!inner(
            quiz_title,
            subject_name,
            chapter_id,
            difficulty_level
          )
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('submitted_at', { ascending: false });

      if (subjectName) {
        attemptsQuery = attemptsQuery.eq('quizzes.subject_name', subjectName);
      }

      const { data: attemptsData, error: attemptsError } = await attemptsQuery;

      if (attemptsError) throw attemptsError;

      const formattedAttempts: QuizAttemptData[] = (attemptsData || []).map((a: any) => ({
        id: a.id,
        quiz_id: a.quiz_id,
        submitted_at: a.submitted_at,
        score_percentage: a.score_percentage || 0,
        passed: a.passed || false,
        time_spent_seconds: a.time_spent_seconds || 0,
        quiz_title: a.quizzes.quiz_title,
        subject_name: a.quizzes.subject_name,
        chapter_id: a.quizzes.chapter_id,
        difficulty_level: a.quizzes.difficulty_level,
        answers: a.answers,
      }));

      setAttempts(formattedAttempts);

      // Calculate overview stats
      if (formattedAttempts.length > 0) {
        const totalScore = formattedAttempts.reduce((sum, a) => sum + a.score_percentage, 0);
        const passedCount = formattedAttempts.filter(a => a.passed).length;
        
        // Calculate weekly trend (compare this week vs last week)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const thisWeekAttempts = formattedAttempts.filter(a => new Date(a.submitted_at) >= oneWeekAgo);
        const lastWeekAttempts = formattedAttempts.filter(a => {
          const date = new Date(a.submitted_at);
          return date >= twoWeeksAgo && date < oneWeekAgo;
        });

        const thisWeekAvg = thisWeekAttempts.length > 0 
          ? thisWeekAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / thisWeekAttempts.length 
          : 0;
        const lastWeekAvg = lastWeekAttempts.length > 0 
          ? lastWeekAttempts.reduce((sum, a) => sum + a.score_percentage, 0) / lastWeekAttempts.length 
          : 0;

        // Get study streak from user profile
        const { data: userData } = await (supabase as any)
          .from('users')
          .select('study_streak_days')
          .eq('id', userId)
          .maybeSingle();

        setOverview({
          averageScore: totalScore / formattedAttempts.length,
          totalQuizzes: formattedAttempts.length,
          passRate: (passedCount / formattedAttempts.length) * 100,
          studyStreak: userData?.study_streak_days || 0,
          weeklyTrend: thisWeekAvg - lastWeekAvg,
        });
      }

      // Calculate subject performance
      const subjectMap = new Map<string, QuizAttemptData[]>();
      formattedAttempts.forEach(attempt => {
        const existing = subjectMap.get(attempt.subject_name) || [];
        subjectMap.set(attempt.subject_name, [...existing, attempt]);
      });

      const subjectStats: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subject, attempts]) => {
        const scores = attempts.map(a => a.score_percentage);
        const gapsCount = attempts.filter(a => a.score_percentage < 60).length;
        
        return {
          subjectName: subject,
          quizCount: attempts.length,
          averageScore: scores.reduce((sum, s) => sum + s, 0) / scores.length,
          bestScore: Math.max(...scores),
          lastAttemptDate: attempts[0]?.submitted_at || null,
          knowledgeGaps: gapsCount,
        };
      });

      setSubjectPerformance(subjectStats.sort((a, b) => b.averageScore - a.averageScore));

      // Calculate question type statistics
      const typeMap = new Map<string, { correct: number; total: number; time: number }>();
      
      formattedAttempts.forEach(attempt => {
        const answers = attempt.answers || {};
        Object.entries(answers).forEach(([questionId, answer]: [string, any]) => {
          const type = answer.question_type || 'unknown';
          const existing = typeMap.get(type) || { correct: 0, total: 0, time: 0 };
          
          typeMap.set(type, {
            correct: existing.correct + (answer.is_correct ? 1 : 0),
            total: existing.total + 1,
            time: existing.time + (answer.time_spent || 0),
          });
        });
      });

      const typeStats: QuestionTypeStats[] = Array.from(typeMap.entries()).map(([type, stats]) => ({
        type,
        totalAnswered: stats.total,
        correctAnswered: stats.correct,
        averageScore: (stats.correct / stats.total) * 100,
        averageTime: stats.time / stats.total,
      }));

      setQuestionTypeStats(typeStats);

      // Identify knowledge gaps from quiz performance
      const { data: gapsData } = await (supabase as any)
        .from('quiz_performance')
        .select('weak_topics, last_attempt_date')
        .eq('user_id', userId);

      const gapMap = new Map<string, { count: number; lastDate: string }>();
      
      (gapsData || []).forEach((perf: any) => {
        const topics = perf.weak_topics || [];
        topics.forEach((topic: string) => {
          const existing = gapMap.get(topic);
          if (!existing || new Date(perf.last_attempt_date) > new Date(existing.lastDate)) {
            gapMap.set(topic, {
              count: (existing?.count || 0) + 1,
              lastDate: perf.last_attempt_date,
            });
          }
        });
      });

      const gaps: KnowledgeGap[] = Array.from(gapMap.entries()).map(([topic, data]) => ({
        topic,
        accuracy: 50, // Placeholder - would need more detailed calculation
        quizCount: data.count,
        lastAttempted: data.lastDate,
      }));

      setKnowledgeGaps(gaps.sort((a, b) => b.quizCount - a.quizCount));

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const exportToPDF = async () => {
    // This would use jspdf to generate a PDF report
    toast({
      title: "Export",
      description: "PDF export feature coming soon",
    });
  };

  const exportToCSV = () => {
    if (attempts.length === 0) {
      toast({
        title: "No Data",
        description: "No quiz attempts to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Quiz Title', 'Subject', 'Date', 'Score %', 'Passed', 'Time (min)'];
    const rows = attempts.map(a => [
      a.quiz_title,
      a.subject_name,
      new Date(a.submitted_at).toLocaleDateString(),
      a.score_percentage.toFixed(1),
      a.passed ? 'Yes' : 'No',
      Math.round(a.time_spent_seconds / 60),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported",
      description: "Analytics data exported to CSV",
    });
  };

  return {
    overview,
    subjectPerformance,
    attempts,
    questionTypeStats,
    knowledgeGaps,
    loading,
    exportToPDF,
    exportToCSV,
    refresh: loadAnalytics,
  };
};
