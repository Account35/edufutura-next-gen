import { useState, useEffect, useCallback } from 'react';
import { getCacheStats, cleanupExpiredCache, evictLRUCache, invalidateCacheByTags } from '@/services/ai-cache.service';
import { supabase } from '@/integrations/supabase/client';

interface CacheStatsData {
  totalRequests: number;
  hitRate: number;
  avgLatencyImprovement: number;
  estimatedSavings: number;
  cacheSize: number;
  oldestEntry: string | null;
  topTemplates: { name: string; hits: number }[];
}

export function useCacheStats(days: number = 7) {
  const [stats, setStats] = useState<CacheStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get basic stats
      const basicStats = await getCacheStats(days);
      
      // Get cache size
      const { count: cacheSize } = await supabase
        .from('ai_response_cache')
        .select('*', { count: 'exact', head: true });

      // Get oldest entry
      const { data: oldestData } = await supabase
        .from('ai_response_cache')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Get top templates by hits
      const { data: metricsData } = await supabase
        .from('ai_cache_metrics')
        .select('template_name, cache_hits')
        .order('cache_hits', { ascending: false })
        .limit(5);

      const topTemplates = metricsData?.map(m => ({
        name: m.template_name || 'unknown',
        hits: m.cache_hits || 0,
      })) || [];

      setStats({
        ...basicStats,
        cacheSize: cacheSize || 0,
        oldestEntry: oldestData?.created_at || null,
        topTemplates,
      });
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cleanupCache = useCallback(async () => {
    try {
      const cleaned = await cleanupExpiredCache();
      await fetchStats();
      return cleaned;
    } catch (err) {
      console.error('Cleanup failed:', err);
      throw err;
    }
  }, [fetchStats]);

  const evictCache = useCallback(async (maxEntries: number = 100000) => {
    try {
      const evicted = await evictLRUCache(maxEntries);
      await fetchStats();
      return evicted;
    } catch (err) {
      console.error('Eviction failed:', err);
      throw err;
    }
  }, [fetchStats]);

  const invalidateByTags = useCallback(async (tags: string[]) => {
    try {
      const invalidated = await invalidateCacheByTags(tags);
      await fetchStats();
      return invalidated;
    } catch (err) {
      console.error('Invalidation failed:', err);
      throw err;
    }
  }, [fetchStats]);

  const warmCache = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('warm-cache');
      if (error) throw error;
      await fetchStats();
      return data;
    } catch (err) {
      console.error('Cache warming failed:', err);
      throw err;
    }
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
    cleanupCache,
    evictCache,
    invalidateByTags,
    warmCache,
  };
}
