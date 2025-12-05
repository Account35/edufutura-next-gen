import { supabase } from '@/integrations/supabase/client';

// TTL configuration by content type (in seconds)
export const TTL_CONFIG = {
  quiz_generation: 30 * 24 * 60 * 60, // 30 days - curriculum content stable
  career_info: 7 * 24 * 60 * 60, // 7 days - job market changes periodically
  study_tips: 90 * 24 * 60 * 60, // 90 days - learning strategies timeless
  content_moderation: 0, // No caching - security critical
  personalized_recommendations: 24 * 60 * 60, // 24 hours - user profile evolves
  general: 24 * 60 * 60, // 24 hours default
};

// Cost per API call estimates (in cents)
const COST_PER_CALL = {
  'gpt-4': 3,
  'gpt-4-turbo': 2,
  'gpt-4o-mini': 0.5,
  'llama3.1-70b': 0.1,
  default: 1,
};

interface CacheContext {
  gradeLevel?: number;
  subjectName?: string;
  templateName?: string;
  chapterId?: string;
}

interface CacheEntry {
  id: string;
  query_hash: string;
  response_json: any;
  model_used: string;
  hit_count: number;
  created_at: string;
  last_accessed: string;
}

interface CacheResult {
  hit: boolean;
  data?: any;
  latencyMs: number;
  source: 'cache' | 'fresh';
}

/**
 * Normalize query for consistent hashing
 * Ensures equivalent queries produce same hash
 */
export function normalizeQuery(query: string): string {
  let normalized = query
    // Convert to lowercase
    .toLowerCase()
    // Trim whitespace
    .trim()
    // Remove excessive internal spaces
    .replace(/\s+/g, ' ')
    // Remove punctuation but keep essential characters
    .replace(/['".,!?;:()[\]{}]/g, '')
    // Expand common abbreviations
    .replace(/\bch\s*(\d+)/g, 'chapter $1')
    .replace(/\bchap\s*(\d+)/g, 'chapter $1')
    .replace(/\bex\s*(\d+)/g, 'exercise $1')
    .replace(/\bq\s*(\d+)/g, 'question $1')
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\bthat's\b/g, 'that is')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\byou're\b/g, 'you are')
    .replace(/\bthey're\b/g, 'they are')
    .replace(/\bwe're\b/g, 'we are')
    // Remove common stop words (selective)
    .replace(/\b(the|a|an|is|are|was|were|be|been|being)\b/g, '')
    // Clean up double spaces after removals
    .replace(/\s+/g, ' ')
    .trim();

  return normalized;
}

/**
 * Compute MD5-like hash for query (using simple hash for browser compatibility)
 */
export function computeQueryHash(normalizedQuery: string, context?: CacheContext): string {
  const contextStr = context 
    ? `|g:${context.gradeLevel || ''}|s:${context.subjectName || ''}|t:${context.templateName || ''}`
    : '';
  const input = normalizedQuery + contextStr;
  
  // Simple hash function (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
  }
  return Math.abs(hash).toString(36);
}

/**
 * Compute context hash for context-sensitive caching
 */
export function computeContextHash(context: CacheContext): string {
  const parts = [
    context.gradeLevel?.toString() || '',
    context.subjectName || '',
    context.templateName || '',
    context.chapterId || '',
  ];
  return computeQueryHash(parts.join('|'));
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

/**
 * Get TTL based on template/content type
 */
export function getTTLForTemplate(templateName: string): number {
  if (templateName.includes('quiz') || templateName.includes('question')) {
    return TTL_CONFIG.quiz_generation;
  }
  if (templateName.includes('career') || templateName.includes('salary') || templateName.includes('institution')) {
    return TTL_CONFIG.career_info;
  }
  if (templateName.includes('study') || templateName.includes('tip')) {
    return TTL_CONFIG.study_tips;
  }
  if (templateName.includes('moderat')) {
    return TTL_CONFIG.content_moderation;
  }
  if (templateName.includes('recommend') || templateName.includes('personal')) {
    return TTL_CONFIG.personalized_recommendations;
  }
  return TTL_CONFIG.general;
}

/**
 * Get cost estimate for model
 */
function getModelCost(modelName: string): number {
  for (const [key, cost] of Object.entries(COST_PER_CALL)) {
    if (modelName.toLowerCase().includes(key)) {
      return cost;
    }
  }
  return COST_PER_CALL.default;
}

/**
 * Check cache for existing response
 */
export async function getCachedResponse(
  query: string,
  context?: CacheContext
): Promise<CacheResult> {
  const startTime = Date.now();
  const normalizedQuery = normalizeQuery(query);
  const queryHash = computeQueryHash(normalizedQuery, context);

  try {
    // Try exact match first
    const { data: exactMatch, error } = await supabase
      .from('ai_response_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .single();

    if (!error && exactMatch) {
      // Check if not expired
      const createdAt = new Date(exactMatch.created_at).getTime();
      const ttlMs = exactMatch.ttl_seconds * 1000;
      
      if (Date.now() - createdAt < ttlMs) {
        // Update hit count and last accessed
        await supabase
          .from('ai_response_cache')
          .update({ 
            hit_count: exactMatch.hit_count + 1,
            last_accessed: new Date().toISOString()
          })
          .eq('id', exactMatch.id);

        // Track cache hit
        await trackCacheMetric(context?.templateName, true, Date.now() - startTime);

        return {
          hit: true,
          data: exactMatch.response_json,
          latencyMs: Date.now() - startTime,
          source: 'cache',
        };
      }
    }

    // Try fuzzy match for similar queries (within edit distance 3)
    if (context?.templateName) {
      const { data: similarMatches } = await supabase
        .from('ai_response_cache')
        .select('*')
        .eq('template_name', context.templateName)
        .limit(20);

      if (similarMatches) {
        for (const match of similarMatches) {
          const distance = levenshteinDistance(normalizedQuery, match.normalized_query);
          if (distance <= 3) {
            // Check expiry
            const createdAt = new Date(match.created_at).getTime();
            const ttlMs = match.ttl_seconds * 1000;
            
            if (Date.now() - createdAt < ttlMs) {
              // Update hit count
              await supabase
                .from('ai_response_cache')
                .update({ 
                  hit_count: match.hit_count + 1,
                  last_accessed: new Date().toISOString()
                })
                .eq('id', match.id);

              await trackCacheMetric(context?.templateName, true, Date.now() - startTime);

              return {
                hit: true,
                data: match.response_json,
                latencyMs: Date.now() - startTime,
                source: 'cache',
              };
            }
          }
        }
      }
    }

    // Track cache miss
    await trackCacheMetric(context?.templateName, false, Date.now() - startTime, 'no_match');

    return {
      hit: false,
      latencyMs: Date.now() - startTime,
      source: 'fresh',
    };
  } catch (err) {
    console.error('Cache lookup error:', err);
    return {
      hit: false,
      latencyMs: Date.now() - startTime,
      source: 'fresh',
    };
  }
}

/**
 * Store response in cache
 */
export async function cacheResponse(
  query: string,
  response: any,
  modelUsed: string,
  context?: CacheContext,
  responseTimeMs?: number
): Promise<void> {
  // Don't cache moderation responses
  if (context?.templateName?.includes('moderat')) {
    return;
  }

  const normalizedQuery = normalizeQuery(query);
  const queryHash = computeQueryHash(normalizedQuery, context);
  const contextHash = context ? computeContextHash(context) : null;
  const ttl = context?.templateName ? getTTLForTemplate(context.templateName) : TTL_CONFIG.general;
  const cost = getModelCost(modelUsed);

  // Generate cache tags for invalidation
  const cacheTags: string[] = [];
  if (context?.subjectName) cacheTags.push(`subject_${context.subjectName.toLowerCase().replace(/\s+/g, '_')}`);
  if (context?.chapterId) cacheTags.push(`chapter_${context.chapterId}`);
  if (context?.templateName) cacheTags.push(`template_${context.templateName}`);
  if (context?.gradeLevel) cacheTags.push(`grade_${context.gradeLevel}`);

  try {
    await supabase
      .from('ai_response_cache')
      .upsert({
        query_hash: queryHash,
        query_text: query,
        normalized_query: normalizedQuery,
        response_json: response,
        model_used: modelUsed,
        context_hash: contextHash,
        template_name: context?.templateName,
        grade_level: context?.gradeLevel,
        subject_name: context?.subjectName,
        ttl_seconds: ttl,
        cache_tags: cacheTags,
        generation_cost_cents: cost,
        response_time_ms: responseTimeMs,
        hit_count: 0,
        last_accessed: new Date().toISOString(),
      }, {
        onConflict: 'query_hash',
      });
  } catch (err) {
    console.error('Failed to cache response:', err);
  }
}

/**
 * Track cache metrics for performance monitoring
 */
async function trackCacheMetric(
  templateName: string | undefined,
  isHit: boolean,
  latencyMs: number,
  missReason?: string
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const template = templateName || 'unknown';

  try {
    // Get existing metrics
    const { data: existing } = await supabase
      .from('ai_cache_metrics')
      .select('*')
      .eq('metric_date', today)
      .eq('template_name', template)
      .single();

    if (existing) {
      const missReasons = (existing.miss_reasons as Record<string, number>) || {};
      if (missReason) {
        missReasons[missReason] = (missReasons[missReason] || 0) + 1;
      }

      await supabase
        .from('ai_cache_metrics')
        .update({
          total_requests: existing.total_requests + 1,
          cache_hits: existing.cache_hits + (isHit ? 1 : 0),
          cache_misses: existing.cache_misses + (isHit ? 0 : 1),
          avg_cached_latency_ms: isHit 
            ? ((existing.avg_cached_latency_ms || 0) * existing.cache_hits + latencyMs) / (existing.cache_hits + 1)
            : existing.avg_cached_latency_ms,
          avg_fresh_latency_ms: !isHit
            ? ((existing.avg_fresh_latency_ms || 0) * existing.cache_misses + latencyMs) / (existing.cache_misses + 1)
            : existing.avg_fresh_latency_ms,
          miss_reasons: missReasons,
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('ai_cache_metrics')
        .insert({
          metric_date: today,
          template_name: template,
          total_requests: 1,
          cache_hits: isHit ? 1 : 0,
          cache_misses: isHit ? 0 : 1,
          avg_cached_latency_ms: isHit ? latencyMs : null,
          avg_fresh_latency_ms: !isHit ? latencyMs : null,
          miss_reasons: missReason ? { [missReason]: 1 } : {},
        });
    }
  } catch (err) {
    console.error('Failed to track cache metric:', err);
  }
}

/**
 * Invalidate cache entries by tags
 */
export async function invalidateCacheByTags(tags: string[]): Promise<number> {
  try {
    const { data } = await supabase
      .rpc('invalidate_cache_by_tags', { tags });
    return data || 0;
  } catch (err) {
    console.error('Cache invalidation error:', err);
    return 0;
  }
}

/**
 * Clean up expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const { data } = await supabase.rpc('cleanup_expired_cache');
    return data || 0;
  } catch (err) {
    console.error('Cache cleanup error:', err);
    return 0;
  }
}

/**
 * Evict LRU entries when cache is full
 */
export async function evictLRUCache(maxEntries: number = 100000): Promise<number> {
  try {
    const { data } = await supabase.rpc('evict_lru_cache', { max_entries: maxEntries });
    return data || 0;
  } catch (err) {
    console.error('LRU eviction error:', err);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(days: number = 7): Promise<{
  totalRequests: number;
  hitRate: number;
  avgLatencyImprovement: number;
  estimatedSavings: number;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: metrics } = await supabase
      .from('ai_cache_metrics')
      .select('*')
      .gte('metric_date', startDate.toISOString().split('T')[0]);

    if (!metrics?.length) {
      return { totalRequests: 0, hitRate: 0, avgLatencyImprovement: 0, estimatedSavings: 0 };
    }

    const totals = metrics.reduce((acc, m) => ({
      requests: acc.requests + m.total_requests,
      hits: acc.hits + m.cache_hits,
      cachedLatency: acc.cachedLatency + (m.avg_cached_latency_ms || 0) * m.cache_hits,
      freshLatency: acc.freshLatency + (m.avg_fresh_latency_ms || 0) * m.cache_misses,
      savings: acc.savings + (m.estimated_cost_saved_cents || 0),
    }), { requests: 0, hits: 0, cachedLatency: 0, freshLatency: 0, savings: 0 });

    const hitRate = totals.requests > 0 ? (totals.hits / totals.requests) * 100 : 0;
    const avgCached = totals.hits > 0 ? totals.cachedLatency / totals.hits : 0;
    const avgFresh = (totals.requests - totals.hits) > 0 ? totals.freshLatency / (totals.requests - totals.hits) : 0;

    return {
      totalRequests: totals.requests,
      hitRate: Math.round(hitRate * 100) / 100,
      avgLatencyImprovement: avgFresh - avgCached,
      estimatedSavings: totals.savings,
    };
  } catch (err) {
    console.error('Failed to get cache stats:', err);
    return { totalRequests: 0, hitRate: 0, avgLatencyImprovement: 0, estimatedSavings: 0 };
  }
}

/**
 * Higher-order function to wrap AI calls with caching
 */
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getQuery: (...args: T) => string,
  getContext: (...args: T) => CacheContext | undefined,
  modelName: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const query = getQuery(...args);
    const context = getContext(...args);

    // Check cache first
    const cacheResult = await getCachedResponse(query, context);
    if (cacheResult.hit && cacheResult.data) {
      console.log(`Cache hit for ${context?.templateName || 'query'} (${cacheResult.latencyMs}ms)`);
      return cacheResult.data as R;
    }

    // Execute the actual function
    const startTime = Date.now();
    const result = await fn(...args);
    const responseTime = Date.now() - startTime;

    // Cache the result
    await cacheResponse(query, result, modelName, context, responseTime);
    
    console.log(`Cache miss for ${context?.templateName || 'query'} - stored (${responseTime}ms)`);
    return result;
  };
}
