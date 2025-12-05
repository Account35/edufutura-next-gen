import { useCallback } from 'react';

// Prefetch route modules on hover for faster navigation
const routeModules: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/Dashboard'),
  '/subjects': () => import('@/pages/SubjectBrowser'),
  '/profile': () => import('@/pages/Profile'),
  '/settings': () => import('@/pages/Settings'),
  '/bookmarks': () => import('@/pages/Bookmarks'),
  '/analytics': () => import('@/pages/Analytics'),
  '/community/forums': () => import('@/pages/Forums'),
  '/community/resources': () => import('@/pages/Resources'),
  '/community/study-buddies': () => import('@/pages/StudyBuddyFinder'),
  '/community/leaderboard': () => import('@/pages/Leaderboard'),
  '/career-guidance/universities': () => import('@/pages/Universities'),
  '/career-guidance/quiz': () => import('@/pages/CareerQuiz'),
  '/certificates': () => import('@/pages/Certificates'),
};

// Cache for prefetched modules
const prefetchedRoutes = new Set<string>();

export const usePrefetch = () => {
  const prefetchRoute = useCallback((path: string) => {
    // Normalize path
    const normalizedPath = path.split('?')[0].split('#')[0];
    
    // Check if already prefetched
    if (prefetchedRoutes.has(normalizedPath)) {
      return;
    }
    
    // Find matching module
    const moduleLoader = routeModules[normalizedPath];
    if (moduleLoader) {
      prefetchedRoutes.add(normalizedPath);
      // Load module in background
      moduleLoader().catch(() => {
        // Remove from cache if failed so it can retry
        prefetchedRoutes.delete(normalizedPath);
      });
    }
  }, []);

  const onHoverPrefetch = useCallback((path: string) => {
    return {
      onMouseEnter: () => prefetchRoute(path),
      onFocus: () => prefetchRoute(path),
    };
  }, [prefetchRoute]);

  return { prefetchRoute, onHoverPrefetch };
};

// Utility to prefetch multiple routes
export const prefetchRoutes = (paths: string[]) => {
  paths.forEach(path => {
    const normalizedPath = path.split('?')[0].split('#')[0];
    if (prefetchedRoutes.has(normalizedPath)) return;
    
    const moduleLoader = routeModules[normalizedPath];
    if (moduleLoader) {
      prefetchedRoutes.add(normalizedPath);
      moduleLoader().catch(() => {
        prefetchedRoutes.delete(normalizedPath);
      });
    }
  });
};

export default usePrefetch;
