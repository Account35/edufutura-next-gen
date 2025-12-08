/**
 * Enhanced React Query client with persistence and optimized caching
 */

import { QueryClient } from '@tanstack/react-query';

// Query key factory for consistent cache keys
export const queryKeys = {
  // User & Auth
  user: (userId: string): string[] => ['user', userId],
  userProgress: (userId: string, subject?: string): string[] => 
    subject ? ['userProgress', userId, subject] : ['userProgress', userId],
  userPreferences: (userId: string): string[] => ['userPreferences', userId],
  
  // Curriculum
  subjects: (): string[] => ['subjects'],
  chapters: (subjectId: string): string[] => ['chapters', subjectId],
  chapter: (chapterId: string): string[] => ['chapter', chapterId],
  chapterContent: (subjectName: string, chapterNumber: string): string[] => 
    ['chapterContent', subjectName, chapterNumber],
  
  // Quizzes
  quizzes: (subjectId?: string): string[] => 
    subjectId ? ['quizzes', subjectId] : ['quizzes'],
  quiz: (quizId: string): string[] => ['quiz', quizId],
  quizAttempts: (userId: string, quizId?: string): string[] => 
    quizId ? ['quizAttempts', userId, quizId] : ['quizAttempts', userId],
  
  // Community
  forums: (): string[] => ['forums'],
  forumPosts: (forumId: string): string[] => ['forumPosts', forumId],
  post: (postId: string): string[] => ['post', postId],
  resources: (filters?: object): (string | object | undefined)[] => ['resources', filters],
  studyGroups: (userId?: string): string[] => 
    userId ? ['studyGroups', userId] : ['studyGroups'],
  
  // Career
  institutions: (filters?: object): (string | object | undefined)[] => ['institutions', filters],
  careers: (filters?: object): (string | object | undefined)[] => ['careers', filters],
  careerRecommendations: (userId: string): string[] => ['careerRecommendations', userId],
  
  // Notifications
  notifications: (userId: string): string[] => ['notifications', userId],
  notificationPreferences: (userId: string): string[] => ['notificationPreferences', userId],
  
  // Achievements & Certificates
  achievements: (userId: string): string[] => ['achievements', userId],
  certificates: (userId: string): string[] => ['certificates', userId],
  
  // Activity
  activityFeed: (userId: string): string[] => ['activityFeed', userId],
  
  // Analytics
  analytics: (userId: string, subject?: string): string[] => 
    subject ? ['analytics', userId, subject] : ['analytics', userId],
};

// Stale time configurations for different data types
export const staleTimeConfig = {
  // Static/reference data - rarely changes
  subjects: 24 * 60 * 60 * 1000, // 24 hours
  chapters: 24 * 60 * 60 * 1000, // 24 hours
  institutions: 24 * 60 * 60 * 1000, // 24 hours
  careers: 24 * 60 * 60 * 1000, // 24 hours
  
  // User data - moderate freshness
  userProgress: 5 * 60 * 1000, // 5 minutes
  userPreferences: 30 * 60 * 1000, // 30 minutes
  achievements: 15 * 60 * 1000, // 15 minutes
  certificates: 30 * 60 * 1000, // 30 minutes
  
  // Dynamic data - needs to be fresh
  notifications: 60 * 1000, // 1 minute
  forums: 2 * 60 * 1000, // 2 minutes
  forumPosts: 2 * 60 * 1000, // 2 minutes
  resources: 5 * 60 * 1000, // 5 minutes
  
  // Real-time data - minimal caching
  chat: 0, // No caching
  studyGroups: 30 * 1000, // 30 seconds
} as const;

// Create optimized query client
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes default
        gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('40')) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

// Helper to get stale time for a query key
export function getStaleTime(queryKey: readonly unknown[]): number {
  const keyType = queryKey[0] as string;
  return (staleTimeConfig as Record<string, number>)[keyType] ?? 5 * 60 * 1000;
}

// Prefetch helper for route transitions
export async function prefetchForRoute(
  queryClient: QueryClient,
  route: string,
  userId?: string
): Promise<void> {
  // Dynamically import to avoid circular deps
  const supabaseModule = await import('@/integrations/supabase/client');
  const supabase = supabaseModule.supabase;
  
  // Type-safe fetch functions with explicit any to avoid deep type inference
  const fetchSubjects = async () => {
    const result = await supabase
      .from('curriculum_subjects')
      .select('id, subject_name, description, icon_name, color_scheme, grade_level')
      .eq('is_published', true)
      .order('subject_name');
    return result.data ?? [];
  };
  
  const fetchChapters = async () => {
    const result = await supabase
      .from('curriculum_chapters')
      .select('id, chapter_title, chapter_number, subject_id')
      .eq('is_published', true)
      .order('chapter_number');
    return result.data ?? [];
  };
  
  const fetchUserProgress = async (uid: string) => {
    const result = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', uid);
    return result.data ?? [];
  };
  
  // Always prefetch subjects if not cached
  if (!queryClient.getQueryData(['subjects'])) {
    void queryClient.prefetchQuery({
      queryKey: ['subjects'],
      queryFn: fetchSubjects,
      staleTime: staleTimeConfig.subjects,
    });
  }
  
  // Route-specific prefetching
  if (route.startsWith('/curriculum/') && route.split('/').length > 2) {
    const subjectName = route.split('/')[2];
    void queryClient.prefetchQuery({
      queryKey: ['chapters', subjectName],
      queryFn: fetchChapters,
      staleTime: staleTimeConfig.chapters,
    });
  }
  
  // Prefetch user-specific data
  if (userId && (route === '/dashboard' || route === '/profile')) {
    void queryClient.prefetchQuery({
      queryKey: ['userProgress', userId],
      queryFn: () => fetchUserProgress(userId),
      staleTime: staleTimeConfig.userProgress,
    });
  }
}

// Invalidation helpers for mutations
export const invalidationHelpers = {
  onUserProgressChange: (queryClient: QueryClient, userId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.userProgress(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.activityFeed(userId) });
  },
  
  onQuizComplete: (queryClient: QueryClient, userId: string, _quizId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.quizAttempts(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.userProgress(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics(userId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.achievements(userId) });
  },
  
  onForumPost: (queryClient: QueryClient, forumId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.forumPosts(forumId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.forums() });
  },
  
  onNotificationRead: (queryClient: QueryClient, userId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
  },
};

export default createQueryClient;
