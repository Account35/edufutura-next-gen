import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Experiment {
  id: string;
  name: string;
  description: string;
  variantA: { name: string; config: Record<string, any> };
  variantB: { name: string; config: Record<string, any> };
  targetMetric: string;
  trafficPercentage: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  startDate: string | null;
  endDate: string | null;
  winnerVariant: string | null;
  isSignificant: boolean;
  pValue: number | null;
  confidenceLevel: number | null;
  createdAt: string;
}

interface ExperimentResults {
  experimentId: string;
  variantA: { users: number; conversions: number; rate: number };
  variantB: { users: number; conversions: number; rate: number };
  relativeImprovement: number;
  pValue: number;
  isSignificant: boolean;
  recommendedAction: string;
}

export const useABTesting = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<ExperimentResults | null>(null);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ab_experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(e => ({
        id: e.id,
        name: e.experiment_name,
        description: e.experiment_description || '',
        variantA: { name: e.variant_a_name, config: (e.variant_a_config as Record<string, any>) || {} },
        variantB: { name: e.variant_b_name, config: (e.variant_b_config as Record<string, any>) || {} },
        targetMetric: e.target_metric,
        trafficPercentage: e.traffic_percentage,
        status: e.status as Experiment['status'],
        startDate: e.start_date,
        endDate: e.end_date,
        winnerVariant: e.winner_variant,
        isSignificant: e.is_significant || false,
        pValue: e.p_value,
        confidenceLevel: e.confidence_level,
        createdAt: e.created_at,
      })) || [];

      setExperiments(formatted);
      return formatted;
    } catch (error: any) {
      console.error('Fetch experiments error:', error);
      toast({
        title: 'Failed to fetch experiments',
        description: error.message,
        variant: 'destructive',
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createExperiment = useCallback(async (experiment: {
    name: string;
    description: string;
    variantAName: string;
    variantAConfig: Record<string, any>;
    variantBName: string;
    variantBConfig: Record<string, any>;
    targetMetric: string;
    trafficPercentage: number;
    startDate?: Date;
    endDate?: Date;
  }) => {
    try {
      const { data, error } = await supabase
        .from('ab_experiments')
        .insert({
          experiment_name: experiment.name,
          experiment_description: experiment.description,
          variant_a_name: experiment.variantAName,
          variant_a_config: experiment.variantAConfig,
          variant_b_name: experiment.variantBName,
          variant_b_config: experiment.variantBConfig,
          target_metric: experiment.targetMetric,
          traffic_percentage: experiment.trafficPercentage,
          start_date: experiment.startDate?.toISOString(),
          end_date: experiment.endDate?.toISOString(),
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Experiment created',
        description: `${experiment.name} has been created.`,
      });

      await fetchExperiments();
      return data;
    } catch (error: any) {
      console.error('Create experiment error:', error);
      toast({
        title: 'Failed to create experiment',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchExperiments, toast]);

  const updateExperimentStatus = useCallback(async (experimentId: string, status: Experiment['status']) => {
    try {
      const updateData: Record<string, any> = { status };
      
      if (status === 'running') {
        updateData.start_date = new Date().toISOString();
      } else if (status === 'completed' || status === 'paused') {
        updateData.end_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ab_experiments')
        .update(updateData)
        .eq('id', experimentId);

      if (error) throw error;

      toast({
        title: 'Status updated',
        description: `Experiment status changed to ${status}.`,
      });

      await fetchExperiments();
    } catch (error: any) {
      console.error('Update status error:', error);
      toast({
        title: 'Failed to update status',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [fetchExperiments, toast]);

  const analyzeExperiment = useCallback(async (experimentId: string) => {
    setLoading(true);
    try {
      // Get assignment counts
      const { data: assignments } = await supabase
        .from('ab_test_assignments')
        .select('variant')
        .eq('experiment_id', experimentId);

      const variantAUsers = assignments?.filter(a => a.variant === 'A').length || 0;
      const variantBUsers = assignments?.filter(a => a.variant === 'B').length || 0;

      // Get conversion counts
      const { data: conversions } = await supabase
        .from('ab_test_conversions')
        .select('variant')
        .eq('experiment_id', experimentId);

      const variantAConversions = conversions?.filter(c => c.variant === 'A').length || 0;
      const variantBConversions = conversions?.filter(c => c.variant === 'B').length || 0;

      const rateA = variantAUsers > 0 ? (variantAConversions / variantAUsers) * 100 : 0;
      const rateB = variantBUsers > 0 ? (variantBConversions / variantBUsers) * 100 : 0;

      // Calculate relative improvement
      const relativeImprovement = rateA > 0 ? ((rateB - rateA) / rateA) * 100 : 0;

      // Calculate p-value using simplified chi-squared approximation
      const totalUsers = variantAUsers + variantBUsers;
      const totalConversions = variantAConversions + variantBConversions;
      const expectedA = totalUsers > 0 ? (variantAUsers * totalConversions) / totalUsers : 0;
      const expectedB = totalUsers > 0 ? (variantBUsers * totalConversions) / totalUsers : 0;

      let chiSquared = 0;
      if (expectedA > 0) chiSquared += Math.pow(variantAConversions - expectedA, 2) / expectedA;
      if (expectedB > 0) chiSquared += Math.pow(variantBConversions - expectedB, 2) / expectedB;

      // Simplified p-value calculation (approximation)
      const pValue = Math.exp(-chiSquared / 2);
      const isSignificant = pValue < 0.05;

      // Determine recommendation
      let recommendedAction = 'Continue collecting data';
      if (isSignificant) {
        if (rateB > rateA) {
          recommendedAction = 'Roll out Variant B (Treatment) to all users';
        } else {
          recommendedAction = 'Keep Variant A (Control) - treatment did not improve results';
        }
      } else if (totalUsers > 1000) {
        recommendedAction = 'No significant difference detected. Consider adjusting the experiment.';
      }

      const result: ExperimentResults = {
        experimentId,
        variantA: { users: variantAUsers, conversions: variantAConversions, rate: Math.round(rateA * 100) / 100 },
        variantB: { users: variantBUsers, conversions: variantBConversions, rate: Math.round(rateB * 100) / 100 },
        relativeImprovement: Math.round(relativeImprovement * 100) / 100,
        pValue: Math.round(pValue * 10000) / 10000,
        isSignificant,
        recommendedAction,
      };

      setResults(result);

      // Store results
      await supabase.from('ab_experiment_results').upsert({
        experiment_id: experimentId,
        result_date: new Date().toISOString().split('T')[0],
        variant_a_users: variantAUsers,
        variant_a_conversions: variantAConversions,
        variant_a_rate: rateA,
        variant_b_users: variantBUsers,
        variant_b_conversions: variantBConversions,
        variant_b_rate: rateB,
        relative_improvement: relativeImprovement,
        p_value: pValue,
        is_significant: isSignificant,
      }, { onConflict: 'experiment_id,result_date' });

      // Update experiment if significant
      if (isSignificant) {
        await supabase
          .from('ab_experiments')
          .update({
            is_significant: true,
            p_value: pValue,
            winner_variant: rateB > rateA ? 'B' : 'A',
          })
          .eq('id', experimentId);
      }

      return result;
    } catch (error: any) {
      console.error('Analyze experiment error:', error);
      toast({
        title: 'Failed to analyze experiment',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const rolloutWinner = useCallback(async (experimentId: string) => {
    try {
      await supabase
        .from('ab_experiments')
        .update({
          status: 'archived',
          end_date: new Date().toISOString(),
        })
        .eq('id', experimentId);

      toast({
        title: 'Experiment archived',
        description: 'Winner has been rolled out to all users.',
      });

      await fetchExperiments();
    } catch (error: any) {
      console.error('Rollout error:', error);
      toast({
        title: 'Failed to rollout winner',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [fetchExperiments, toast]);

  return {
    loading,
    experiments,
    results,
    fetchExperiments,
    createExperiment,
    updateExperimentStatus,
    analyzeExperiment,
    rolloutWinner,
  };
};
