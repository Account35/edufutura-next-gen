import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface AdminAlert {
  id: string;
  alert_type: string;
  title: string;
  description: string | null;
  severity: 'info' | 'warning' | 'critical';
  is_acknowledged: boolean;
  created_at: string;
}

export const useAdminAlerts = () => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data as AdminAlert[]) || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('admin_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }, [user]);

  const createAlert = useCallback(async (
    alertType: string,
    title: string,
    description?: string,
    severity: 'info' | 'warning' | 'critical' = 'warning'
  ) => {
    try {
      await supabase.from('admin_alerts').insert({
        alert_type: alertType,
        title,
        description: description || null,
        severity
      });
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('admin-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_alerts'
        },
        (payload) => {
          setAlerts(prev => [payload.new as AdminAlert, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  return { 
    alerts, 
    loading, 
    acknowledgeAlert, 
    createAlert, 
    refreshAlerts: fetchAlerts,
    unacknowledgedCount: alerts.length
  };
};
