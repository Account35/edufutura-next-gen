import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useAdminRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const checkRoles = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching roles:', error);
        setIsAdmin(false);
        setIsEducator(false);
      } else {
        const roles = data?.map(r => r.role) || [];
        const adminStatus = roles.includes('admin');
        const educatorStatus = roles.includes('educator');
        setIsAdmin(adminStatus);
        setIsEducator(educatorStatus);
      }
    } catch (error) {
      console.error('Error checking roles:', error);
      setIsAdmin(false);
      setIsEducator(false);
    } finally {
      setLoading(false);
      setHasChecked(true);
    }
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      setLoading(true);
      return;
    }

    // If no user, we're done loading
    if (!user) {
      setIsAdmin(false);
      setIsEducator(false);
      setLoading(false);
      setHasChecked(true);
      return;
    }

    // Only check roles if we haven't checked yet or user changed
    if (!hasChecked || user.id) {
      checkRoles(user.id);
    }
  }, [user?.id, authLoading, checkRoles, hasChecked]);

  // Reset hasChecked when user changes
  useEffect(() => {
    setHasChecked(false);
  }, [user?.id]);

  return {
    isAdmin,
    isEducator,
    isAdminOrEducator: isAdmin || isEducator,
    loading: authLoading || loading
  };
};
