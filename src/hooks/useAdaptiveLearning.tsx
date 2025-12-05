import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PerformanceTrend {
  subject: string;
  trend: 'improving' | 'plateau' | 'declining';
  avgScore: number;
  recentScores: number[];
}

interface LearningStyleProfile {
  visual: number;
  auditory: number;
  kinesthetic: number;
  readingWriting: number;
  dominant: string;
}

interface PrerequisiteGap {
  chapterId: string;
  chapterTitle: string;
  prerequisiteId: string;
  prerequisiteTitle: string;
  quizScore: number;
  severity: 'minor' | 'moderate' | 'severe';
}

interface Recommendation {
  id?: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  targetId?: string;
  targetType?: string;
  subjectName?: string;
  reason: string;
}

interface LearningGoal {
  id: string;
  goal_type: string;
  goal_title: string;
  goal_description: string;
  target_value: number;
  current_value: number;
  subject_name?: string;
  target_date?: string;
  status: string;
}

interface ReviewItem {
  chapter_id: string;
  chapter_title: string;
  subject_name: string;
  next_review_date: string;
}

interface LearningAnalysis {
  performanceTrends: PerformanceTrend[];
  prerequisiteGaps: PrerequisiteGap[];
  learningStyle: LearningStyleProfile;
  difficultyLevel: string;
  reviewItems: ReviewItem[];
  recommendations: Recommendation[];
  newGoals: LearningGoal[];
}

export const useAdaptiveLearning = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<LearningAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [goals, setGoals] = useState<LearningGoal[]>([]);

  const analyzeLearningPath = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-learning-path');

      if (error) throw error;

      if (data?.analysis) {
        setAnalysis(data.analysis);
        return data.analysis;
      }
    } catch (error: any) {
      console.error('Learning path analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return null;
  }, [user, toast]);

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('learning_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .eq('is_completed', false)
        .order('priority_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      setRecommendations(data?.map(r => ({
        id: r.id,
        type: r.recommendation_type,
        priority: r.priority_score || 0,
        title: r.title,
        description: r.description || '',
        targetId: r.target_id || undefined,
        targetType: r.target_type || undefined,
        subjectName: r.subject_name || undefined,
        reason: r.reason || ''
      })) || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('learning_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('target_date', { ascending: true });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  }, [user]);

  const dismissRecommendation = useCallback(async (recommendationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('learning_recommendations')
        .update({ is_dismissed: true })
        .eq('id', recommendationId)
        .eq('user_id', user.id);

      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      toast({ title: 'Recommendation dismissed' });
    } catch (error) {
      console.error('Error dismissing recommendation:', error);
    }
  }, [user, toast]);

  const completeRecommendation = useCallback(async (recommendationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('learning_recommendations')
        .update({ is_completed: true })
        .eq('id', recommendationId)
        .eq('user_id', user.id);

      setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
      toast({ title: 'Great progress!' });
    } catch (error) {
      console.error('Error completing recommendation:', error);
    }
  }, [user, toast]);

  const updateGoalProgress = useCallback(async (goalId: string, newValue: number) => {
    if (!user) return;

    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const updates: any = { current_value: newValue, updated_at: new Date().toISOString() };
      
      if (newValue >= goal.target_value) {
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        toast({
          title: '🎉 Goal achieved!',
          description: goal.goal_title,
        });
      }

      await supabase
        .from('learning_goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user.id);

      await fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  }, [user, goals, fetchGoals, toast]);

  const recordReview = useCallback(async (chapterId: string, quality: number) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('spaced_repetition_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (existing) {
        // SM-2 algorithm calculation
        let easeFactor = existing.ease_factor || 2.5;
        let interval = existing.interval_days || 1;
        let repetition = existing.repetition_count || 0;

        if (quality < 3) {
          repetition = 0;
          interval = 1;
        } else {
          repetition += 1;
          if (repetition === 1) interval = 1;
          else if (repetition === 2) interval = 6;
          else interval = Math.round(interval * easeFactor);

          easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
          if (easeFactor < 1.3) easeFactor = 1.3;
        }

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);

        await supabase
          .from('spaced_repetition_items')
          .update({
            ease_factor: easeFactor,
            interval_days: interval,
            repetition_count: repetition,
            next_review_date: nextReview.toISOString().split('T')[0],
            last_review_date: new Date().toISOString().split('T')[0],
            last_quality: quality,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        toast({
          title: 'Review recorded',
          description: `Next review in ${interval} days`,
        });
      }
    } catch (error) {
      console.error('Error recording review:', error);
    }
  }, [user, toast]);

  const getReviewsDue = useCallback(async () => {
    if (!user) return [];

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('spaced_repetition_items')
        .select('*, curriculum_chapters(chapter_title, curriculum_subjects(subject_name))')
        .eq('user_id', user.id)
        .lte('next_review_date', today)
        .order('next_review_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reviews due:', error);
      return [];
    }
  }, [user]);

  return {
    analysis,
    loading,
    recommendations,
    goals,
    analyzeLearningPath,
    fetchRecommendations,
    fetchGoals,
    dismissRecommendation,
    completeRecommendation,
    updateGoalProgress,
    recordReview,
    getReviewsDue
  };
};
