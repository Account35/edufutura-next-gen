/**
 * Multi-layer caching service for EduFutura
 * Provides localStorage, IndexedDB, and memory caching with TTL support
 */

// Cache configuration with type-specific TTLs
export const CACHE_CONFIG = {
  // Reference data (rarely changes)
  subjects: { ttl: 24 * 60 * 60 * 1000, storage: 'local' as const }, // 24 hours
  chapters: { ttl: 24 * 60 * 60 * 1000, storage: 'local' as const }, // 24 hours
  certificateTemplates: { ttl: 7 * 24 * 60 * 60 * 1000, storage: 'indexed' as const }, // 7 days
  
  // User-specific data (shorter TTL)
  userPreferences: { ttl: 60 * 60 * 1000, storage: 'local' as const }, // 1 hour
  userProgress: { ttl: 5 * 60 * 1000, storage: 'memory' as const }, // 5 minutes
  dashboardData: { ttl: 5 * 60 * 1000, storage: 'memory' as const }, // 5 minutes
  
  // Community data
  forums: { ttl: 5 * 60 * 1000, storage: 'memory' as const }, // 5 minutes
  
  // Career data
  institutions: { ttl: 24 * 60 * 60 * 1000, storage: 'indexed' as const }, // 24 hours
  careers: { ttl: 24 * 60 * 60 * 1000, storage: 'indexed' as const }, // 24 hours
} as const;

type CacheKey = keyof typeof CACHE_CONFIG;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
}

// Current cache version - increment when cache schema changes
const CACHE_VERSION = '1.0.0';
const CACHE_PREFIX = 'edufutura_cache_';
const MAX_CACHE_SIZE_MB = 50;

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Get item from appropriate cache layer
 */
export async function getCached<T>(
  key: CacheKey,
  subKey?: string
): Promise<T | null> {
  const fullKey = subKey ? `${key}_${subKey}` : key;
  const config = CACHE_CONFIG[key];
  
  try {
    let entry: CacheEntry<T> | null = null;
    
    // Check memory cache first (fastest)
    if (memoryCache.has(fullKey)) {
      entry = memoryCache.get(fullKey) as CacheEntry<T>;
    }
    // Check localStorage
    else if (config.storage === 'local') {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${fullKey}`);
      if (stored) {
        entry = JSON.parse(stored) as CacheEntry<T>;
        // Also store in memory for faster subsequent access
        memoryCache.set(fullKey, entry);
      }
    }
    // Check IndexedDB
    else if (config.storage === 'indexed') {
      const { get } = await import('idb-keyval');
      entry = await get<CacheEntry<T>>(`${CACHE_PREFIX}${fullKey}`);
      if (entry) {
        memoryCache.set(fullKey, entry);
      }
    }
    
    // Validate entry
    if (entry) {
      // Check version
      if (entry.version !== CACHE_VERSION) {
        await clearCacheEntry(key, subKey);
        return null;
      }
      
      // Check expiration
      if (Date.now() > entry.expiresAt) {
        await clearCacheEntry(key, subKey);
        return null;
      }
      
      return entry.data;
    }
    
    return null;
  } catch (error) {
    console.error(`Cache read error for ${fullKey}:`, error);
    return null;
  }
}

/**
 * Set item in appropriate cache layer
 */
export async function setCached<T>(
  key: CacheKey,
  data: T,
  subKey?: string
): Promise<void> {
  const fullKey = subKey ? `${key}_${subKey}` : key;
  const config = CACHE_CONFIG[key];
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + config.ttl,
    version: CACHE_VERSION,
  };
  
  try {
    // Always store in memory
    memoryCache.set(fullKey, entry);
    
    // Persist based on storage type
    if (config.storage === 'local') {
      const serialized = JSON.stringify(entry);
      // Check size before storing
      if (serialized.length < 5 * 1024 * 1024) { // 5MB limit per item
        localStorage.setItem(`${CACHE_PREFIX}${fullKey}`, serialized);
      }
    } else if (config.storage === 'indexed') {
      const { set } = await import('idb-keyval');
      await set(`${CACHE_PREFIX}${fullKey}`, entry);
    }
  } catch (error) {
    console.error(`Cache write error for ${fullKey}:`, error);
    // If storage fails (e.g., quota exceeded), try cleanup
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      await cleanupCache();
      // Retry once
      try {
        if (config.storage === 'local') {
          localStorage.setItem(`${CACHE_PREFIX}${fullKey}`, JSON.stringify(entry));
        }
      } catch {
        console.warn('Cache storage failed after cleanup');
      }
    }
  }
}

/**
 * Clear a specific cache entry
 */
export async function clearCacheEntry(
  key: CacheKey,
  subKey?: string
): Promise<void> {
  const fullKey = subKey ? `${key}_${subKey}` : key;
  const config = CACHE_CONFIG[key];
  
  memoryCache.delete(fullKey);
  
  if (config.storage === 'local') {
    localStorage.removeItem(`${CACHE_PREFIX}${fullKey}`);
  } else if (config.storage === 'indexed') {
    const { del } = await import('idb-keyval');
    await del(`${CACHE_PREFIX}${fullKey}`);
  }
}

/**
 * Clear all caches for a specific type
 */
export async function clearCacheType(key: CacheKey): Promise<void> {
  const config = CACHE_CONFIG[key];
  
  // Clear memory cache entries
  for (const [cacheKey] of memoryCache) {
    if (cacheKey.startsWith(key)) {
      memoryCache.delete(cacheKey);
    }
  }
  
  if (config.storage === 'local') {
    for (const storageKey of Object.keys(localStorage)) {
      if (storageKey.startsWith(`${CACHE_PREFIX}${key}`)) {
        localStorage.removeItem(storageKey);
      }
    }
  } else if (config.storage === 'indexed') {
    const { keys, del } = await import('idb-keyval');
    const allKeys = await keys();
    for (const idbKey of allKeys) {
      if (typeof idbKey === 'string' && idbKey.startsWith(`${CACHE_PREFIX}${key}`)) {
        await del(idbKey);
      }
    }
  }
}

/**
 * Clear all application caches
 */
export async function clearAllCaches(): Promise<void> {
  // Clear memory cache
  memoryCache.clear();
  
  // Clear localStorage cache
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
  
  // Clear IndexedDB cache
  try {
    const { clear } = await import('idb-keyval');
    await clear();
  } catch (error) {
    console.error('Failed to clear IndexedDB cache:', error);
  }
}

/**
 * Cleanup expired entries and enforce size limits
 */
export async function cleanupCache(): Promise<number> {
  let cleaned = 0;
  const now = Date.now();
  
  // Cleanup memory cache
  for (const [key, entry] of memoryCache) {
    if (now > (entry as CacheEntry<unknown>).expiresAt) {
      memoryCache.delete(key);
      cleaned++;
    }
  }
  
  // Cleanup localStorage
  const localEntries: Array<{ key: string; entry: CacheEntry<unknown>; size: number }> = [];
  let totalSize = 0;
  
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_PREFIX)) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const entry = JSON.parse(value) as CacheEntry<unknown>;
          const size = value.length;
          totalSize += size;
          
          // Remove expired
          if (now > entry.expiresAt || entry.version !== CACHE_VERSION) {
            localStorage.removeItem(key);
            cleaned++;
          } else {
            localEntries.push({ key, entry, size });
          }
        } catch {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    }
  }
  
  // Enforce size limit using LRU eviction
  const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
  if (totalSize > maxBytes) {
    // Sort by timestamp (oldest first)
    localEntries.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
    
    let currentSize = totalSize;
    for (const { key, size } of localEntries) {
      if (currentSize <= maxBytes * 0.8) break; // Target 80% of max
      localStorage.removeItem(key);
      currentSize -= size;
      cleaned++;
    }
  }
  
  // Cleanup IndexedDB
  try {
    const { keys, get, del } = await import('idb-keyval');
    const allKeys = await keys();
    
    for (const idbKey of allKeys) {
      if (typeof idbKey === 'string' && idbKey.startsWith(CACHE_PREFIX)) {
        const entry = await get<CacheEntry<unknown>>(idbKey);
        if (entry && (now > entry.expiresAt || entry.version !== CACHE_VERSION)) {
          await del(idbKey);
          cleaned++;
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup IndexedDB cache:', error);
  }
  
  return cleaned;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  memoryEntries: number;
  localStorageEntries: number;
  localStorageSize: number;
  indexedDBEntries: number;
}> {
  let localStorageEntries = 0;
  let localStorageSize = 0;
  
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(CACHE_PREFIX)) {
      localStorageEntries++;
      localStorageSize += (localStorage.getItem(key)?.length || 0) * 2; // UTF-16
    }
  }
  
  let indexedDBEntries = 0;
  try {
    const { keys } = await import('idb-keyval');
    const allKeys = await keys();
    indexedDBEntries = allKeys.filter(
      k => typeof k === 'string' && k.startsWith(CACHE_PREFIX)
    ).length;
  } catch {
    // IndexedDB not available
  }
  
  return {
    memoryEntries: memoryCache.size,
    localStorageEntries,
    localStorageSize,
    indexedDBEntries,
  };
}

/**
 * Preload critical data into cache
 */
export async function preloadCache(userId?: string): Promise<void> {
  // Import supabase dynamically to avoid circular deps
  const { supabase } = await import('@/integrations/supabase/client');
  
  // Preload subjects
  const cachedSubjects = await getCached('subjects');
  if (!cachedSubjects) {
    const { data: subjects } = await supabase
      .from('curriculum_subjects')
      .select('id, subject_name, description, icon_name, color_scheme, grade_level, total_chapters, estimated_hours, caps_aligned')
      .eq('is_published', true)
      .order('subject_name');
    
    if (subjects) {
      await setCached('subjects', subjects);
    }
  }
  
  // Preload user-specific data if logged in
  if (userId) {
    const cachedPrefs = await getCached('userPreferences', userId);
    if (!cachedPrefs) {
      const { data: prefs } = await supabase
        .from('study_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (prefs) {
        await setCached('userPreferences', prefs, userId);
      }
    }
  }
}

// Schedule periodic cleanup
if (typeof window !== 'undefined') {
  // Cleanup on page load after a delay
  setTimeout(() => {
    cleanupCache().then(cleaned => {
      if (cleaned > 0) {
        console.log(`[Cache] Cleaned up ${cleaned} expired entries`);
      }
    });
  }, 10000); // 10 seconds after load
  
  // Periodic cleanup every hour
  setInterval(() => {
    cleanupCache();
  }, 60 * 60 * 1000);
}
