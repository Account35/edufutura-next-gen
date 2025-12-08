/**
 * Custom hook combining React Query with local cache fallback
 * Implements stale-while-revalidate pattern with offline support
 */

import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { getCached, setCached, CACHE_CONFIG } from '@/services/cache.service';

type CacheKey = keyof typeof CACHE_CONFIG;

interface UseCachedQueryOptions<TData> extends Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'> {
  cacheKey?: CacheKey;
  cacheSubKey?: string;
}

/**
 * Enhanced query hook with multi-layer caching
 * Falls back to local cache when offline or on initial load
 */
export function useCachedQuery<TData>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: UseCachedQueryOptions<TData>
) {
  const { cacheKey, cacheSubKey, ...queryOptions } = options || {};
  const [initialData, setInitialData] = useState<TData | undefined>(undefined);
  const [isLoadingCache, setIsLoadingCache] = useState(!!cacheKey);
  
  // Load from local cache on mount
  useEffect(() => {
    if (!cacheKey) return;
    
    let mounted = true;
    
    getCached<TData>(cacheKey, cacheSubKey).then(cached => {
      if (mounted && cached) {
        setInitialData(cached);
      }
      if (mounted) {
        setIsLoadingCache(false);
      }
    });
    
    return () => {
      mounted = false;
    };
  }, [cacheKey, cacheSubKey]);
  
  // Use React Query with cache fallback
  const query = useQuery<TData, Error>({
    queryKey,
    queryFn: async () => {
      const data = await queryFn();
      
      // Save to local cache after successful fetch
      if (cacheKey && data) {
        setCached(cacheKey, data, cacheSubKey);
      }
      
      return data;
    },
    // Use cached data as initial data for instant display
    ...(initialData !== undefined && { initialData }),
    ...queryOptions,
  });
  
  return {
    ...query,
    // Show loading only if we have no cached data
    isLoading: isLoadingCache || (query.isLoading && !initialData),
    // Flag indicating data came from cache
    isFromCache: !query.isFetched && !!initialData,
  };
}

/**
 * Hook for curriculum subjects with persistent caching
 */
export function useCachedSubjects() {
  const { supabase } = require('@/integrations/supabase/client');
  
  return useCachedQuery(
    ['subjects'],
    async () => {
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .select('id, subject_name, description, icon_name, color_scheme, grade_level, total_chapters, estimated_hours, caps_aligned')
        .eq('is_published', true)
        .order('subject_name');
      
      if (error) throw error;
      return data;
    },
    {
      cacheKey: 'subjects',
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
    }
  );
}

/**
 * Hook for user preferences with persistent caching
 */
export function useCachedUserPreferences(userId: string | undefined) {
  const { supabase } = require('@/integrations/supabase/client');
  
  return useCachedQuery(
    ['userPreferences', userId],
    async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('study_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    {
      cacheKey: 'userPreferences',
      cacheSubKey: userId,
      staleTime: 30 * 60 * 1000, // 30 minutes
      enabled: !!userId,
    }
  );
}

/**
 * Hook for institutions with persistent caching
 */
export function useCachedInstitutions(filters?: {
  province?: string;
  type?: string;
}) {
  const { supabase } = require('@/integrations/supabase/client');
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  
  return useCachedQuery(
    ['institutions', filterKey],
    async () => {
      let query = supabase
        .from('tertiary_institutions')
        .select('*')
        .eq('is_active', true);
      
      if (filters?.province) {
        query = query.eq('province', filters.province);
      }
      if (filters?.type) {
        query = query.eq('institution_type', filters.type);
      }
      
      const { data, error } = await query.order('institution_name');
      if (error) throw error;
      return data;
    },
    {
      cacheKey: 'institutions',
      cacheSubKey: filterKey,
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
    }
  );
}

/**
 * Prefetch hook for route transitions
 */
export function usePrefetch() {
  const prefetch = useCallback(async (route: string, userId?: string) => {
    const { prefetchForRoute } = await import('@/lib/query-client');
    const { QueryClient } = await import('@tanstack/react-query');
    
    // This is a simplified version - in real app, get queryClient from context
    // For now, just warm up the local cache
    const { preloadCache } = await import('@/services/cache.service');
    await preloadCache(userId);
  }, []);
  
  return { prefetch };
}

export default useCachedQuery;
