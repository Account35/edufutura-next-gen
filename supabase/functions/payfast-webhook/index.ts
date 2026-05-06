import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto as stdCrypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate PayFast ITN signature using MD5 per PayFast spec
async function validatePayFastSignature(
  data: Record<string, string>,
  passphrase: string,
): Promise<boolean> {
  const provided = data.signature;
  if (!provided) return false;

  // Build param string in the order received, excluding the signature field
  const entries = Object.entries(data).filter(([k]) => k !== 'signature');
  const paramString = entries
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v)).replace(/%20/g, '+')}`)
    .join('&');
  const toHash = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : paramString;

  const buf = await stdCrypto.subtle.digest('MD5', new TextEncoder().encode(toHash));
  const computed = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return computed.toLowerCase() === provided.toLowerCase();
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

    const formData = await req.formData();
    const paymentData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      paymentData[key] = String(value);
    }

    console.log('PayFast webhook received for payment id:', paymentData.pf_payment_id);

    // Validate PayFast ITN signature before trusting any payload
    const PAYFAST_PASSPHRASE = Deno.env.get('PAYFAST_PASSPHRASE') || '';
    const signatureValid = await validatePayFastSignature(paymentData, PAYFAST_PASSPHRASE);
    if (!signatureValid) {
      console.error('PayFast webhook rejected: invalid signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const {
      m_payment_id,
      pf_payment_id,
      payment_status,
      item_name,
      amount_gross,
      amount_fee,
      amount_net,
      custom_str1, // user_id
      signature,
    } = paymentData;

    if (!custom_str1) {
      throw new Error('Missing user_id in payment data');
    }

    const user_id = custom_str1;

    // Get current subscription
    const { data: currentUser, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !currentUser) {
      throw new Error('User not found');
    }

    if (payment_status === 'COMPLETE') {
      // Successful payment - activate subscription
      const isMonthly = item_name?.toLowerCase().includes('monthly');
      const planType = isMonthly ? 'monthly' : 'annual';
      const duration = isMonthly ? 30 : 365;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      // Update user subscription
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({
          account_type: 'premium',
          subscription_status: 'active',
          subscription_plan: planType,
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          payment_method: 'payfast',
          payfast_subscription_token: pf_payment_id,
          last_payment_date: new Date().toISOString(),
          next_payment_date: endDate.toISOString(),
        })
        .eq('id', user_id);

      if (updateError) {
        throw new Error('Failed to update subscription');
      }

      // Log transaction
      await supabaseClient
        .from('subscription_history')
        .insert({
          user_id,
          transaction_id: pf_payment_id || m_payment_id,
          transaction_type: currentUser.subscription_status === 'active' ? 'renewal' : 'upgrade',
          plan_type: planType,
          amount_zar: parseFloat(amount_gross) || 0,
          payment_status: 'completed',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          payment_method: 'payfast',
        });

      // Log activity
      await supabaseClient
        .from('activity_log')
        .insert({
          user_id,
          activity_type: 'subscription_activated',
          activity_description: `Subscription activated: ${planType} plan`,
          metadata: {
            payment_id: pf_payment_id,
            amount: amount_gross,
          },
        });

      // Send confirmation notification
      await supabaseClient.functions.invoke('send-notifications', {
        body: {
          notification_type: 'system',
          recipient_user_ids: [user_id],
          notification_data: {
            title: 'Payment Successful!',
            message: `Your ${planType} subscription is now active. Premium features unlocked!`,
            action_url: '/dashboard',
            priority: 'high',
          },
        },
      }).then(() => {}, () => {}); // Ignore notification errors

    } else if (payment_status === 'FAILED' || payment_status === 'CANCELLED') {
      // Failed payment
      console.log(`Payment ${payment_status} for user ${user_id}`);

      // Log failed transaction
      await supabaseClient
        .from('subscription_history')
        .insert({
          user_id,
          transaction_id: pf_payment_id || m_payment_id,
          transaction_type: 'upgrade',
          plan_type: item_name?.toLowerCase().includes('monthly') ? 'monthly' : 'annual',
          amount_zar: parseFloat(amount_gross) || 0,
          payment_status: 'failed',
          payment_method: 'payfast',
        });

      // Send notification
      await supabaseClient.functions.invoke('send-notifications', {
        body: {
          notification_type: 'system',
          recipient_user_ids: [user_id],
          notification_data: {
            title: 'Payment Failed',
            message: 'Your payment could not be processed. Please try again or contact support.',
            action_url: '/settings',
            priority: 'high',
          },
        },
      }).then(() => {}, () => {});

    } else if (payment_status === 'PENDING') {
      // Payment pending - log but don't activate yet
      console.log(`Payment pending for user ${user_id}`);
    }

    // Always return 200 OK to PayFast
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PayFast webhook error:', error);
    // Still return 200 to prevent retries, but log the error
    return new Response(
      JSON.stringify({ success: false, error: 'Webhook processing failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
