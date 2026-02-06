import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { DashboardSkeleton, OnboardingSkeleton, GenericPageSkeleton } from '@/components/ui/PageSkeletons';

// Safety timeouts to prevent infinite loading
const PROTECTED_ROUTE_TIMEOUT_MS = 8000; // 8 seconds max wait for all checks
const PROFILE_WAIT_TIMEOUT_MS = 5000; // 5 seconds max wait for profile after auth

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
 * - Safety timeouts to prevent infinite loading
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
  const [timedOut, setTimedOut] = useState(false);
  const mountTimeRef = useRef(Date.now());
 
  // Global safety timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!checkComplete) {
        console.warn('[ProtectedRoute] Safety timeout reached, forcing completion');
        setTimedOut(true);
      }
    }, PROTECTED_ROUTE_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [checkComplete]);

  // Profile-specific timeout when user exists but profile is missing
  useEffect(() => {
    if (!authLoading && user && !userProfile && !checkComplete) {
      const profileTimeout = setTimeout(() => {
        console.warn('[ProtectedRoute] Profile wait timeout, proceeding with checks');
        setTimedOut(true);
      }, PROFILE_WAIT_TIMEOUT_MS);
      
      return () => clearTimeout(profileTimeout);
    }
  }, [authLoading, user, userProfile, checkComplete]);

  useEffect(() => {
    // If we've timed out, force redirect to landing to break the loop
    if (timedOut && !checkComplete) {
      console.warn('[ProtectedRoute] Timed out, redirecting to landing');
      navigate('/', { replace: true });
      return;
    }

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

    // For admin/educator routes, wait for role loading (with timeout protection)
    if ((requireAdmin || requireEducator) && roleLoading && !timedOut) {
      return;
    }

    // For non-admin routes that need onboarding check, wait for profile (with timeout)
    // But don't wait forever - if profile isn't loading, proceed
    if (requireOnboarding && !userProfile && !timedOut) {
      // If we've been waiting too long, just redirect to onboarding
      const waitTime = Date.now() - mountTimeRef.current;
      if (waitTime > PROFILE_WAIT_TIMEOUT_MS) {
        console.warn('[ProtectedRoute] Profile not loaded, redirecting to onboarding');
        navigate('/onboarding', { replace: true });
        return;
      }
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

    // Check admin role (with fallback if timed out)
    if (requireAdmin && !isAdmin && !timedOut) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Check educator role (with fallback if timed out)
    if (requireEducator && !isAdmin && !isEducator && !timedOut) {
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
    timedOut,
  ]);

  // Show appropriate skeleton while loading
  // Only show skeleton if we haven't completed our checks AND relevant loading is happening
  const needsRoleCheck = requireAdmin || requireEducator;
  const isStillLoading = !checkComplete && !timedOut && (
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