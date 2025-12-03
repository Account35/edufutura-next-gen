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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    console.log(`[track-login] Processing login for user: ${user_id}`);

    // 1. Update last_login_at timestamp
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user_id);

    if (updateError) {
      console.error('Error updating last_login_at:', updateError);
    }

    // 2. Update study streak
    const { data: userData } = await supabaseClient
      .from('users')
      .select('last_study_date, study_streak_days')
      .eq('id', user_id)
      .single();

    if (userData) {
      const today = new Date().toISOString().split('T')[0];
      const lastStudy = userData.last_study_date?.split('T')[0];
      
      let newStreak = userData.study_streak_days || 0;
      
      if (lastStudy) {
        const lastDate = new Date(lastStudy);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day - increment streak
          newStreak++;
        } else if (diffDays > 1) {
          // Gap in study - reset streak
          newStreak = 1;
        }
        // diffDays === 0 means same day, don't change streak
      } else {
        newStreak = 1;
      }

      await supabaseClient
        .from('users')
        .update({ 
          study_streak_days: newStreak,
          last_study_date: today 
        })
        .eq('id', user_id);
    }

    // 3. Log login event
    await supabaseClient
      .from('user_audit_log')
      .insert({
        user_id,
        action_type: 'login',
        action_details: {
          timestamp: new Date().toISOString(),
          method: 'session',
        },
      });

    // 4. Check for pending notifications
    const { data: pendingNotifications, error: notifError } = await supabaseClient
      .from('activity_log')
      .select('id, activity_description, created_at')
      .eq('user_id', user_id)
      .eq('activity_type', 'pending_notification')
      .order('created_at', { ascending: false })
      .limit(10);

    const unreadCount = pendingNotifications?.length || 0;

    // 5. Refresh user-related materialized views (queued as background job)
    await supabaseClient
      .from('background_jobs')
      .insert({
        job_type: 'refresh_user_views',
        payload: { user_id },
        scheduled_at: new Date().toISOString(),
      });

    console.log(`[track-login] Login tracked for user: ${user_id}, unread: ${unreadCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        unread_notifications: unreadCount,
        streak_days: userData?.study_streak_days || 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Track login error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});