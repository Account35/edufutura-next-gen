import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Permission {
  permission_key: string;
  has_permission: boolean;
}

interface AdminPermissionsContextType {
  permissions: Permission[];
  roles: string[];
  loading: boolean;
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (keys: string[]) => boolean;
  hasAllPermissions: (keys: string[]) => boolean;
  isAnyAdmin: boolean;
  refreshPermissions: () => Promise<void>;
}

const AdminPermissionsContext = createContext<AdminPermissionsContextType | null>(null);

export const AdminPermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      // Get user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) throw rolesError;

      const roleNames = userRoles?.map(r => r.role) || [];
      setRoles(roleNames);

      if (roleNames.length === 0) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Get permissions for all roles
      const { data: rolePermissions, error: permError } = await supabase
        .from('role_permissions')
        .select('permission_key, has_permission')
        .in('role_name', roleNames)
        .eq('has_permission', true);

      if (permError) throw permError;

      // Deduplicate permissions
      const uniquePermissions = rolePermissions?.reduce((acc: Permission[], curr) => {
        if (!acc.find(p => p.permission_key === curr.permission_key)) {
          acc.push(curr);
        }
        return acc;
      }, []) || [];

      setPermissions(uniquePermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadPermissions();
    }
  }, [authLoading, loadPermissions]);

  const hasPermission = useCallback((key: string) => {
    return permissions.some(p => p.permission_key === key && p.has_permission);
  }, [permissions]);

  const hasAnyPermission = useCallback((keys: string[]) => {
    return keys.some(key => hasPermission(key));
  }, [hasPermission]);

  const hasAllPermissions = useCallback((keys: string[]) => {
    return keys.every(key => hasPermission(key));
  }, [hasPermission]);

  const isAnyAdmin = roles.some(r => 
    ['admin', 'super_admin', 'platform_admin', 'content_moderator', 'curriculum_manager', 'support_agent', 'analytics_viewer', 'educator'].includes(r)
  );

  return (
    <AdminPermissionsContext.Provider value={{
      permissions,
      roles,
      loading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isAnyAdmin,
      refreshPermissions: loadPermissions
    }}>
      {children}
    </AdminPermissionsContext.Provider>
  );
};

export const useAdminPermissions = () => {
  const context = useContext(AdminPermissionsContext);
  if (!context) {
    throw new Error('useAdminPermissions must be used within AdminPermissionsProvider');
  }
  return context;
};
