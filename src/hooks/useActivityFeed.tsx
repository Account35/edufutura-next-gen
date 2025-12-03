import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  subject?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface UseActivityFeedOptions {
  limit?: number;
  enableRealtime?: boolean;
}

/**
 * Hook for fetching and managing the activity feed with real-time updates
 * Integrates with Phase 9 backend services
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}) {
  const { limit = 10, enableRealtime = true } = options;
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchActivities = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const offset = pageNum * limit;
      
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit);

      if (error) throw error;

      const formattedActivities: ActivityItem[] = (data || []).map(item => ({
        id: item.id,
        type: item.activity_type,
        description: formatActivityDescription(item.activity_type, item.activity_description, item.metadata),
        subject: item.subject_name || (item.metadata as any)?.subject_name,
        timestamp: item.created_at || item.timestamp || new Date().toISOString(),
        metadata: item.metadata as Record<string, any>,
      }));

      if (append) {
        setActivities(prev => [...prev, ...formattedActivities]);
      } else {
        setActivities(formattedActivities);
      }

      setHasMore((data?.length || 0) === limit + 1);

    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  // Initial fetch
  useEffect(() => {
    fetchActivities(0);
  }, [fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime || !user?.id) return;

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newActivity: ActivityItem = {
            id: payload.new.id,
            type: payload.new.activity_type,
            description: formatActivityDescription(
              payload.new.activity_type,
              payload.new.activity_description,
              payload.new.metadata
            ),
            subject: payload.new.subject_name || (payload.new.metadata as any)?.subject_name,
            timestamp: payload.new.created_at || new Date().toISOString(),
            metadata: payload.new.metadata,
          };
          
          setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, user?.id, limit]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  }, [hasMore, loading, page, fetchActivities]);

  const refresh = useCallback(() => {
    setPage(0);
    fetchActivities(0);
  }, [fetchActivities]);

  return {
    activities,
    loading,
    hasMore,
    loadMore,
    refresh,
  };
}

// Helper to format activity descriptions
function formatActivityDescription(type: string, description: string, metadata?: any): string {
  const meta = metadata || {};
  
  switch (type) {
    case 'chapter_completed':
      return `Completed Chapter ${meta.chapter_number || ''} - ${meta.chapter_title || description}`;
    case 'quiz_completed':
      return `Completed Quiz - ${meta.score_percentage || 0}% ${meta.passed ? '✓' : ''}`;
    case 'badge_earned':
      return `Earned badge: ${meta.badge_name || description}`;
    case 'resource_shared':
      return `Shared resource in ${meta.subject_name || 'Community'}`;
    case 'group_joined':
      return `Joined study group: ${meta.group_name || description}`;
    case 'certificate_earned':
      return `🏆 Earned certificate for ${meta.subject_name || description}`;
    default:
      return description;
  }
}