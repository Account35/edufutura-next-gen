import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AttemptValidation {
  canAttempt: boolean;
  reason?: string;
  attemptsRemaining?: number;
  cooldownMinutes?: number;
  nextAvailableTime?: Date;
}

interface AttemptStats {
  totalAttempts: number;
  completedAttempts: number;
  bestScore: number;
  averageScore: number;
  lastAttemptDate: string | null;
  attemptsToPassed: number | null;
  isImproving: boolean;
}

interface AttemptHistory {
  id: string;
  attempt_number: number;
  submitted_at: string | null;
  score_percentage: number | null;
  passed: boolean | null;
  time_spent_seconds: number | null;
  is_completed: boolean;
}

export const useAttemptManagement = (userId: string | undefined, quizId: string | undefined) => {
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<AttemptHistory[]>([]);
  const [stats, setStats] = useState<AttemptStats | null>(null);
  const [validation, setValidation] = useState<AttemptValidation | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<'free' | 'premium'>('free');

  useEffect(() => {
    if (userId && quizId) {
      loadAttemptData();
      
      // Refresh validation every minute for cooldown updates
      const interval = setInterval(() => {
        validateAttempt();
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [userId, quizId]);

  const loadAttemptData = async () => {
    if (!userId || !quizId) return;
    
    try {
      setLoading(true);
      
      // Get user account type
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('account_type')
        .eq('id', userId)
        .maybeSingle();
      
      const userAccountType = userData?.account_type || 'free';
      setAccountType(userAccountType);

      // Get all attempts
      const { data: attemptsData, error: attemptsError } = await (supabase as any)
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .order('attempt_number', { ascending: false });

      if (attemptsError) throw attemptsError;
      
      const attemptHistory = (attemptsData || []) as AttemptHistory[];
      setAttempts(attemptHistory);

      // Calculate statistics
      const completedAttempts = attemptHistory.filter(a => a.is_completed);
      const scores = completedAttempts.map(a => a.score_percentage || 0);
      
      const attemptStats: AttemptStats = {
        totalAttempts: attemptHistory.length,
        completedAttempts: completedAttempts.length,
        bestScore: scores.length > 0 ? Math.max(...scores) : 0,
        averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        lastAttemptDate: completedAttempts[0]?.submitted_at || null,
        attemptsToPassed: null,
        isImproving: false,
      };

      // Calculate attempts to pass
      const passedAttempt = completedAttempts.find(a => a.passed);
      if (passedAttempt) {
        attemptStats.attemptsToPassed = passedAttempt.attempt_number;
      }

      // Check if improving (simple: last score > first score)
      if (scores.length >= 2) {
        const firstScore = scores[scores.length - 1];
        const lastScore = scores[0];
        attemptStats.isImproving = lastScore > firstScore;
      }

      setStats(attemptStats);

      // Validate attempt eligibility
      await validateAttempt(attemptHistory, userAccountType);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading attempt data:', error);
      toast({
        title: "Error",
        description: "Failed to load quiz attempt data",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const validateAttempt = async (
    attemptHistory?: AttemptHistory[],
    userAccountType?: 'free' | 'premium'
  ) => {
    if (!userId || !quizId) return;

    try {
      const history = attemptHistory || attempts;
      const accType = userAccountType || accountType;
      
      const completedAttempts = history.filter(a => a.is_completed);
      
      // Check attempt limit for free users
      if (accType === 'free' && completedAttempts.length >= 2) {
        setValidation({
          canAttempt: false,
          reason: 'attempt_limit',
          attemptsRemaining: 0,
        });
        return;
      }

      // Check cooldown
      const { data: cooldownData } = await (supabase as any)
        .from('quiz_cooldowns')
        .select('*')
        .eq('user_id', userId)
        .eq('quiz_id', quizId)
        .maybeSingle();

      if (cooldownData) {
        const nextAvailable = new Date(cooldownData.next_available_at);
        const now = new Date();
        
        if (now < nextAvailable) {
          const minutesLeft = Math.ceil((nextAvailable.getTime() - now.getTime()) / 60000);
          setValidation({
            canAttempt: false,
            reason: 'cooldown',
            cooldownMinutes: minutesLeft,
            nextAvailableTime: nextAvailable,
            attemptsRemaining: accType === 'free' ? 2 - completedAttempts.length : undefined,
          });
          return;
        }
      }

      // Check for incomplete attempts
      const incompleteAttempt = history.find(a => !a.is_completed);
      if (incompleteAttempt) {
        setValidation({
          canAttempt: true,
          reason: 'incomplete_exists',
          attemptsRemaining: accType === 'free' ? 2 - completedAttempts.length : undefined,
        });
        return;
      }

      // All checks passed
      setValidation({
        canAttempt: true,
        attemptsRemaining: accType === 'free' ? 2 - completedAttempts.length : undefined,
      });
    } catch (error: any) {
      console.error('Error validating attempt:', error);
      setValidation({
        canAttempt: false,
        reason: 'error',
      });
    }
  };

  const getImprovementComparison = (currentAttemptId: string) => {
    const currentAttempt = attempts.find(a => a.id === currentAttemptId);
    if (!currentAttempt || attempts.length < 2) return null;

    const previousAttempts = attempts.filter(
      a => a.is_completed && a.attempt_number < currentAttempt.attempt_number
    );
    
    if (previousAttempts.length === 0) return null;

    const previousAttempt = previousAttempts[0]; // Most recent previous
    const scoreDiff = (currentAttempt.score_percentage || 0) - (previousAttempt.score_percentage || 0);

    return {
      improved: scoreDiff > 0,
      declined: scoreDiff < 0,
      scoreDifference: Math.abs(scoreDiff),
      previousScore: previousAttempt.score_percentage || 0,
      currentScore: currentAttempt.score_percentage || 0,
    };
  };

  const resetCooldown = async () => {
    if (!userId || !quizId) return;

    try {
      await (supabase as any)
        .from('quiz_cooldowns')
        .delete()
        .eq('user_id', userId)
        .eq('quiz_id', quizId);

      await loadAttemptData();
      
      toast({
        title: "Cooldown Reset",
        description: "You can now attempt the quiz immediately",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reset cooldown",
        variant: "destructive",
      });
    }
  };

  return {
    attempts,
    stats,
    validation,
    loading,
    accountType,
    loadAttemptData,
    validateAttempt,
    getImprovementComparison,
    resetCooldown,
  };
};
