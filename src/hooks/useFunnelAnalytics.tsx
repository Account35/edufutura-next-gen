import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FunnelStep {
  name: string;
  order: number;
  event: string;
}

interface Funnel {
  id: string;
  name: string;
  description: string;
  steps: FunnelStep[];
  isActive: boolean;
}

interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  date: string;
  steps: {
    stepName: string;
    stepOrder: number;
    totalUsers: number;
    convertedUsers: number;
    conversionRate: number;
    dropOffRate: number;
  }[];
  overallConversion: number;
  biggestDropOff: { step: string; rate: number } | null;
}

export const useFunnelAnalytics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [analysis, setAnalysis] = useState<FunnelAnalysis | null>(null);

  const fetchFunnels = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversion_funnels')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFunnels = data?.map(f => ({
        id: f.id,
        name: f.funnel_name,
        description: f.funnel_description || '',
        steps: (f.steps as unknown as FunnelStep[]) || [],
        isActive: f.is_active || false,
      })) || [];

      setFunnels(formattedFunnels);
      return formattedFunnels;
    } catch (error: any) {
      console.error('Fetch funnels error:', error);
      toast({
        title: 'Failed to fetch funnels',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const analyzeFunnel = useCallback(async (funnelId: string, startDate: Date, endDate: Date) => {
    setLoading(true);
    try {
      const { data: funnel, error: funnelError } = await supabase
        .from('conversion_funnels')
        .select('*')
        .eq('id', funnelId)
        .single();

      if (funnelError) throw funnelError;

      const steps = (funnel.steps as unknown as FunnelStep[]) || [];
      const analysisSteps: FunnelAnalysis['steps'] = [];

      let previousStepUsers = 0;

      for (const step of steps.sort((a, b) => a.order - b.order)) {
        let totalUsers = 0;

        // Calculate users who completed this step based on event type
        switch (step.event) {
          case 'page_view':
            // Count unique visitors (from activity_log page views)
            const { count: visitorCount } = await supabase
              .from('activity_log')
              .select('user_id', { count: 'exact', head: true })
              .eq('activity_type', 'page_view')
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString());
            totalUsers = visitorCount || 0;
            break;

          case 'signup_complete':
            const { count: signupCount } = await supabase
              .from('users')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString());
            totalUsers = signupCount || 0;
            break;

          case 'profile_complete':
            const { count: profileCount } = await supabase
              .from('users')
              .select('id', { count: 'exact', head: true })
              .not('full_name', 'is', null)
              .not('grade', 'is', null)
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString());
            totalUsers = profileCount || 0;
            break;

          case 'quiz_complete':
            const { count: quizCount } = await supabase
              .from('quiz_attempts')
              .select('user_id', { count: 'exact', head: true })
              .eq('is_completed', true)
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString());
            totalUsers = quizCount || 0;
            break;

          case 'subscription_upgrade':
            const { count: premiumCount } = await supabase
              .from('users')
              .select('id', { count: 'exact', head: true })
              .eq('account_type', 'premium')
              .gte('subscription_start_date', startDate.toISOString())
              .lte('subscription_start_date', endDate.toISOString());
            totalUsers = premiumCount || 0;
            break;
        }

        const conversionRate = previousStepUsers > 0 
          ? (totalUsers / previousStepUsers) * 100 
          : step.order === 1 ? 100 : 0;
        
        const dropOffRate = previousStepUsers > 0 
          ? ((previousStepUsers - totalUsers) / previousStepUsers) * 100 
          : 0;

        analysisSteps.push({
          stepName: step.name,
          stepOrder: step.order,
          totalUsers,
          convertedUsers: totalUsers,
          conversionRate: Math.round(conversionRate * 10) / 10,
          dropOffRate: Math.round(dropOffRate * 10) / 10,
        });

        previousStepUsers = totalUsers;
      }

      // Find biggest drop-off
      let biggestDropOff: { step: string; rate: number } | null = null;
      for (const step of analysisSteps) {
        if (!biggestDropOff || step.dropOffRate > biggestDropOff.rate) {
          if (step.dropOffRate > 0) {
            biggestDropOff = { step: step.stepName, rate: step.dropOffRate };
          }
        }
      }

      // Calculate overall conversion
      const firstStep = analysisSteps[0];
      const lastStep = analysisSteps[analysisSteps.length - 1];
      const overallConversion = firstStep && lastStep && firstStep.totalUsers > 0
        ? (lastStep.totalUsers / firstStep.totalUsers) * 100
        : 0;

      const result: FunnelAnalysis = {
        funnelId,
        funnelName: funnel.funnel_name,
        date: new Date().toISOString().split('T')[0],
        steps: analysisSteps,
        overallConversion: Math.round(overallConversion * 100) / 100,
        biggestDropOff,
      };

      setAnalysis(result);

      // Store analysis results
      for (const step of analysisSteps) {
        await supabase.from('funnel_analytics').upsert({
          funnel_id: funnelId,
          analysis_date: result.date,
          step_name: step.stepName,
          step_order: step.stepOrder,
          total_users: step.totalUsers,
          converted_users: step.convertedUsers,
          conversion_rate: step.conversionRate,
          drop_off_rate: step.dropOffRate,
        }, { onConflict: 'funnel_id,analysis_date,step_name' });
      }

      return result;
    } catch (error: any) {
      console.error('Funnel analysis error:', error);
      toast({
        title: 'Failed to analyze funnel',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createFunnel = useCallback(async (name: string, description: string, steps: FunnelStep[]) => {
    try {
      const { data, error } = await supabase
        .from('conversion_funnels')
        .insert({
          funnel_name: name,
          funnel_description: description,
          steps: steps as any,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Funnel created',
        description: `${name} has been created successfully.`,
      });

      await fetchFunnels();
      return data;
    } catch (error: any) {
      console.error('Create funnel error:', error);
      toast({
        title: 'Failed to create funnel',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchFunnels, toast]);

  return {
    loading,
    funnels,
    analysis,
    fetchFunnels,
    analyzeFunnel,
    createFunnel,
  };
};
