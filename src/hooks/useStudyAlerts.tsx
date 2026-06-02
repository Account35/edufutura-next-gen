import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const getCurrentStudyPeriod = (hour: number) => {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

const buildNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {},
  priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
) => {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      notification_type: type,
      title,
      message,
      action_url: '/dashboard',
      icon_name: 'book',
      priority_level: priority,
      is_read: false,
      delivery_channels: ['in_app'],
      sent_at: new Date().toISOString(),
      delivery_status: { in_app: true },
      metadata,
    });
  } catch (error) {
    console.error('Failed to create study notification:', error);
  }
};

const isNotificationSentRecently = async (
  userId: string,
  type: string,
  sinceISO: string
) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', type)
      .gte('sent_at', sinceISO)
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error('Failed to check recent notifications:', error);
    return false;
  }
};

export const useStudyAlerts = () => {
  const { user } = useAuth();

  const scheduleStudyAlerts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: prefs, error: prefsError } = await supabase
        .from('study_preferences')
        .select('preferred_study_time, daily_goal_minutes, weekly_goal_hours, study_reminders_enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;
      if (!prefs || !prefs.study_reminders_enabled) return;

      const now = new Date();
      const currentPeriod = getCurrentStudyPeriod(now.getHours());
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);
      const weekAgoISO = weekAgo.toISOString();

      // Preferences for notification sending behavior
      const preferredIntervalMinutes = 120; // don't re-send preferred-study reminder more often than this
      const inactivityThresholdMinutes = 30; // only notify if user has been inactive for at least this many minutes

      // Preferred study time reminder
      if (prefs.preferred_study_time === currentPeriod) {
        // Check user activity; only send the in-app notification if the user has been inactive
        const { data: userMeta } = await supabase.from('users').select('last_dashboard_visit').eq('id', user.id).maybeSingle();
        const lastVisit = userMeta?.last_dashboard_visit ? new Date(userMeta.last_dashboard_visit) : null;
        const inactive = !lastVisit || (now.getTime() - (lastVisit?.getTime() || 0)) > inactivityThresholdMinutes * 60_000;

        if (inactive) {
          const prefSinceISO = new Date(now.getTime() - preferredIntervalMinutes * 60_000).toISOString();
          const alreadySent = await isNotificationSentRecently(user.id, 'study_time_alert', prefSinceISO);
          if (!alreadySent) {
            await buildNotification(
              user.id,
              'study_time_alert',
              'It’s your preferred study time',
              `Your preferred study time is ${currentPeriod}. Open your subject now to keep your learning momentum going.`,
              { preferred_study_time: currentPeriod },
              'normal'
            );
          }
        }
      }

      // Missed daily goal alert
      if (prefs.daily_goal_minutes && prefs.daily_goal_minutes > 0) {
        const { data: todayProgress, error: todayProgressError } = await supabase
          .from('user_chapter_progress')
          .select('time_spent_minutes, last_accessed')
          .eq('user_id', user.id)
          .gte('last_accessed', todayISO);

        if (todayProgressError) throw todayProgressError;

        const todayMinutes = (todayProgress || []).reduce(
          (sum, row) => sum + (row.time_spent_minutes || 0),
          0
        );

        if (todayMinutes < prefs.daily_goal_minutes) {
          const alreadySent = await isNotificationSentRecently(user.id, 'study_goal_daily_alert', todayISO);
          if (!alreadySent) {
            await buildNotification(
              user.id,
              'study_goal_daily_alert',
              'Daily study goal pending',
              `You set a daily goal of ${prefs.daily_goal_minutes} minutes. You have ${Math.max(0, prefs.daily_goal_minutes - todayMinutes)} minutes to go today.`,
              { daily_goal_minutes: prefs.daily_goal_minutes, today_minutes: todayMinutes },
              'high'
            );
          }
        }
      }

      // Weekly goal alert
      if (prefs.weekly_goal_hours && prefs.weekly_goal_hours > 0) {
        const { data: weekProgress, error: weekProgressError } = await supabase
          .from('user_chapter_progress')
          .select('time_spent_minutes, last_accessed')
          .eq('user_id', user.id)
          .gte('last_accessed', weekAgoISO);

        if (weekProgressError) throw weekProgressError;

        const weekMinutes = (weekProgress || []).reduce(
          (sum, row) => sum + (row.time_spent_minutes || 0),
          0
        );

        const weeklyTargetMinutes = prefs.weekly_goal_hours * 60;
        if (weekMinutes < weeklyTargetMinutes) {
          const alreadySent = await isNotificationSentRecently(user.id, 'study_goal_weekly_alert', weekAgoISO);
          if (!alreadySent) {
            await buildNotification(
              user.id,
              'study_goal_weekly_alert',
              'Weekly study goal behind schedule',
              `You set a weekly goal of ${prefs.weekly_goal_hours} hours. You have completed ${Math.floor(weekMinutes / 60)}h ${weekMinutes % 60}m so far this week.`,
              { weekly_goal_hours: prefs.weekly_goal_hours, week_minutes: weekMinutes },
              'normal'
            );
          }
        }
      }
    } catch (error) {
      console.error('Error scheduling study alerts:', error);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;
    scheduleStudyAlerts();
  }, [user?.id, scheduleStudyAlerts]);
};
