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

    const { email } = await req.json();

    console.log(`[send-password-reset] Processing reset request for: ${email}`);

    // 1. Check if user exists
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      // Don't reveal if user exists or not for security
      console.log('[send-password-reset] User not found, returning success anyway');
      return new Response(
        JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Generate secure reset token (1 hour expiry)
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // 3. Log reset request for security monitoring
    await supabaseClient
      .from('user_audit_log')
      .insert({
        user_id: userData.id,
        action_type: 'password_reset_requested',
        action_details: {
          email,
          token_expires_at: expiresAt,
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        },
      });

    // 4. Check for unusual patterns (multiple resets in short time)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentResets } = await supabaseClient
      .from('user_audit_log')
      .select('id')
      .eq('user_id', userData.id)
      .eq('action_type', 'password_reset_requested')
      .gte('created_at', oneHourAgo);

    if (recentResets && recentResets.length > 3) {
      console.warn(`[send-password-reset] Unusual reset pattern for user: ${userData.id}`);
      // Log security alert but still process request
      await supabaseClient
        .from('user_audit_log')
        .insert({
          user_id: userData.id,
          action_type: 'security_alert',
          action_details: {
            alert_type: 'multiple_password_resets',
            reset_count: recentResets.length,
          },
        });
    }

    // 5. Send reset email via background job
    const resetEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #FAF6F1; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; line-height: 1.6; color: #333; }
          .button { display: inline-block; background: #D4AF37; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .warning { background: #FFF3CD; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${userData.full_name || 'Student'}!</h2>
            <p>We received a request to reset your EduFutura password.</p>
            
            <p style="text-align: center;">
              <a href="https://edufutura.app/reset-password?token=${resetToken}" class="button">
                Reset My Password
              </a>
            </p>
            
            <div class="warning">
              <strong>⏰ This link expires in 1 hour.</strong>
              <p style="margin: 0;">If you didn't request this reset, please ignore this email or contact support if you're concerned.</p>
            </div>
            
            <p>For security, this request was logged:</p>
            <ul>
              <li>Time: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</li>
              <li>IP: ${req.headers.get('x-forwarded-for') || 'Unknown'}</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2024 EduFutura - South African CAPS Curriculum Platform</p>
            <p>If you need help, contact <a href="mailto:support@edufutura.app">support@edufutura.app</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await supabaseClient
      .from('background_jobs')
      .insert({
        job_type: 'send_email',
        payload: {
          recipient: email,
          subject: '🔐 Reset Your EduFutura Password',
          bodyHtml: resetEmailHTML,
        },
        scheduled_at: new Date().toISOString(),
      });

    console.log(`[send-password-reset] Reset email queued for: ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset email sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});