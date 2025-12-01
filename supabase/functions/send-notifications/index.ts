import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { notification_type, recipient_user_ids, notification_data } = await req.json();

    const { title, message, action_url, priority } = notification_data;

    // Get user preferences and contact info
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('id, email, phone_number, full_name, comm_study_tips, comm_content_updates, comm_assessment_reminders, comm_progress_reports')
      .in('id', recipient_user_ids);

    if (usersError || !users) {
      throw new Error('Failed to fetch user data');
    }

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const user of users) {
      // Check notification preferences
      const shouldSend = 
        (notification_type === 'study_tips' && user.comm_study_tips) ||
        (notification_type === 'content_updates' && user.comm_content_updates) ||
        (notification_type === 'assessment_reminders' && user.comm_assessment_reminders) ||
        (notification_type === 'progress_reports' && user.comm_progress_reports) ||
        notification_type === 'system' || // Always send system notifications
        priority === 'high'; // Always send high priority

      if (!shouldSend) {
        results.skipped++;
        continue;
      }

      // Check rate limiting (5 emails per day)
      const today = new Date().toISOString().split('T')[0];
      const { data: recentNotifications } = await supabaseClient
        .from('activity_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('activity_type', 'notification_sent')
        .gte('created_at', today)
        .limit(5);

      if (recentNotifications && recentNotifications.length >= 5 && priority !== 'high') {
        results.skipped++;
        continue;
      }

      try {
        // Send email notification (simplified - integrate with actual email service)
        const emailHTML = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; background-color: #FAF6F1; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; line-height: 1.6; color: #333; }
              .button { display: inline-block; background: #D4AF37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🎓 EduFutura</h1>
              </div>
              <div class="content">
                <h2>${title}</h2>
                <p>${message}</p>
                ${action_url ? `<a href="${action_url}" class="button">View Details</a>` : ''}
              </div>
              <div class="footer">
                <p>© 2024 EduFutura - South African CAPS Curriculum Platform</p>
                <p><a href="https://edufutura.app/settings">Manage notification preferences</a></p>
              </div>
            </div>
          </body>
          </html>
        `;

        // Log notification (in production, actually send via SendGrid/SMTP)
        await supabaseClient
          .from('activity_log')
          .insert({
            user_id: user.id,
            activity_type: 'notification_sent',
            activity_description: `Email: ${title}`,
            metadata: {
              notification_type,
              channel: 'email',
              priority,
            },
          });

        results.sent++;

      } catch (notifError) {
        console.error(`Failed to send notification to ${user.id}:`, notifError);
        results.failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notification sending error:', error);
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
