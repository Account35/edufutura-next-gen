import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformStats {
  totalUsers: number;
  activeToday: number;
  newThisWeek: number;
  premiumSubscribers: number;
  activeQuizzes: number;
  totalChapters: number;
  pendingReviews: number;
  totalForumPosts: number;
}

interface EngagementMetrics {
  dailyActiveUsers: { date: string; count: number }[];
  quizCompletionRate: number;
  averageSessionMinutes: number;
}

interface SystemHealth {
  databaseConnected: boolean;
  storageUsagePercent: number;
  lastBackup: string | null;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeToday: 0,
    newThisWeek: 0,
    premiumSubscribers: 0,
    activeQuizzes: 0,
    totalChapters: 0,
    pendingReviews: 0,
    totalForumPosts: 0
  });
  const [engagement, setEngagement] = useState<EngagementMetrics>({
    dailyActiveUsers: [],
    quizCompletionRate: 0,
    averageSessionMinutes: 0
  });
  const [health, setHealth] = useState<SystemHealth>({
    databaseConnected: true,
    storageUsagePercent: 0,
    lastBackup: null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all stats in parallel
        const [
          usersResult,
          activeResult,
          newUsersResult,
          premiumResult,
          quizzesResult,
          chaptersResult,
          moderationResult,
          forumResult,
          totalAttemptsResult,
          completedAttemptsResult,
        ] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('activity_log').select('user_id', { count: 'exact', head: true }).gte('created_at', todayStart),
          supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
          supabase.from('users').select('id', { count: 'exact', head: true }).eq('account_type', 'premium').eq('subscription_status', 'active'),
          supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('is_published', true),
          supabase.from('curriculum_chapters').select('id', { count: 'exact', head: true }).eq('is_published', true),
          supabase.from('content_moderation_log').select('id', { count: 'exact', head: true }).eq('reviewed', false),
          supabase.from('forum_posts').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }),
          supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }).eq('is_completed', true),
        ]);

        setStats({
          totalUsers: usersResult.count || 0,
          activeToday: activeResult.count || 0,
          newThisWeek: newUsersResult.count || 0,
          premiumSubscribers: premiumResult.count || 0,
          activeQuizzes: quizzesResult.count || 0,
          totalChapters: chaptersResult.count || 0,
          pendingReviews: moderationResult.count || 0,
          totalForumPosts: forumResult.count || 0,
        });

        const completionRate = totalAttemptsResult.count && totalAttemptsResult.count > 0
          ? Math.round(((completedAttemptsResult.count || 0) / totalAttemptsResult.count) * 100)
          : 0;

        // Get daily active users for last 7 days (parallelized to avoid request waterfall)
        const dauDays = Array.from({ length: 7 }, (_, idx) => {
          const i = 6 - idx;
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
          const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString();
          return {
            label: date.toLocaleDateString('en-ZA', { weekday: 'short' }),
            dayStart,
            dayEnd,
          };
        });

        const dauCounts = await Promise.all(
          dauDays.map(({ dayStart, dayEnd }) =>
            supabase
              .from('activity_log')
              .select('user_id', { count: 'exact', head: true })
              .gte('created_at', dayStart)
              .lt('created_at', dayEnd)
          )
        );

        const dau = dauDays.map((d, idx) => ({
          date: d.label,
          count: dauCounts[idx].count || 0,
        }));

        setEngagement({
          dailyActiveUsers: dau,
          quizCompletionRate: completionRate,
          averageSessionMinutes: 15 // Placeholder - would need session tracking
        });

        setHealth({
          databaseConnected: true,
          storageUsagePercent: 25, // Placeholder
          lastBackup: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setHealth(prev => ({ ...prev, databaseConnected: false }));
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, engagement, health, loading };
};
