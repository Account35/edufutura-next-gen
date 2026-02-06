import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const ROLE_CHECK_TIMEOUT_MS = 5000; // 5 second timeout for role checks

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);
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
      lastCheckedUserId.current = null;
      return;
    }

    // Skip if we already checked this user and have valid results
    if (lastCheckedUserId.current === user.id) {
      console.log('[AdminRole] Already checked user, skipping');
      // Ensure loading is false if we're reusing cached results
      if (loading) setLoading(false);
      return;
    }

    // Immediately set loading true for new checks
    setLoading(true);

    const checkRoles = async () => {
      try {
        setLoading(true);
        
        // Set a timeout to prevent infinite loading
        roleCheckTimeoutRef.current = setTimeout(() => {
          console.warn('[AdminRole] Role check timeout, defaulting to non-admin');
          setIsAdmin(false);
          setIsEducator(false);
          setLoading(false);
          lastCheckedUserId.current = user.id;
        }, ROLE_CHECK_TIMEOUT_MS);

        console.time('[AdminRole] checkRoles');
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        console.timeEnd('[AdminRole] checkRoles');

        // Clear timeout since we got a response
        if (roleCheckTimeoutRef.current) {
          clearTimeout(roleCheckTimeoutRef.current);
          roleCheckTimeoutRef.current = null;
        }

        if (error) {
          console.error('Error fetching roles:', error);
          setIsAdmin(false);
          setIsEducator(false);
        } else {
          const roles = data?.map(r => r.role) || [];
          console.log('[AdminRole] Roles found:', roles);
          setIsAdmin(roles.includes('admin'));
          setIsEducator(roles.includes('educator'));
        }
        lastCheckedUserId.current = user.id;
      } catch (error) {
        console.error('Error checking roles:', error);
        setIsAdmin(false);
        setIsEducator(false);
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
    loading: authLoading || loading
  };
};
