 import { useEffect } from 'react';
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
 
   useEffect(() => {
     // Wait for auth to load
     if (loading || roleLoading) return;
 
     // Redirect if not authenticated
     if (!user) {
       navigate('/');
       return;
     }
 
     // If onboarding already completed, redirect to dashboard
     if (userProfile?.onboarding_completed) {
       const dest = isAdmin || isEducator ? '/admin' : '/dashboard';
       navigate(dest);
       return;
     }
 
     // Redirect to appropriate onboarding step based on progress
     const step = userProfile?.onboarding_step || 1;
     
     switch (step) {
       case 1:
         navigate('/onboarding/welcome');
         break;
       case 2:
         navigate('/onboarding/subjects');
         break;
       case 3:
         navigate('/onboarding/preferences');
         break;
       case 4:
         navigate('/onboarding/complete');
         break;
       default:
         navigate('/onboarding/welcome');
     }
   }, [user, userProfile, loading, roleLoading, isAdmin, isEducator, navigate]);
 
   return <FullPageLoader message="Loading your profile..." />;
 }
