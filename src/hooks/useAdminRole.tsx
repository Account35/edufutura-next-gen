import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ROLE_CHECK_TIMEOUT_MS = 10000; // 10 second timeout for role checks (increase to reduce spurious timeouts)

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);
  const roleCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any pending timeout
    if (roleCheckTimeoutRef.current) {
      clearTimeout(roleCheckTimeoutRef.current);
      roleCheckTimeoutRef.current = null;
    }

    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[AdminRole] Waiting for auth...');
      return;
    }

    // If no user, reset and stop loading immediately
    if (!user) {
      console.log('[AdminRole] No user, resetting roles');
      setIsAdmin(false);
      setIsEducator(false);
      setLoading(false);
      setHasChecked(true);
      lastCheckedUserId.current = null;
      return;
    }

    // Skip if we already checked this user
    if (lastCheckedUserId.current === user.id && hasChecked) {
      console.log('[AdminRole] Already checked user, skipping');
      if (loading) setLoading(false);
      return;
    }

    // Start loading for new checks
    setLoading(true);

    const checkRoles = async () => {
      const startedAt = performance.now();
      try {
        // Prevent scheduling duplicate timeouts
        if (roleCheckTimeoutRef.current) {
          console.debug('[AdminRole] Role check timeout already scheduled, skipping duplicate');
        } else {
          // Set a timeout to prevent infinite loading - but DON'T default to non-admin
          roleCheckTimeoutRef.current = setTimeout(() => {
            console.warn('[AdminRole] Role check timeout, completing with current state');
            setLoading(false);
            setHasChecked(true);
            lastCheckedUserId.current = user.id;
            roleCheckTimeoutRef.current = null;
          }, ROLE_CHECK_TIMEOUT_MS);
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        console.log(`[AdminRole] checkRoles: ${performance.now() - startedAt} ms`);

        // Clear timeout since we got a response
        if (roleCheckTimeoutRef.current) {
          clearTimeout(roleCheckTimeoutRef.current as NodeJS.Timeout);
          roleCheckTimeoutRef.current = null;
        }

        if (error) {
          console.error('Error fetching roles:', error);
          // On error, check if user email is admin email as fallback
          const isAdminEmail = user.email === 'admin_edufutura@gmail.com' || user.email === 'ntlemezal35@gmail.com';
          setIsAdmin(isAdminEmail);
          setIsEducator(false);
        } else {
          const roles = data?.map(r => r.role) || [];
          console.log('[AdminRole] Roles found:', roles, 'for user:', user.email);
          // Also check email as backup (admin emails always get admin access)
          const isAdminEmail = user.email === 'admin_edufutura@gmail.com' || user.email === 'ntlemezal35@gmail.com';
          setIsAdmin(roles.includes('admin') || isAdminEmail);
          setIsEducator(roles.includes('educator'));
        }
        lastCheckedUserId.current = user.id;
        setHasChecked(true);
      } catch (error) {
        console.log(`[AdminRole] checkRoles failed after ${performance.now() - startedAt} ms`);
        console.error('Error checking roles:', error);
        // On error, check email as fallback
        const isAdminEmail = user.email === 'admin_edufutura@gmail.com' || user.email === 'ntlemezal35@gmail.com';
        setIsAdmin(isAdminEmail);
        setIsEducator(false);
        setHasChecked(true);
      } finally {
        setLoading(false);
      }
    };

    checkRoles();

    return () => {
      if (roleCheckTimeoutRef.current) {
        clearTimeout(roleCheckTimeoutRef.current);
      }
    };
  }, [user?.id, authLoading]);

  return {
    isAdmin,
    isEducator,
    isAdminOrEducator: isAdmin || isEducator,
    loading: authLoading || loading,
    hasChecked
  };
};
