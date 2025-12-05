import { useState, useEffect, useCallback } from 'react';

interface PreloadedImage {
  src: string;
  loaded: boolean;
  error: boolean;
}

interface UseImagePreloadResult {
  preloadImages: (urls: string[]) => void;
  preloadImage: (url: string) => Promise<void>;
  isLoaded: (url: string) => boolean;
  getLoadedCount: () => number;
  getTotalCount: () => number;
  progress: number;
}

// Global cache for preloaded images
const imageCache = new Map<string, PreloadedImage>();

export function useImagePreload(): UseImagePreloadResult {
  const [, forceUpdate] = useState({});

  const preloadImage = useCallback(async (url: string): Promise<void> => {
    if (imageCache.has(url) && imageCache.get(url)!.loaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      imageCache.set(url, { src: url, loaded: false, error: false });

      img.onload = () => {
        imageCache.set(url, { src: url, loaded: true, error: false });
        forceUpdate({});
        resolve();
      };

      img.onerror = () => {
        imageCache.set(url, { src: url, loaded: false, error: true });
        forceUpdate({});
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }, []);

  const preloadImages = useCallback((urls: string[]) => {
    urls.forEach(url => {
      if (!imageCache.has(url)) {
        preloadImage(url).catch(() => {
          // Silently handle errors - they're tracked in cache
        });
      }
    });
  }, [preloadImage]);

  const isLoaded = useCallback((url: string): boolean => {
    const cached = imageCache.get(url);
    return cached?.loaded ?? false;
  }, []);

  const getLoadedCount = useCallback((): number => {
    return Array.from(imageCache.values()).filter(img => img.loaded).length;
  }, []);

  const getTotalCount = useCallback((): number => {
    return imageCache.size;
  }, []);

  const progress = imageCache.size > 0
    ? (getLoadedCount() / getTotalCount()) * 100
    : 0;

  return {
    preloadImages,
    preloadImage,
    isLoaded,
    getLoadedCount,
    getTotalCount,
    progress,
  };
}

// Preload critical images on app start
export function preloadCriticalImages(urls: string[]): void {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

export default useImagePreload;
