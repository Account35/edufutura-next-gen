import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformStats {
  totalUsers: number;
  activeToday: number;
  newUsersThisWeek: number;
  premiumUsers: number;
  conversionRate: number;
  monthlyRevenue: number;
  churnRate: number;
  avgSessionDuration: number;
  quizCompletionRate: number;
}

export interface UserGrowthData {
  date: string;
  registrations: number;
  freeUsers: number;
  premiumUsers: number;
}

export interface EngagementData {
  feature: string;
  uniqueUsers: number;
  percentage: number;
}

export interface RevenueData {
  date: string;
  revenue: number;
  subscriptions: number;
  cancellations: number;
}

export interface SubjectStats {
  subjectName: string;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  uniqueStudents: number;
}

export interface ProvinceStats {
  province: string;
  users: number;
  avgEngagement: number;
}

export const useAdminAnalytics = (dateRange: { start: Date; end: Date }) => {
  const { toast } = useToast();
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [userGrowth, setUserGrowth] = useState<UserGrowthData[]>([]);
  const [engagement, setEngagement] = useState<EngagementData[]>([]);
  const [revenue, setRevenue] = useState<RevenueData[]>([]);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);
  const [provinceStats, setProvinceStats] = useState<ProvinceStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch user counts
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: activeToday } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_login_at', today.toISOString());

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: newUsersThisWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: premiumUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('account_type', 'premium');

      // Quiz completion stats
      const { count: totalAttempts } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true });

      const { count: completedAttempts } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', true);

      const quizCompletionRate = totalAttempts && totalAttempts > 0 
        ? ((completedAttempts || 0) / totalAttempts) * 100 
        : 0;

      setPlatformStats({
        totalUsers: totalUsers || 0,
        activeToday: activeToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        premiumUsers: premiumUsers || 0,
        conversionRate: totalUsers && totalUsers > 0 ? ((premiumUsers || 0) / totalUsers) * 100 : 0,
        monthlyRevenue: (premiumUsers || 0) * 60, // R60/month
        churnRate: 0, // Would calculate from subscription_history
        avgSessionDuration: 0, // Would calculate from activity_log
        quizCompletionRate,
      });

      // Fetch user growth data
      const { data: growthData } = await supabase
        .from('users')
        .select('created_at, account_type')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at');

      if (growthData) {
        const growthMap = new Map<string, { free: number; premium: number }>();
        growthData.forEach((user: any) => {
          const date = new Date(user.created_at).toISOString().split('T')[0];
          const existing = growthMap.get(date) || { free: 0, premium: 0 };
          if (user.account_type === 'premium') {
            existing.premium++;
          } else {
            existing.free++;
          }
          growthMap.set(date, existing);
        });

        setUserGrowth(Array.from(growthMap.entries()).map(([date, counts]) => ({
          date,
          registrations: counts.free + counts.premium,
          freeUsers: counts.free,
          premiumUsers: counts.premium,
        })));
      }

      // Fetch engagement data
      const { count: curriculumUsers } = await supabase
        .from('user_chapter_progress')
        .select('user_id', { count: 'exact', head: true });

      const { count: quizUsers } = await supabase
        .from('quiz_attempts')
        .select('user_id', { count: 'exact', head: true });

      const { count: forumUsers } = await supabase
        .from('forum_posts')
        .select('user_id', { count: 'exact', head: true });

      const { count: aiUsers } = await supabase
        .from('ai_conversations')
        .select('user_id', { count: 'exact', head: true });

      const total = totalUsers || 1;
      setEngagement([
        { feature: 'Curriculum', uniqueUsers: curriculumUsers || 0, percentage: ((curriculumUsers || 0) / total) * 100 },
        { feature: 'Quizzes', uniqueUsers: quizUsers || 0, percentage: ((quizUsers || 0) / total) * 100 },
        { feature: 'Forums', uniqueUsers: forumUsers || 0, percentage: ((forumUsers || 0) / total) * 100 },
        { feature: 'AI Tutor', uniqueUsers: aiUsers || 0, percentage: ((aiUsers || 0) / total) * 100 },
      ]);

      // Fetch subject performance
      const { data: quizData } = await (supabase as any)
        .from('quiz_attempts')
        .select(`
          score_percentage,
          passed,
          user_id,
          quizzes!inner(subject_name)
        `)
        .eq('is_completed', true);

      if (quizData) {
        const subjectMap = new Map<string, { scores: number[]; passed: number; users: Set<string> }>();
        
        quizData.forEach((attempt: any) => {
          const subject = attempt.quizzes?.subject_name;
          if (!subject) return;
          
          const existing = subjectMap.get(subject) || { scores: [], passed: 0, users: new Set() };
          existing.scores.push(attempt.score_percentage || 0);
          if (attempt.passed) existing.passed++;
          existing.users.add(attempt.user_id);
          subjectMap.set(subject, existing);
        });

        setSubjectStats(Array.from(subjectMap.entries()).map(([subjectName, data]) => ({
          subjectName,
          totalAttempts: data.scores.length,
          avgScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
          passRate: (data.passed / data.scores.length) * 100,
          uniqueStudents: data.users.size,
        })));
      }

      // Fetch province stats
      const { data: provinceData } = await supabase
        .from('users')
        .select('province');

      if (provinceData) {
        const provinceMap = new Map<string, number>();
        provinceData.forEach((user: any) => {
          if (user.province) {
            provinceMap.set(user.province, (provinceMap.get(user.province) || 0) + 1);
          }
        });

        setProvinceStats(Array.from(provinceMap.entries()).map(([province, users]) => ({
          province,
          users,
          avgEngagement: 0,
        })));
      }

    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const exportReport = (format: 'csv' | 'json') => {
    const data = {
      platformStats,
      userGrowth,
      engagement,
      subjectStats,
      provinceStats,
      generatedAt: new Date().toISOString(),
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
    } else {
      // CSV export for key metrics
      const rows = [
        ['Metric', 'Value'],
        ['Total Users', platformStats?.totalUsers || 0],
        ['Premium Users', platformStats?.premiumUsers || 0],
        ['Conversion Rate', `${platformStats?.conversionRate?.toFixed(1) || 0}%`],
        ['Monthly Revenue', `R${platformStats?.monthlyRevenue || 0}`],
        ['Quiz Completion Rate', `${platformStats?.quizCompletionRate?.toFixed(1) || 0}%`],
      ];

      const csv = rows.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }

    toast({
      title: 'Exported',
      description: `Report exported as ${format.toUpperCase()}`,
    });
  };

  return {
    platformStats,
    userGrowth,
    engagement,
    revenue,
    subjectStats,
    provinceStats,
    loading,
    refresh: fetchStats,
    exportReport,
  };
};
