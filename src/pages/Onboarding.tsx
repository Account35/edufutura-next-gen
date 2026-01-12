import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { FullPageLoader } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();

  const [autoAttempted, setAutoAttempted] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Onboarding] State:', {
      loading,
      roleLoading,
      user: user?.id ?? null,
      userProfile: userProfile ? 'exists' : null,
      onboarding_completed: userProfile?.onboarding_completed,
      autoAttempted,
    });

    // Redirect if not authenticated
    if (!loading && !user) {
      console.log('[Onboarding] Not authenticated, redirecting to /');
      navigate('/');
      return;
    }

    // If onboarding already completed, redirect appropriately
    if (userProfile?.onboarding_completed && !roleLoading) {
      const dest = isAdmin || isEducator ? '/admin' : '/dashboard';
      console.log('[Onboarding] Already completed, redirecting to', dest);
      navigate(dest);
      return;
    }

    // Auto-complete onboarding for Phase 1 (temporary until Phase 3 onboarding wizard)
    // IMPORTANT: only attempt once automatically to avoid infinite spinner loops on failure.
    if (
      user &&
      userProfile &&
      !userProfile.onboarding_completed &&
      !roleLoading &&
      !autoAttempted
    ) {
      console.log('[Onboarding] Auto-completing onboarding...');
      setAutoAttempted(true);
      completeOnboarding();
    }
  }, [
    user,
    userProfile,
    loading,
    roleLoading,
    isAdmin,
    isEducator,
    navigate,
    autoAttempted,
  ]);

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      setSetupError(null);

      const { error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Welcome to EduFutura!');

      // Redirect based on role
      if (isAdmin || isEducator) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setSetupError('We couldn\'t finish setting up your account.');
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  if (loading || roleLoading || !userProfile) {
    return <FullPageLoader message="Setting up your account..." />;
  }

  if (setupError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Setup needs a retry</h1>
            <p className="text-sm text-muted-foreground">{setupError} Tap Retry to try again.</p>
          </div>
          <Button className="w-full min-h-[48px]" onClick={completeOnboarding}>
            Retry setup
          </Button>
          <Button variant="outline" className="w-full min-h-[48px]" onClick={() => navigate('/')}
          >
            Go to home
          </Button>
        </div>
      </div>
    );
  }

  return <FullPageLoader message="Completing your profile..." />;
}
