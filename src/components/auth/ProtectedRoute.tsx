import { ReactNode, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { DashboardSkeleton, OnboardingSkeleton, GenericPageSkeleton } from '@/components/ui/PageSkeletons';

// Safety timeouts to prevent infinite loading
const PROTECTED_ROUTE_TIMEOUT_MS = 8000; // 8 seconds max wait for all checks

// Known admin emails for fallback
const ADMIN_EMAILS = ['admin_edufutura@gmail.com', 'ntlemezal35@gmail.com'];

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
  const { isAdmin, isEducator, loading: roleLoading, hasChecked } = useAdminRole();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const locationKeyRef = useRef(location.key);

  // Reset state when location changes (prevents stale state on navigation)
  useEffect(() => {
    if (location.key !== locationKeyRef.current) {
      locationKeyRef.current = location.key;
      setCheckComplete(false);
      setIsAuthorized(false);
      setTimedOut(false);
    }
  }, [location.key]);

  // Global safety timeout to prevent infinite loading
  useEffect(() => {
    if (checkComplete) return;
    
    const timeout = setTimeout(() => {
      if (!checkComplete) {
        console.warn('[ProtectedRoute] Safety timeout reached, forcing completion');
        setTimedOut(true);
        // Don't redirect - just mark as complete and let checks proceed with current state
      }
    }, PROTECTED_ROUTE_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [checkComplete, location.key]);

  useEffect(() => {
    // Wait for auth to complete loading (unless timed out)
    if (authLoading && !timedOut) {
      return;
    }

    // Not authenticated - redirect to landing
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

    // For admin/educator routes, wait for role loading (unless timed out)
    if ((requireAdmin || requireEducator) && roleLoading && !timedOut) {
      return;
    }

    // For routes that need onboarding check, wait briefly for profile (unless timed out)
    if (requireOnboarding && !userProfile && !timedOut) {
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
    if (requireAdmin) {
      const hasAdminAccess = isAdmin || (timedOut && user?.email && ADMIN_EMAILS.includes(user.email));
      if (!hasAdminAccess) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }

    // Check educator role (admins have educator access too)
    if (requireEducator) {
      const hasEducatorAccess = isAdmin || isEducator || (timedOut && user?.email && ADMIN_EMAILS.includes(user.email));
      if (!hasEducatorAccess) {
        navigate('/dashboard', { replace: true });
        return;
      }
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
    location.pathname,
    location.search,
    timedOut,
  ]);

  // Show appropriate skeleton while loading (but respect timeout)
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
    if (path.startsWith('/admin')) {
      return <GenericPageSkeleton />;
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