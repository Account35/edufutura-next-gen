import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  notification_type: string;
  recipient_user_ids: string[];
  notification_data: {
    title: string;
    message: string;
    action_url?: string;
    icon_name?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: Record<string, unknown>;
    expires_at?: string;
  };
  channels?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    const { 
      notification_type, 
      recipient_user_ids, 
      notification_data,
      channels = ['in_app']
    }: NotificationRequest = await req.json();

    const { title, message, action_url, icon_name, priority = 'normal', metadata = {}, expires_at } = notification_data;

    console.log(`[send-notifications] Processing ${recipient_user_ids.length} recipients for type: ${notification_type}`);

    // Get user data and preferences
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, email, phone_number, full_name, comm_study_tips, comm_content_updates, comm_assessment_reminders, comm_progress_reports')
      .in('id', recipient_user_ids);

    if (usersError || !users) {
      console.error('[send-notifications] Failed to fetch users:', usersError);
      throw new Error('Failed to fetch user data');
    }

    // Get notification preferences for these users
    const { data: preferences } = await supabaseClient
      .from('user_notification_preferences')
      .select('*')
      .in('user_id', recipient_user_ids)
      .eq('notification_type', notification_type);

    const preferencesMap = new Map(
      preferences?.map(p => [p.user_id, p]) || []
    );

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      notifications_created: 0,
    };

    for (const user of users) {
      try {
        const userPref = preferencesMap.get(user.id);
        
        // Check if user has disabled this notification type
        if (userPref && !userPref.enabled) {
          console.log(`[send-notifications] User ${user.id} has disabled ${notification_type}`);
          results.skipped++;
          continue;
        }

        // Check legacy preferences
        const shouldSend = 
          (notification_type === 'study_tips' && user.comm_study_tips) ||
          (notification_type === 'content_updates' && user.comm_content_updates) ||
          (notification_type === 'assessment_reminders' && user.comm_assessment_reminders) ||
          (notification_type === 'progress_reports' && user.comm_progress_reports) ||
          notification_type === 'system' ||
          notification_type === 'achievement' ||
          notification_type === 'forum_reply' ||
          notification_type === 'study_streak' ||
          notification_type === 'quiz_reminder' ||
          notification_type === 'buddy_request' ||
          notification_type === 'group_message' ||
          notification_type === 'career_deadline' ||
          notification_type === 'admin_announcement' ||
          priority === 'high' ||
          priority === 'urgent';

        if (!shouldSend && !userPref) {
          results.skipped++;
          continue;
        }

        // Determine active channels
        const activeChannels = userPref?.channels || channels;
        
        // Check quiet hours (except for urgent notifications)
        if (userPref?.quiet_hours && priority !== 'urgent') {
          const quietHours = userPref.quiet_hours as { enabled: boolean; start: string; end: string };
          if (quietHours.enabled) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const isQuietTime = (quietHours.start <= quietHours.end)
              ? (currentTime >= quietHours.start && currentTime <= quietHours.end)
              : (currentTime >= quietHours.start || currentTime <= quietHours.end);
            
            if (isQuietTime) {
              console.log(`[send-notifications] User ${user.id} is in quiet hours`);
              results.skipped++;
              continue;
            }
          }
        }

        // Check rate limiting (5 notifications per hour for non-urgent)
        if (priority !== 'urgent' && priority !== 'high') {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: recentNotifications } = await supabaseClient
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .gte('sent_at', oneHourAgo)
            .limit(10);

          if (recentNotifications && recentNotifications.length >= 5) {
            console.log(`[send-notifications] Rate limit for user ${user.id}`);
            results.skipped++;
            continue;
          }
        }

        const deliveryStatus: Record<string, boolean> = {};

        // 1. Create in-app notification
        if (activeChannels.includes('in_app')) {
          const { error: insertError } = await supabaseClient
            .from('notifications')
            .insert({
              user_id: user.id,
              notification_type,
              title,
              message,
              action_url,
              icon_name: icon_name || 'bell',
              priority_level: priority,
              delivery_channels: activeChannels,
              delivery_status: { in_app_delivered: true },
              metadata,
              expires_at,
            });

          if (insertError) {
            console.error(`[send-notifications] Failed to create notification for ${user.id}:`, insertError);
            deliveryStatus.in_app_delivered = false;
          } else {
            deliveryStatus.in_app_delivered = true;
            results.notifications_created++;
          }
        }

        // 2. Send email notification
        if (activeChannels.includes('email') && user.email && resend) {
          try {
            // Get email template
            const { data: template } = await supabaseClient
              .from('email_templates')
              .select('*')
              .eq('template_name', notification_type)
              .eq('is_active', true)
              .single();

            let htmlBody = template?.html_body || getDefaultEmailTemplate();
            let subject = template?.subject_line || title;

            // Replace placeholders
            htmlBody = htmlBody
              .replace(/\{\{title\}\}/g, title)
              .replace(/\{\{message\}\}/g, message)
              .replace(/\{\{action_url\}\}/g, action_url || 'https://edufutura.app/dashboard')
              .replace(/\{\{user_name\}\}/g, user.full_name || 'Student')
              .replace(/\{\{unsubscribe_url\}\}/g, 'https://edufutura.app/settings?tab=preferences');

            subject = subject
              .replace(/\{\{title\}\}/g, title);

            const { error: emailError } = await resend.emails.send({
              from: template?.from_name 
                ? `${template.from_name} <${template.from_email || 'notifications@edufutura.app'}>`
                : 'EduFutura <notifications@edufutura.app>',
              to: [user.email],
              subject,
              html: htmlBody,
            });

            if (emailError) {
              console.error(`[send-notifications] Email error for ${user.id}:`, emailError);
              deliveryStatus.email_sent = false;
            } else {
              console.log(`[send-notifications] Email sent to ${user.email}`);
              deliveryStatus.email_sent = true;
              deliveryStatus.email_delivered = true;
            }
          } catch (emailErr) {
            console.error(`[send-notifications] Email exception for ${user.id}:`, emailErr);
            deliveryStatus.email_sent = false;
          }
        }

        // 3. Log analytics
        await supabaseClient
          .from('notification_analytics')
          .insert({
            user_id: user.id,
            notification_type,
            channel: activeChannels.join(','),
            event_type: 'sent',
            metadata: { priority, title },
          });

        // Log to activity
        await supabaseClient
          .from('activity_log')
          .insert({
            user_id: user.id,
            activity_type: 'notification_sent',
            activity_description: `Notification: ${title}`,
            metadata: {
              notification_type,
              channels: activeChannels,
              priority,
            },
          });

        results.sent++;

      } catch (userError) {
        console.error(`[send-notifications] Error processing user ${user.id}:`, userError);
        results.failed++;
      }
    }

    console.log(`[send-notifications] Complete:`, results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[send-notifications] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getDefaultEmailTemplate(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background-color: #FAF6F1; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 30px; line-height: 1.6; color: #333; }
        .content h2 { color: #1B4332; margin-top: 0; }
        .button { display: inline-block; background: #D4AF37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #C19B28; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .footer a { color: #1B4332; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 EduFutura</h1>
        </div>
        <div class="content">
          <h2>{{title}}</h2>
          <p>{{message}}</p>
          <p><a href="{{action_url}}" class="button">View Details</a></p>
        </div>
        <div class="footer">
          <p>© 2024 EduFutura - South African CAPS Curriculum Platform</p>
          <p><a href="{{unsubscribe_url}}">Manage notification preferences</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
