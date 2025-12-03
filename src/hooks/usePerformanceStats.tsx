import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PerformanceStats {
  averageQuizScore: number;
  studyStreak: number;
  totalStudyHours: number;
  weakSubjects: string[];
  strongSubjects: string[];
  recentProgress: number;
  chaptersCompleted: number;
  badgesEarned: number;
}

/**
 * Hook for fetching user performance statistics
 * Uses Phase 9 optimized queries and materialized views
 */
export function usePerformanceStats() {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Fetch all stats in parallel for efficiency
      const [
        quizPerfResult,
        progressResult,
        achievementsResult,
      ] = await Promise.all([
        // Quiz performance by subject
        supabase
          .from('quiz_performance')
          .select('subject_name, average_score, total_attempts')
          .eq('user_id', user.id),
        
        // User progress by subject
        supabase
          .from('user_progress')
          .select('subject_name, progress_percentage, chapters_completed, average_quiz_score')
          .eq('user_id', user.id),
        
        // Achievements count
        supabase
          .from('achievements')
          .select('id')
          .eq('user_id', user.id),
      ]);

      // Calculate stats
      const quizPerf = quizPerfResult.data || [];
      const progress = progressResult.data || [];
      const achievements = achievementsResult.data || [];

      // Average quiz score
      const avgScore = quizPerf.length > 0
        ? quizPerf.reduce((sum, p) => sum + (p.average_score || 0), 0) / quizPerf.length
        : 0;

      // Identify weak and strong subjects
      const subjectScores = quizPerf.map(p => ({
        name: p.subject_name,
        score: p.average_score || 0,
      })).sort((a, b) => a.score - b.score);

      const weakSubjects = subjectScores
        .filter(s => s.score < 60)
        .slice(0, 3)
        .map(s => s.name);

      const strongSubjects = subjectScores
        .filter(s => s.score >= 75)
        .slice(-3)
        .map(s => s.name);

      // Total chapters completed
      const chaptersCompleted = progress.reduce(
        (sum, p) => sum + (p.chapters_completed || 0), 
        0
      );

      // Recent progress (average across subjects)
      const recentProgress = progress.length > 0
        ? progress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / progress.length
        : 0;

      setStats({
        averageQuizScore: Math.round(avgScore),
        studyStreak: userProfile?.study_streak_days || 0,
        totalStudyHours: userProfile?.total_study_hours || 0,
        weakSubjects,
        strongSubjects,
        recentProgress: Math.round(recentProgress),
        chaptersCompleted,
        badgesEarned: achievements.length,
      });

    } catch (error) {
      console.error('Error fetching performance stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, userProfile?.study_streak_days, userProfile?.total_study_hours]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    refresh: fetchStats,
  };
}