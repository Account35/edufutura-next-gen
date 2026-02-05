 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 interface IncompleteUser {
   user_id: string;
   email: string;
   full_name: string;
   phone_number: string | null;
   onboarding_started_at: string;
   onboarding_step: number | null;
   last_reminder_sent: string | null;
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     let config = { hours_since_start: 24, dry_run: false };
     try {
       const body = await req.json();
       config = { ...config, ...body };
     } catch {
       // Use defaults
     }
 
     console.log('[Onboarding Reminders] Starting with config:', config);
 
     const { data: users, error: usersError } = await supabase
       .rpc('get_incomplete_onboarding_users', {
         hours_since_start: config.hours_since_start,
         max_reminders_per_day: 1,
       });
 
     if (usersError) {
       console.error('[Onboarding Reminders] Error fetching users:', usersError);
       throw usersError;
     }
 
     console.log(`[Onboarding Reminders] Found ${users?.length || 0} users needing reminders`);
 
     if (!users || users.length === 0) {
       return new Response(
         JSON.stringify({ message: 'No users need reminders', processed: 0 }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     let processed = 0;
     let successCount = 0;
     let failedCount = 0;
     const errorList: string[] = [];
 
     for (const user of users as IncompleteUser[]) {
       processed++;
 
       if (config.dry_run) {
         console.log(`[Onboarding Reminders] [DRY RUN] Would send to ${user.email}`);
         successCount++;
         continue;
       }
 
       try {
         const startedAt = new Date(user.onboarding_started_at);
         const hoursSinceStart = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);
         
         let reminderType = 'email_day1';
         if (hoursSinceStart >= 168) reminderType = 'email_day7';
         else if (hoursSinceStart >= 72) reminderType = 'email_day3';
 
         await supabase.from('onboarding_reminder_log').insert({
           user_id: user.user_id,
           reminder_type: reminderType,
           channel: 'email',
           success: true,
         });
 
         await supabase
           .from('users')
           .update({ last_onboarding_reminder_sent_at: new Date().toISOString() })
           .eq('id', user.user_id);
 
         console.log(`[Onboarding Reminders] Sending ${reminderType} to ${user.email}`);
         successCount++;
       } catch (error) {
         console.error(`[Onboarding Reminders] Error processing ${user.email}:`, error);
         failedCount++;
         errorList.push(`${user.email}: ${error instanceof Error ? error.message : 'Unknown'}`);
       }
     }
 
     console.log('[Onboarding Reminders] Completed:', { processed, successCount, failedCount });
 
     return new Response(
       JSON.stringify({
         message: `Processed ${processed} users`,
         processed,
         successCount,
         failedCount,
         errorList,
       }),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error) {
     console.error('[Onboarding Reminders] Fatal error:', error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });