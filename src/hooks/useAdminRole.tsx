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

    // Skip if we already checked this user - but ensure loading is false
    if (lastCheckedUserId.current === user.id) {
      console.log('[AdminRole] Already checked user, skipping');
      setLoading(false);
      return;
    }

    const checkRoles = async () => {
      try {
        setLoading(true);
        console.time('[AdminRole] checkRoles');
        
        // Add timeout to prevent hanging
        const rolesPromise = supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Roles check timeout')), 5000); // 5 second timeout
        });
        
        const { data, error } = await Promise.race([
          rolesPromise,
          timeoutPromise
        ]) as any;
        
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
