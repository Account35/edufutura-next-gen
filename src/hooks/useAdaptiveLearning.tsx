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

  // Phase 10: Get dashboard insights with predictive analytics
  const getDashboardInsights = useCallback(async () => {
    if (!user) return null;

    try {
      // Get user progress for predictions
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      const { data: quizzes } = await supabase
        .from('quiz_attempts')
        .select('score_percentage, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: dropoutRisk } = await supabase
        .from('dropout_risk_scores')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Calculate predictions
      const avgScore = quizzes?.length 
        ? quizzes.reduce((sum, q) => sum + (q.score_percentage || 0), 0) / quizzes.length 
        : 70;

      const scoreTrend = calculateTrend(quizzes || []);
      const predictedScore = Math.min(100, Math.max(0, avgScore + scoreTrend * 5));

      // Weekly forecast
      const weeklyRate = progress?.reduce((sum, p) => sum + (p.chapters_completed || 0), 0) || 0;
      const forecastedChapters = Math.max(1, Math.round(weeklyRate * 0.3));

      return {
        predicted_quiz_score: Math.round(predictedScore),
        score_trend: scoreTrend > 0 ? 'improving' : scoreTrend < 0 ? 'declining' : 'stable',
        dropout_risk: dropoutRisk?.risk_level || 'low',
        weekly_forecast: `At this pace, you'll complete ${forecastedChapters} more chapter${forecastedChapters !== 1 ? 's' : ''} this week`,
        momentum_score: Math.round((progress?.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) || 0) / Math.max(1, progress?.length || 1)),
        untapped_features: await getUntappedFeatures()
      };
    } catch (error) {
      console.error('Error getting dashboard insights:', error);
      return null;
    }
  }, [user]);

  // Phase 10: Get adaptive content adjustments
  const getAdaptiveContent = useCallback(async (subjectName: string) => {
    if (!user) return null;

    try {
      const { data: prefs } = await supabase
        .from('study_preferences')
        .select('learning_style, study_pace')
        .eq('user_id', user.id)
        .maybeSingle();

      const { data: progress } = await supabase
        .from('user_progress')
        .select('average_quiz_score')
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .maybeSingle();

      const learningStyle = prefs?.learning_style || 'visual';
      const avgScore = progress?.average_quiz_score || 70;
      const pace = prefs?.study_pace || 'moderate';

      return {
        show_diagrams: learningStyle === 'visual',
        show_audio_option: learningStyle === 'auditory',
        show_detailed_steps: learningStyle === 'reading-writing',
        show_interactive_elements: learningStyle === 'kinesthetic',
        difficulty_level: avgScore >= 80 ? 'advanced' : avgScore >= 60 ? 'intermediate' : 'simplified',
        estimated_completion_minutes: pace === 'slow' ? 45 : pace === 'fast' ? 20 : 30,
        personalized_tips: getPersonalizedTips(learningStyle, avgScore)
      };
    } catch (error) {
      console.error('Error getting adaptive content:', error);
      return null;
    }
  }, [user]);

  // Phase 10: Get AI tutor context
  const getTutorContext = useCallback(async (subjectName?: string) => {
    if (!user) return null;

    try {
      const { data: userProgress } = await supabase
        .from('user_progress')
        .select('subject_name, average_quiz_score')
        .eq('user_id', user.id);

      const { data: prefs } = await supabase
        .from('study_preferences')
        .select('learning_style')
        .eq('user_id', user.id)
        .maybeSingle();

      // Identify weak areas from progress
      const weakSubjects = (userProgress || [])
        .filter(p => (p.average_quiz_score || 0) < 60)
        .map(p => p.subject_name)
        .filter((v): v is string => v !== null);

      return {
        weak_areas: weakSubjects,
        learning_style: prefs?.learning_style || 'visual',
        encouragement: generateEncouragementFromProgress(userProgress || []),
        explanation_style: getExplanationStyle(prefs?.learning_style)
      };
    } catch (error) {
      console.error('Error getting tutor context:', error);
      return null;
    }
  }, [user]);

  // Phase 10: Get gamification predictions
  const getGamificationPredictions = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: achievements } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id);

      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id);

      const totalChapters = progress?.reduce((sum, p) => sum + (p.chapters_completed || 0), 0) || 0;
      const badges = [];

      if (totalChapters < 5) {
        badges.push({
          badge_name: 'First Steps',
          progress: Math.round((totalChapters / 5) * 100),
          remaining_action: `Complete ${5 - totalChapters} more chapters`
        });
      } else if (totalChapters < 20) {
        badges.push({
          badge_name: 'Dedicated Learner',
          progress: Math.round((totalChapters / 20) * 100),
          remaining_action: `Complete ${20 - totalChapters} more chapters`
        });
      }

      return {
        next_badges: badges,
        weekly_challenges: [
          { challenge: 'Complete 3 chapters this week', reward: '50 XP', difficulty: 'medium' },
          { challenge: 'Score 80%+ on your next quiz', reward: '30 XP', difficulty: 'easy' }
        ],
        achievement_streak: achievements?.length || 0
      };
    } catch (error) {
      console.error('Error getting gamification predictions:', error);
      return null;
    }
  }, [user]);

  // Helper functions
  const calculateTrend = (quizzes: any[]): number => {
    if (quizzes.length < 2) return 0;
    const recent = quizzes.slice(0, 5);
    const older = quizzes.slice(5, 10);
    if (!older.length) return 0;
    const recentAvg = recent.reduce((sum, q) => sum + (q.score_percentage || 0), 0) / recent.length;
    const olderAvg = older.reduce((sum, q) => sum + (q.score_percentage || 0), 0) / older.length;
    return (recentAvg - olderAvg) / 10;
  };

  const getUntappedFeatures = async () => {
    if (!user) return [];
    const features = [];

    const { data: groups } = await supabase
      .from('group_members')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    if (!groups?.length) features.push({ feature: 'Study Groups', message: 'Join a study group to learn with peers' });

    const { data: bookmarks } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);
    if (!bookmarks?.length) features.push({ feature: 'Bookmarks', message: 'Bookmark chapters for quick access' });

    return features.slice(0, 3);
  };

  const getPersonalizedTips = (style: string, score: number): string[] => {
    const tips = [];
    if (score < 60) {
      tips.push('Consider reviewing previous chapters before moving forward');
      tips.push('Use the AI tutor for difficult concepts');
    }
    if (style === 'visual') tips.push('Focus on diagrams and visual summaries');
    else if (style === 'auditory') tips.push('Try voice mode for explanations');
    return tips;
  };

  const generateEncouragementFromProgress = (progress: any[]): string => {
    const avgScore = progress.reduce((sum, p) => sum + (p.average_quiz_score || 0), 0) / Math.max(1, progress.length);
    if (avgScore > 75) return "Great progress! Your hard work is paying off!";
    if (avgScore > 60) return "You're making progress! Keep focusing on your strengths.";
    return "Every expert was once a beginner. Keep going!";
  };

  const generateEncouragement = (quizzes: any[]): string => {
    const improving = quizzes.slice(0, 5).reduce((sum, q) => sum + (q.score_percentage || 0), 0) / Math.max(1, Math.min(5, quizzes.length));
    if (improving > 75) return "Great progress! Your hard work is paying off!";
    if (improving > 60) return "You're making progress! Keep focusing on your strengths.";
    return "Every expert was once a beginner. Keep going!";
  };

  const getExplanationStyle = (style: string) => ({
    use_diagrams: style === 'visual',
    conversational: style === 'auditory',
    detailed_text: style === 'reading-writing',
    practical_examples: style === 'kinesthetic'
  });

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
    getReviewsDue,
    // Phase 10 integrations
    getDashboardInsights,
    getAdaptiveContent,
    getTutorContext,
    getGamificationPredictions
  };
};
