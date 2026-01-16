import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FullPageLoader } from '@/components/ui/loading';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      navigate('/');
      return;
    }

    // If onboarding already completed, redirect to dashboard
    if (userProfile?.onboarding_completed) {
      navigate('/dashboard');
      return;
    }

    // Auto-complete onboarding for Phase 1 (temporary until Phase 3 onboarding wizard)
    if (user && userProfile && !userProfile.onboarding_completed) {
      completeOnboarding();
    }
  }, [user, userProfile, loading, navigate]);

  const completeOnboarding = async () => {
    try {
      // Update database
      const { error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (error) throw error;

      // Optimistically update local profile state to avoid re-fetch
      if (userProfile) {
        // Note: This is a temporary optimistic update - the profile will be refreshed on next load
        console.log('Onboarding completed successfully');
      }

      toast.success('Welcome to EduFutura!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  if (loading || !userProfile) {
    return <FullPageLoader message="Setting up your account..." />;
  }

  return <FullPageLoader message="Completing your profile..." />;
}
