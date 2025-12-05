import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Recommendation {
  item_id: string;
  item_type: string;
  score: number;
  explanation: string;
  algorithm: string;
}

export interface RecommendationsState {
  chapters: Recommendation[];
  quizzes: Recommendation[];
  resources: Recommendation[];
  studyGroups: Recommendation[];
  studyBuddies: Recommendation[];
}

export function useRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationsState>({
    chapters: [],
    quizzes: [],
    resources: [],
    studyGroups: [],
    studyBuddies: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = useCallback(async (type: 'chapter' | 'quiz' | 'resource' | 'study_group' | 'study_buddy' = 'chapter', limit = 10) => {
    if (!user) return [];

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-recommendations', {
        body: {
          action: 'get_recommendations',
          recommendation_type: type,
          limit,
        },
      });

      if (error) throw error;

      const recs = data.recommendations || [];
      
      // Update state based on type
      setRecommendations(prev => ({
        ...prev,
        [type === 'chapter' ? 'chapters' : 
         type === 'quiz' ? 'quizzes' :
         type === 'resource' ? 'resources' :
         type === 'study_group' ? 'studyGroups' : 'studyBuddies']: recs,
      }));

      return recs;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const recordInteraction = useCallback(async (
    itemId: string,
    itemType: string,
    interactionType: 'view' | 'complete' | 'rate' | 'bookmark' | 'share' | 'dismiss',
    value?: number,
    durationSeconds?: number
  ) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('generate-recommendations', {
        body: {
          action: 'record_interaction',
          item_id: itemId,
          item_type: itemType,
          interaction_type: interactionType,
          interaction_value: value,
          duration_seconds: durationSeconds,
        },
      });
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  }, [user]);

  const recordFeedback = useCallback(async (
    itemId: string,
    itemType: string,
    feedbackType: 'click' | 'dismiss' | 'complete' | 'rate',
    value?: number,
    positionShown?: number
  ) => {
    if (!user) return;

    try {
      await supabase.functions.invoke('generate-recommendations', {
        body: {
          action: 'record_feedback',
          item_id: itemId,
          item_type: itemType,
          feedback_type: feedbackType,
          feedback_value: value,
          position_shown: positionShown,
        },
      });
    } catch (error) {
      console.error('Error recording feedback:', error);
    }
  }, [user]);

  const dismissRecommendation = useCallback(async (itemId: string, itemType: string, position: number) => {
    await recordFeedback(itemId, itemType, 'dismiss', undefined, position);
    
    // Remove from local state
    const key = itemType === 'chapter' ? 'chapters' : 
                itemType === 'quiz' ? 'quizzes' :
                itemType === 'resource' ? 'resources' :
                itemType === 'study_group' ? 'studyGroups' : 'studyBuddies';
    
    setRecommendations(prev => ({
      ...prev,
      [key]: prev[key as keyof RecommendationsState].filter(r => r.item_id !== itemId),
    }));

    toast.info('Recommendation dismissed');
  }, [recordFeedback]);

  const clickRecommendation = useCallback(async (itemId: string, itemType: string, position: number) => {
    await recordFeedback(itemId, itemType, 'click', undefined, position);
    await recordInteraction(itemId, itemType, 'view');
  }, [recordFeedback, recordInteraction]);

  // Fetch recommendations from cache (direct DB query for speed)
  const getCachedRecommendations = useCallback(async (type: string) => {
    if (!user) return [];

    const { data } = await supabase
      .from('recommendations_cache')
      .select('*')
      .eq('user_id', user.id)
      .eq('recommendation_type', type)
      .gt('expires_at', new Date().toISOString())
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && data.ranked_item_ids) {
      return data.ranked_item_ids.map((id: string, i: number) => ({
        item_id: id,
        item_type: type,
        score: (data.scores as number[])?.[i] || 0,
        explanation: (data.explanations as string[])?.[i] || 'Recommended for you',
        algorithm: data.algorithm_used,
      }));
    }

    return [];
  }, [user]);

  // Real-time subscription for recommendation updates
  const subscribeToUpdates = useCallback(() => {
    if (!user) return () => {};

    const channel = supabase
      .channel('recommendations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recommendations_cache',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newRec = payload.new as any;
            const type = newRec.recommendation_type;
            const key = type === 'chapter' ? 'chapters' : 
                        type === 'quiz' ? 'quizzes' :
                        type === 'resource' ? 'resources' :
                        type === 'study_group' ? 'studyGroups' : 'studyBuddies';

            const recs = (newRec.ranked_item_ids || []).map((id: string, i: number) => ({
              item_id: id,
              item_type: type,
              score: newRec.scores?.[i] || 0,
              explanation: newRec.explanations?.[i] || 'Recommended for you',
              algorithm: newRec.algorithm_used,
            }));

            setRecommendations(prev => ({ ...prev, [key]: recs }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    recommendations,
    loading,
    fetchRecommendations,
    recordInteraction,
    recordFeedback,
    dismissRecommendation,
    clickRecommendation,
    getCachedRecommendations,
    subscribeToUpdates,
  };
}
