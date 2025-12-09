import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If no user, we're done loading
    if (!user) {
      setIsAdmin(false);
      setIsEducator(false);
      setLoading(false);
      return;
    }

    const checkRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const roles = data?.map(r => r.role) || [];
        setIsAdmin(roles.includes('admin'));
        setIsEducator(roles.includes('educator'));
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
    loading
  };
};
