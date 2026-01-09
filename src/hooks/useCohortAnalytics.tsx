import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CohortData {
  cohortMonth: string;
  totalUsers: number;
  retentionByMonth: { monthOffset: number; retained: number; rate: number }[];
}

interface LTVData {
  cohortMonth: string;
  avgLTV: number;
  projectedLTV: number;
  premiumConversions: number;
}

export const useCohortAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [ltvData, setLtvData] = useState<LTVData[]>([]);

  const calculateCohorts = useCallback(async (monthsBack: number = 6) => {
    setLoading(true);
    try {
      const now = new Date();
      const cohortData: CohortData[] = [];

      for (let i = monthsBack - 1; i >= 0; i--) {
        const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortMonth = cohortDate.toISOString().slice(0, 7);
        const nextMonth = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 1);

        // Get users registered in this cohort month
        const { count: totalUsers } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', cohortDate.toISOString())
          .lt('created_at', nextMonth.toISOString());

        const retentionByMonth: { monthOffset: number; retained: number; rate: number }[] = [];

        // Calculate retention for each subsequent month
        for (let offset = 0; offset <= i; offset++) {
          const checkMonth = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + offset, 1);
          const checkMonthEnd = new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 1);

          // Count users from this cohort who were active in the check month
          const { data: activeUsers } = await supabase
            .from('activity_log')
            .select('user_id')
            .gte('created_at', checkMonth.toISOString())
            .lt('created_at', checkMonthEnd.toISOString())
            .in('user_id', (
              await supabase
                .from('users')
                .select('id')
                .gte('created_at', cohortDate.toISOString())
                .lt('created_at', nextMonth.toISOString())
            ).data?.map(u => u.id) || []);

          const uniqueActiveUsers = new Set(activeUsers?.map(a => a.user_id) || []).size;
          const rate = totalUsers && totalUsers > 0 ? (uniqueActiveUsers / totalUsers) * 100 : 0;

          retentionByMonth.push({
            monthOffset: offset,
            retained: uniqueActiveUsers,
            rate: Math.round(rate * 10) / 10,
          });
        }

        cohortData.push({
          cohortMonth,
          totalUsers: totalUsers || 0,
          retentionByMonth,
        });
      }

      setCohorts(cohortData);

      // Store in database for caching
      for (const cohort of cohortData) {
        for (const retention of cohort.retentionByMonth) {
          await supabase.from('cohort_retention').upsert({
            cohort_month: cohort.cohortMonth,
            month_offset: retention.monthOffset,
            total_users: cohort.totalUsers,
            retained_users: retention.retained,
            retention_rate: retention.rate,
          }, { onConflict: 'cohort_month,month_offset' });
        }
      }

      return cohortData;
    } catch (error: any) {
      console.error('Cohort calculation error:', error);
      toast({
        title: 'Failed to calculate cohorts',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const calculateLTV = useCallback(async (monthsBack: number = 6) => {
    setLoading(true);
    try {
      const now = new Date();
      const ltvResults: LTVData[] = [];
      const monthlyRevenue = 60; // R60/month for premium

      for (let i = monthsBack - 1; i >= 0; i--) {
        const cohortDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortMonth = cohortDate.toISOString().slice(0, 7);
        const nextMonth = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 1);

        // Get cohort users
        const { data: cohortUsers } = await supabase
          .from('users')
          .select('id, account_type, subscription_start_date, subscription_end_date')
          .gte('created_at', cohortDate.toISOString())
          .lt('created_at', nextMonth.toISOString());

        if (!cohortUsers || cohortUsers.length === 0) continue;

        let totalRevenue = 0;
        let premiumConversions = 0;

        for (const user of cohortUsers) {
          if (user.account_type === 'premium' && user.subscription_start_date) {
            premiumConversions++;
            const startDate = new Date(user.subscription_start_date);
            const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : now;
            const monthsActive = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
            totalRevenue += monthsActive * monthlyRevenue;
          }
        }

        const avgLTV = cohortUsers.length > 0 ? totalRevenue / cohortUsers.length : 0;
        const conversionRate = cohortUsers.length > 0 ? premiumConversions / cohortUsers.length : 0;
        const avgLifespan = 6; // Assume 6 months average lifespan
        const projectedLTV = conversionRate * monthlyRevenue * avgLifespan;

        ltvResults.push({
          cohortMonth,
          avgLTV: Math.round(avgLTV * 100) / 100,
          projectedLTV: Math.round(projectedLTV * 100) / 100,
          premiumConversions,
        });
      }

      setLtvData(ltvResults);
      return ltvResults;
    } catch (error: any) {
      console.error('LTV calculation error:', error);
      toast({
        title: 'Failed to calculate LTV',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getStoredCohorts = useCallback(async () => {
    const { data } = await supabase
      .from('cohort_retention')
      .select('*')
      .order('cohort_month', { ascending: false })
      .order('month_offset', { ascending: true });

    return data || [];
  }, []);

  return {
    loading,
    cohorts,
    ltvData,
    calculateCohorts,
    calculateLTV,
    getStoredCohorts,
  };
};
