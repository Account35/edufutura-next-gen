  import { useEffect, useMemo } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { useAdminRole } from '@/hooks/useAdminRole';
 import { FullPageLoader } from '@/components/ui/loading';
 
 /**
  * Onboarding entry point - redirects to appropriate step in the wizard
  */
 export default function Onboarding() {
   const navigate = useNavigate();
   const { user, userProfile, loading } = useAuth();
   const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
 
   // Determine target route based on onboarding state
   const targetRoute = useMemo(() => {
     if (!userProfile) return null;
     
     // If onboarding already completed, redirect to dashboard
     if (userProfile.onboarding_completed) {
       return isAdmin || isEducator ? '/admin' : '/dashboard';
     }
 
     // Redirect to appropriate onboarding step based on progress
     const step = userProfile.onboarding_step || 1;
     
     switch (step) {
       case 1: return '/onboarding/welcome';
       case 2: return '/onboarding/subjects';
       case 3: return '/onboarding/preferences';
       case 4: return '/onboarding/complete';
       default: return '/onboarding/welcome';
     }
   }, [userProfile, isAdmin, isEducator]);
 
   useEffect(() => {
     // Wait for auth to load
     if (loading || roleLoading) return;
 
     // Navigate once we have a target
     if (targetRoute) {
       navigate(targetRoute, { replace: true });
     }
   }, [loading, roleLoading, targetRoute, navigate]);
 
   return <FullPageLoader message="Loading your profile..." />;
 }
