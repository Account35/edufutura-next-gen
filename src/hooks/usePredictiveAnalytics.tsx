import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface QuizPrediction {
  predictedScore: number;
  confidenceLower: number;
  confidenceUpper: number;
  factors: Record<string, number>;
}

interface DropoutRisk {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  scores: {
    loginFrequency: number;
    studyGap: number;
    progressStagnation: number;
    performanceDecline: number;
    socialIsolation: number;
  };
  daysSinceStudy: number;
  interventionNeeded: boolean;
}

interface PerformanceTrend {
  subject: string;
  trendType: 'improving' | 'plateau' | 'declining' | 'stable';
  slope: number;
  improvementRate: number;
  currentAvg: number;
  forecast4Weeks: number;
  dataPoints: number;
  insights: string[];
}

interface PeerRanking {
  subject: string;
  userValue: number;
  percentileRank: number;
  peerComparison: string;
  gapToMedian: number;
  benchmarks: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  sampleSize: number;
}

interface AnalyticsData {
  prediction: QuizPrediction | null;
  risk: DropoutRisk | null;
  trends: { trends: PerformanceTrend[] };
  benchmarks: { rankings: PeerRanking[] };
}

export const usePredictiveAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<QuizPrediction | null>(null);
  const [dropoutRisk, setDropoutRisk] = useState<DropoutRisk | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [rankings, setRankings] = useState<PeerRanking[]>([]);

  const predictQuizScore = useCallback(async (subjectName: string, quizId?: string) => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-performance', {
        body: { action: 'predict_quiz_score', subject_name: subjectName, quiz_id: quizId }
      });

      if (error) throw error;

      if (data?.data) {
        setPrediction(data.data);
        return data.data as QuizPrediction;
      }
    } catch (error: any) {
      console.error('Prediction error:', error);
      toast({
        title: 'Prediction failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return null;
  }, [user, toast]);

  const calculateDropoutRisk = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-performance', {
        body: { action: 'calculate_dropout_risk' }
      });

      if (error) throw error;

      if (data?.data) {
        setDropoutRisk(data.data);
        return data.data as DropoutRisk;
      }
    } catch (error: any) {
      console.error('Risk calculation error:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, [user]);

  const analyzePerformanceTrends = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-performance', {
        body: { action: 'analyze_trends' }
      });

      if (error) throw error;

      if (data?.data?.trends) {
        setTrends(data.data.trends);
        return data.data.trends as PerformanceTrend[];
      }
    } catch (error: any) {
      console.error('Trend analysis error:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, [user]);

  const calculatePeerBenchmarks = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-performance', {
        body: { action: 'calculate_benchmarks' }
      });

      if (error) throw error;

      if (data?.data?.rankings) {
        setRankings(data.data.rankings);
        return data.data.rankings as PeerRanking[];
      }
    } catch (error: any) {
      console.error('Benchmark calculation error:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, [user]);

  const runFullAnalysis = useCallback(async (subjectName?: string) => {
    if (!user) return null;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('predict-performance', {
        body: { action: 'full_analysis', subject_name: subjectName }
      });

      if (error) throw error;

      if (data?.data) {
        const result = data.data as AnalyticsData;
        if (result.prediction) setPrediction(result.prediction);
        if (result.risk) setDropoutRisk(result.risk);
        if (result.trends?.trends) setTrends(result.trends.trends);
        if (result.benchmarks?.rankings) setRankings(result.benchmarks.rankings);
        return result;
      }
    } catch (error: any) {
      console.error('Full analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
    return null;
  }, [user, toast]);

  const fetchStoredPredictions = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('performance_predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return [];
    }
  }, [user]);

  const fetchStoredTrends = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('performance_trends')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching trends:', error);
      return [];
    }
  }, [user]);

  const fetchStoredRankings = useCallback(async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('user_percentile_rankings')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching rankings:', error);
      return [];
    }
  }, [user]);

  const validatePrediction = useCallback(async (predictionId: string, actualValue: number) => {
    if (!user) return;

    try {
      const { data: prediction } = await supabase
        .from('performance_predictions')
        .select('predicted_value')
        .eq('id', predictionId)
        .single();

      if (prediction) {
        const accuracy = 100 - Math.abs(prediction.predicted_value - actualValue);
        
        await supabase
          .from('performance_predictions')
          .update({
            actual_value: actualValue,
            accuracy_score: accuracy,
            validated_at: new Date().toISOString()
          })
          .eq('id', predictionId);
      }
    } catch (error) {
      console.error('Error validating prediction:', error);
    }
  }, [user]);

  return {
    loading,
    prediction,
    dropoutRisk,
    trends,
    rankings,
    predictQuizScore,
    calculateDropoutRisk,
    analyzePerformanceTrends,
    calculatePeerBenchmarks,
    runFullAnalysis,
    fetchStoredPredictions,
    fetchStoredTrends,
    fetchStoredRankings,
    validatePrediction
  };
};
