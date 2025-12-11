import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action_type: string;
  action_description: string | null;
  target_type: string | null;
  target_id: string | null;
  severity: string;
  metadata: any;
  created_at: string;
  user_email?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  old_value?: any;
  new_value?: any;
  reason?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
}

export const useAdminAuditLog = (limit = 50) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const logAction = useCallback(async (
    actionType: string,
    description: string,
    targetType?: string,
    targetId?: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase.from('admin_audit_log').insert({
        user_id: user.id,
        action_type: actionType,
        action_description: description,
        target_type: targetType || null,
        target_id: targetId || null,
        severity,
        metadata: metadata || {}
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-audit-log')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_audit_log'
        },
        (payload) => {
          setLogs(prev => [payload.new as AuditLogEntry, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, limit]);

  return { logs, loading, logAction, refreshLogs: fetchLogs };
};
