 import { ReactNode, useEffect, useState } from 'react';
 import { useNavigate, useLocation } from 'react-router-dom';
 import { useAuth } from '@/hooks/useAuth';
 import { useAdminRole } from '@/hooks/useAdminRole';
 import { DashboardSkeleton, OnboardingSkeleton, GenericPageSkeleton } from '@/components/ui/PageSkeletons';
 
 interface ProtectedRouteProps {
   children: ReactNode;
   requireOnboarding?: boolean;
   requireAdmin?: boolean;
   requireEducator?: boolean;
   allowGuest?: boolean;
 }
 
 /**
  * Centralized route protection with:
  * - Authentication checks
  * - Onboarding completion guards
  * - Role-based access control
  * - Proper redirect handling
  */
 export const ProtectedRoute = ({
   children,
   requireOnboarding = true,
   requireAdmin = false,
   requireEducator = false,
   allowGuest = false,
 }: ProtectedRouteProps) => {
   const navigate = useNavigate();
   const location = useLocation();
   const { user, userProfile, loading: authLoading } = useAuth();
   const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
   const [isAuthorized, setIsAuthorized] = useState(false);
   const [checkComplete, setCheckComplete] = useState(false);
 
  useEffect(() => {
    // Wait for auth to complete loading
    if (authLoading) {
      return;
    }

    // Not authenticated
    if (!user) {
      if (allowGuest) {
        setIsAuthorized(true);
        setCheckComplete(true);
        return;
      }
      // Store intended destination for post-login redirect
      sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search);
      navigate('/', { replace: true });
      return;
    }

    // For admin/educator routes, wait for role loading
    if ((requireAdmin || requireEducator) && roleLoading) {
      return;
    }

    // For non-admin routes, we can proceed even without profile for basic checks
    // But for onboarding checks, we need the profile
    if (requireOnboarding && !userProfile) {
      // If we have a user but no profile after auth finished, wait briefly
      // The profile should be created/loaded by useAuth
      return;
    }

    // Check onboarding completion (skip for onboarding routes themselves)
    const isOnboardingRoute = location.pathname.startsWith('/onboarding');
    if (requireOnboarding && !isOnboardingRoute && userProfile) {
      if (!userProfile.onboarding_completed) {
        navigate('/onboarding', { replace: true });
        return;
      }
    }

    // Check admin role
    if (requireAdmin && !isAdmin) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Check educator role
    if (requireEducator && !isAdmin && !isEducator) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // All checks passed
    setIsAuthorized(true);
    setCheckComplete(true);
  }, [
    user,
    userProfile,
    authLoading,
    roleLoading,
    isAdmin,
    isEducator,
    requireOnboarding,
    requireAdmin,
    requireEducator,
    allowGuest,
    navigate,
    location,
  ]);
 
  // Show appropriate skeleton while loading
  // Only show skeleton if we haven't completed our checks AND relevant loading is happening
  const needsRoleCheck = requireAdmin || requireEducator;
  const isStillLoading = !checkComplete && (
    authLoading || 
    (needsRoleCheck && user && roleLoading) ||
    (requireOnboarding && user && !userProfile)
  );
  
  if (isStillLoading) {
    const path = location.pathname;
    
    if (path === '/dashboard' || path.startsWith('/dashboard')) {
      return <DashboardSkeleton />;
    }
    if (path.startsWith('/onboarding')) {
      return <OnboardingSkeleton />;
    }
    return <GenericPageSkeleton />;
  }
 
   if (!isAuthorized) {
     return null;
   }
 
   return <>{children}</>;
 };
 
 // Wrapper specifically for admin routes
 export const AdminRoute = ({ children }: { children: ReactNode }) => (
   <ProtectedRoute requireAdmin requireOnboarding={false}>
     {children}
   </ProtectedRoute>
 );
 
 // Wrapper for educator routes (admins also have access)
 export const EducatorRoute = ({ children }: { children: ReactNode }) => (
   <ProtectedRoute requireEducator requireOnboarding={false}>
     {children}
   </ProtectedRoute>
 );
 
 // Wrapper for onboarding routes (authenticated but may not have completed onboarding)
 export const OnboardingRoute = ({ children }: { children: ReactNode }) => (
   <ProtectedRoute requireOnboarding={false}>
     {children}
   </ProtectedRoute>
 );