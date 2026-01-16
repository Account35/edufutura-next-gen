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

    const { user_id, email, full_name } = await req.json();

    console.log(`[welcome-new-user] Processing new user: ${user_id}`);

    // Run initialization operations in parallel for better performance
    const [prefsResult, repResult] = await Promise.all([
      // 1. Create default study preferences
      supabaseClient
        .from('study_preferences')
        .upsert({
          user_id,
          learning_style: 'visual',
          study_pace: 'moderate',
          preferred_study_time: 'evening',
          daily_goal_minutes: 60,
          weekly_goal_hours: 5,
          study_reminders_enabled: true,
          reading_font_size: 'medium',
          dark_mode_enabled: false,
        }, { onConflict: 'user_id' }),

      // 2. Initialize user reputation (Phase 8)
      supabaseClient
        .from('user_reputation')
        .upsert({
          user_id,
          reputation_score: 0,
          current_level: 'Newcomer',
          helpful_posts: 0,
          quality_resources: 0,
          positive_ratings: 0,
          solutions_marked: 0,
          warnings_received: 0,
        }, { onConflict: 'user_id' })
    ]);

    if (prefsResult.error) {
      console.error('Error creating study preferences:', prefsResult.error);
    }

    if (repResult.error) {
      console.error('Error initializing reputation:', repResult.error);
    }

    // 3. Log signup event for analytics
    const { error: logError } = await supabaseClient
      .from('activity_log')
      .insert({
        user_id,
        activity_type: 'account_created',
        activity_description: 'New user account created',
        metadata: {
          source: 'signup',
          timestamp: new Date().toISOString(),
        },
      });

    if (logError) {
      console.error('Error logging signup:', logError);
    }

    // 4. Queue welcome email
    const welcomeEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #FAF6F1; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; line-height: 1.6; color: #333; }
          .button { display: inline-block; background: #D4AF37; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { padding: 15px; background: #f9f9f9; border-radius: 8px; margin: 10px 0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 Welcome to EduFutura!</h1>
          </div>
          <div class="content">
            <h2>Hello ${full_name || 'Student'}! 👋</h2>
            <p>Welcome to EduFutura, your AI-powered learning companion aligned with the South African CAPS curriculum.</p>
            
            <h3>Getting Started Guide:</h3>
            
            <div class="feature">
              <strong>📚 Step 1: Complete Your Profile</strong>
              <p>Add your grade level, school, and subjects to personalize your learning experience.</p>
            </div>
            
            <div class="feature">
              <strong>📖 Step 2: Browse Curriculum</strong>
              <p>Explore CAPS-aligned content for all your subjects with chapters, quizzes, and key concepts.</p>
            </div>
            
            <div class="feature">
              <strong>🤖 Step 3: Meet Your AI Tutor</strong>
              <p>Ask questions anytime! Our AI tutor is here to help explain concepts and guide your studies.</p>
            </div>
            
            <div class="feature">
              <strong>🏆 Step 4: Track Your Progress</strong>
              <p>Complete quizzes, earn badges, and watch your knowledge grow!</p>
            </div>
            
            <a href="https://edufutura.app/dashboard" class="button">Start Learning Now</a>
            
            <p>If you have any questions, our support team is always here to help.</p>
            <p>Happy Learning! 📚✨</p>
          </div>
          <div class="footer">
            <p>© 2024 EduFutura - South African CAPS Curriculum Platform</p>
            <p>Empowering South African students with quality education</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Queue email in background jobs
    const { error: jobError } = await supabaseClient
      .from('background_jobs')
      .insert({
        job_type: 'send_email',
        payload: {
          recipient: email,
          subject: '🎓 Welcome to EduFutura - Your Learning Journey Begins!',
          bodyHtml: welcomeEmailHTML,
        },
        scheduled_at: new Date().toISOString(),
      });

    if (jobError) {
      console.error('Error queueing welcome email:', jobError);
    }

    console.log(`[welcome-new-user] Successfully processed user: ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Welcome flow completed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Welcome new user error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});