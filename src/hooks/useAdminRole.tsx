import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastCheckedUserId = useRef<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[AdminRole] Waiting for auth...');
      return;
    }

    // If no user, reset and stop loading
    if (!user) {
      console.log('[AdminRole] No user, resetting roles');
      setIsAdmin(false);
      setIsEducator(false);
      setLoading(false);
      lastCheckedUserId.current = null;
      return;
    }

    // Skip if we already checked this user
    if (lastCheckedUserId.current === user.id) {
      console.log('[AdminRole] Already checked user, skipping');
      return;
    }

    const checkRoles = async () => {
      try {
        setLoading(true);
        console.time('[AdminRole] checkRoles');
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        console.timeEnd('[AdminRole] checkRoles');

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
  }, [user, authLoading]);

  return {
    isAdmin,
    isEducator,
    isAdminOrEducator: isAdmin || isEducator,
    loading: authLoading || loading
  };
};
