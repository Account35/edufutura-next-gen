import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Forecast {
  type: 'user_growth' | 'revenue' | 'churn' | 'load';
  date: string;
  predicted: number;
  confidenceLower: number;
  confidenceUpper: number;
  actual?: number;
  accuracy?: number;
}

interface ForecastInsight {
  type: string;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

export const usePlatformForecasting = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [insights, setInsights] = useState<ForecastInsight[]>([]);

  const generateUserGrowthForecast = useCallback(async (daysAhead: number = 30) => {
    setLoading(true);
    try {
      // Get historical registration data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: historicalData } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (!historicalData || historicalData.length === 0) {
        return [];
      }

      // Group by day
      const dailyCounts: Record<string, number> = {};
      historicalData.forEach(user => {
        const date = user.created_at.split('T')[0];
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      });

      const values = Object.values(dailyCounts);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      // Simple linear regression for trend
      const n = values.length;
      const xSum = (n * (n - 1)) / 2;
      const ySum = values.reduce((a, b) => a + b, 0);
      const xySum = values.reduce((sum, val, i) => sum + i * val, 0);
      const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;

      const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
      const intercept = (ySum - slope * xSum) / n;

      // Generate forecasts
      const newForecasts: Forecast[] = [];
      for (let i = 1; i <= daysAhead; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);
        
        const predicted = Math.max(0, intercept + slope * (n + i));
        const confidenceLower = Math.max(0, predicted - 1.96 * stdDev);
        const confidenceUpper = predicted + 1.96 * stdDev;

        newForecasts.push({
          type: 'user_growth',
          date: forecastDate.toISOString().split('T')[0],
          predicted: Math.round(predicted),
          confidenceLower: Math.round(confidenceLower),
          confidenceUpper: Math.round(confidenceUpper),
        });
      }

      // Store forecasts
      for (const forecast of newForecasts) {
        await supabase.from('platform_forecasts').upsert({
          forecast_type: forecast.type,
          forecast_date: forecast.date,
          predicted_value: forecast.predicted,
          confidence_lower: forecast.confidenceLower,
          confidence_upper: forecast.confidenceUpper,
        }, { onConflict: 'forecast_type,forecast_date' });
      }

      return newForecasts;
    } catch (error: any) {
      console.error('User growth forecast error:', error);
      toast({
        title: 'Failed to generate forecast',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const generateRevenueForecast = useCallback(async (daysAhead: number = 30) => {
    setLoading(true);
    try {
      const monthlyPrice = 60; // R60/month

      // Get historical subscription data
      const { data: subscriptions } = await supabase
        .from('users')
        .select('subscription_start_date, account_type')
        .eq('account_type', 'premium')
        .not('subscription_start_date', 'is', null)
        .order('subscription_start_date', { ascending: true });

      if (!subscriptions || subscriptions.length === 0) {
        return [];
      }

      // Calculate monthly new premium users
      const monthlyNewPremium: Record<string, number> = {};
      subscriptions.forEach(sub => {
        const month = sub.subscription_start_date!.slice(0, 7);
        monthlyNewPremium[month] = (monthlyNewPremium[month] || 0) + 1;
      });

      const values = Object.values(monthlyNewPremium);
      const avgNewPremium = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const currentPremiumCount = subscriptions.length;

      // Project future revenue
      const newForecasts: Forecast[] = [];
      for (let i = 1; i <= daysAhead; i++) {
        const forecastDate = new Date();
        forecastDate.setDate(forecastDate.getDate() + i);

        // Assume steady state + growth
        const monthsAhead = i / 30;
        const projectedNewUsers = Math.round(avgNewPremium * monthsAhead);
        const projectedPremium = currentPremiumCount + projectedNewUsers;
        const monthlyRevenue = projectedPremium * monthlyPrice;

        const variance = monthlyRevenue * 0.15; // 15% variance

        newForecasts.push({
          type: 'revenue',
          date: forecastDate.toISOString().split('T')[0],
          predicted: Math.round(monthlyRevenue),
          confidenceLower: Math.round(monthlyRevenue - variance),
          confidenceUpper: Math.round(monthlyRevenue + variance),
        });
      }

      return newForecasts;
    } catch (error: any) {
      console.error('Revenue forecast error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const predictChurn = useCallback(async () => {
    setLoading(true);
    try {
      // Get users with low recent activity
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: allUsers } = await supabase
        .from('users')
        .select('id, full_name, email, last_login_at, account_type');

      const { data: recentActivity } = await supabase
        .from('activity_log')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activeUserIds = new Set(recentActivity?.map(a => a.user_id) || []);

      const atRiskUsers = allUsers?.filter(user => !activeUserIds.has(user.id)) || [];
      const premiumAtRisk = atRiskUsers.filter(u => u.account_type === 'premium');

      // Calculate churn risk
      const totalUsers = allUsers?.length || 0;
      const churnRiskRate = totalUsers > 0 ? (atRiskUsers.length / totalUsers) * 100 : 0;

      // Store forecast
      const forecastDate = new Date().toISOString().split('T')[0];
      await supabase.from('platform_forecasts').upsert({
        forecast_type: 'churn',
        forecast_date: forecastDate,
        predicted_value: churnRiskRate,
        confidence_lower: churnRiskRate * 0.8,
        confidence_upper: churnRiskRate * 1.2,
        features_used: { at_risk_users: atRiskUsers.length, premium_at_risk: premiumAtRisk.length },
      }, { onConflict: 'forecast_type,forecast_date' });

      return {
        churnRiskRate: Math.round(churnRiskRate * 10) / 10,
        atRiskCount: atRiskUsers.length,
        premiumAtRisk: premiumAtRisk.length,
      };
    } catch (error: any) {
      console.error('Churn prediction error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateInsights = useCallback(async () => {
    setLoading(true);
    try {
      const newInsights: ForecastInsight[] = [];

      // Get churn data
      const churnData = await predictChurn();
      if (churnData && churnData.churnRiskRate > 20) {
        newInsights.push({
          type: 'churn',
          recommendation: 'High churn risk detected. Improve onboarding to reduce early churn and send re-engagement emails.',
          impact: 'high',
        });
      }

      // Get growth trend
      const growthForecasts = await generateUserGrowthForecast(7);
      if (growthForecasts.length > 0) {
        const avgGrowth = growthForecasts.reduce((sum, f) => sum + f.predicted, 0) / growthForecasts.length;
        if (avgGrowth < 5) {
          newInsights.push({
            type: 'growth',
            recommendation: 'User acquisition is slowing. Consider marketing campaigns or referral programs.',
            impact: 'medium',
          });
        }
      }

      // Check premium conversion
      const { count: totalUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      const { count: premiumUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('account_type', 'premium');

      const conversionRate = totalUsers && totalUsers > 0 ? ((premiumUsers || 0) / totalUsers) * 100 : 0;
      
      if (conversionRate < 5) {
        newInsights.push({
          type: 'conversion',
          recommendation: 'Premium conversion is below target. Consider improving premium value proposition or offering trials.',
          impact: 'high',
        });
      }

      setInsights(newInsights);
      return newInsights;
    } catch (error: any) {
      console.error('Insights generation error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [predictChurn, generateUserGrowthForecast]);

  const fetchStoredForecasts = useCallback(async (type?: string) => {
    try {
      let query = supabase
        .from('platform_forecasts')
        .select('*')
        .order('forecast_date', { ascending: true });

      if (type) {
        query = query.eq('forecast_type', type);
      }

      const { data } = await query;

      const formatted = data?.map(f => ({
        type: f.forecast_type as Forecast['type'],
        date: f.forecast_date,
        predicted: f.predicted_value,
        confidenceLower: f.confidence_lower || 0,
        confidenceUpper: f.confidence_upper || 0,
        actual: f.actual_value || undefined,
        accuracy: f.accuracy_score || undefined,
      })) || [];

      setForecasts(formatted);
      return formatted;
    } catch (error: any) {
      console.error('Fetch forecasts error:', error);
      return [];
    }
  }, []);

  const validateForecast = useCallback(async (forecastType: string, date: string, actualValue: number) => {
    try {
      const { data: forecast } = await supabase
        .from('platform_forecasts')
        .select('predicted_value')
        .eq('forecast_type', forecastType)
        .eq('forecast_date', date)
        .single();

      if (forecast) {
        const accuracy = 100 - Math.abs((actualValue - forecast.predicted_value) / forecast.predicted_value) * 100;

        await supabase
          .from('platform_forecasts')
          .update({
            actual_value: actualValue,
            accuracy_score: Math.max(0, accuracy),
            validated_at: new Date().toISOString(),
          })
          .eq('forecast_type', forecastType)
          .eq('forecast_date', date);

        return accuracy;
      }
      return null;
    } catch (error: any) {
      console.error('Validate forecast error:', error);
      return null;
    }
  }, []);

  return {
    loading,
    forecasts,
    insights,
    generateUserGrowthForecast,
    generateRevenueForecast,
    predictChurn,
    generateInsights,
    fetchStoredForecasts,
    validateForecast,
  };
};
