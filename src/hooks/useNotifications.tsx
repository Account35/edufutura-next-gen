import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  action_url: string | null;
  icon_name: string;
  priority_level: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at: string | null;
  delivery_channels: string[];
  sent_at: string;
  delivery_status: Record<string, boolean>;
  metadata: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  enabled: boolean;
  channels: string[];
  quiet_hours: Record<string, unknown> | null;
  digest_frequency: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data as Notification[] || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences((data || []) as NotificationPreference[]);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user?.id]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  }, [user?.id]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [user?.id, notifications]);

  // Update preference
  const updatePreference = useCallback(async (
    notificationType: string, 
    updates: Partial<NotificationPreference>
  ) => {
    if (!user?.id) return;

    try {
      const existing = preferences.find(p => p.notification_type === notificationType);

      // Prepare data for Supabase - convert quiet_hours to JSON
      const dbUpdates: Record<string, unknown> = {};
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.channels !== undefined) dbUpdates.channels = updates.channels;
      if (updates.quiet_hours !== undefined) dbUpdates.quiet_hours = updates.quiet_hours;
      if (updates.digest_frequency !== undefined) dbUpdates.digest_frequency = updates.digest_frequency;
      dbUpdates.updated_at = new Date().toISOString();

      if (existing) {
        const { error } = await supabase
          .from('user_notification_preferences')
          .update(dbUpdates)
          .eq('id', existing.id);

        if (error) throw error;

        setPreferences(prev =>
          prev.map(p => p.notification_type === notificationType ? { ...p, ...updates } : p)
        );
      } else {
        const { data, error } = await supabase
          .from('user_notification_preferences')
          .insert({
            user_id: user.id,
            notification_type: notificationType,
            ...dbUpdates,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          setPreferences(prev => [...prev, data as unknown as NotificationPreference]);
        }
      }

      toast.success('Notification preference updated');
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update preference');
    }
  }, [user?.id, preferences]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();
    fetchPreferences();

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          // Show toast for new notification
          if (newNotification.priority_level === 'urgent' || newNotification.priority_level === 'high') {
            toast.info(newNotification.title, {
              description: newNotification.message.substring(0, 100),
              action: newNotification.action_url ? {
                label: 'View',
                onClick: () => window.location.href = newNotification.action_url!,
              } : undefined,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications, fetchPreferences]);

  return {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreference,
    refetch: fetchNotifications,
  };
};
