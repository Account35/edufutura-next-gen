import { useState, useEffect } from 'react';

const CACHE_PREFIX = 'edufutura_offline_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedData<T> {
  data: T;
  timestamp: number;
  saved: boolean;
}

export function useOfflineCache<T>(key: string, fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [key, isOnline]);

  const loadData = async () => {
    setLoading(true);
    const cacheKey = `${CACHE_PREFIX}${key}`;

    try {
      // Try to load from cache first
      const cachedItem = localStorage.getItem(cacheKey);
      if (cachedItem) {
        const cached: CachedData<T> = JSON.parse(cachedItem);
        const isExpired = Date.now() - cached.timestamp > CACHE_EXPIRY;

        if (!isExpired) {
          setData(cached.data);
          setIsCached(true);

          // If online, fetch fresh data in background
          if (isOnline) {
            try {
              const freshData = await fetchFn();
              setData(freshData);
              saveToCache(freshData);
            } catch (error) {
              console.warn('Failed to fetch fresh data, using cache:', error);
            }
          }
          setLoading(false);
          return;
        }
      }

      // If online, fetch fresh data
      if (isOnline) {
        const freshData = await fetchFn();
        setData(freshData);
        saveToCache(freshData);
        setIsCached(false);
      } else if (cachedItem) {
        // Offline and have cache, use expired cache
        const cached: CachedData<T> = JSON.parse(cachedItem);
        setData(cached.data);
        setIsCached(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToCache = (dataToCache: T) => {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached: CachedData<T> = {
      data: dataToCache,
      timestamp: Date.now(),
      saved: true,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  };

  const clearCache = () => {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    localStorage.removeItem(cacheKey);
    setIsCached(false);
  };

  return { data, loading, isCached, isOnline, clearCache, refresh: loadData };
}
