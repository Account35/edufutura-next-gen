import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ROLE_CHECK_TIMEOUT_MS = 10000; // 10 second timeout for role checks (increase to reduce spurious timeouts)
const ADMIN_EMAILS = new Set(['admin_edufutura@gmail.com', 'ntlemezal35@gmail.com']);

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const lastCheckedUserId = useRef<string | null>(null);
  const roleCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

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
      try {
        roleCheckTimeoutRef.current = setTimeout(() => {
          controller.abort();
        }, ROLE_CHECK_TIMEOUT_MS);

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .abortSignal(controller.signal);

        // Clear timeout since we got a response
        if (roleCheckTimeoutRef.current) {
          clearTimeout(roleCheckTimeoutRef.current as NodeJS.Timeout);
          roleCheckTimeoutRef.current = null;
        }

        if (cancelled) return;

        if (error) {
          console.error('Error fetching roles:', error);
          setIsAdmin(isAdminEmail);
          setIsEducator(false);
        } else {
          const roles = data?.map(r => r.role) || [];
          console.log('[AdminRole] Roles found:', roles, 'for user:', user.email);
          setIsAdmin(roles.includes('admin') || isAdminEmail);
          setIsEducator(roles.includes('educator'));
        }
        lastCheckedUserId.current = user.id;
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking roles:', error);
        // On error, check email as fallback
        const isAdminEmail = user.email === 'admin_edufutura@gmail.com' || user.email === 'ntlemezal35@gmail.com';
        setIsAdmin(isAdminEmail);
        setIsEducator(false);
        setHasChecked(true);
        lastCheckedUserId.current = user.id;
      } finally {
        if (roleCheckTimeoutRef.current) {
          clearTimeout(roleCheckTimeoutRef.current);
          roleCheckTimeoutRef.current = null;
        }

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    checkRoles();

    return () => {
      cancelled = true;
      controller.abort();
      if (roleCheckTimeoutRef.current) {
        clearTimeout(roleCheckTimeoutRef.current);
        roleCheckTimeoutRef.current = null;
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
