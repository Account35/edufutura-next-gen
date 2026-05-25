import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type BillingPlan = 'monthly' | 'annual';
type PaymentType = 'one_time' | 'recurring';

const PLAN_CONFIG: Record<BillingPlan, { amount: number; durationDays: number }> = {
  monthly: { amount: 60, durationDays: 30 },
  annual: { amount: 120, durationDays: 365 },
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const getServiceClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

const parsePlanType = (value: string | undefined | null): BillingPlan => {
  const normalized = (value || '').toLowerCase();
  return normalized.includes('annual') ? 'annual' : 'monthly';
};

const updateSubscriptionFromWebhook = async ({
  supabaseClient,
  userId,
  transactionId,
  amount,
  planType,
  paymentType,
  paidAt,
}: {
  supabaseClient: ReturnType<typeof getServiceClient>;
  userId: string;
  transactionId: string;
  amount: number;
  planType: BillingPlan;
  paymentType: PaymentType;
  paidAt: Date;
}) => {
  const endDate = addDays(paidAt, PLAN_CONFIG[planType].durationDays);

  const { error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_type: 'premium',
      subscription_status: 'active',
      subscription_plan: planType,
      subscription_start_date: paidAt.toISOString(),
      subscription_end_date: endDate.toISOString(),
      payment_method: 'paystack',
      last_payment_date: paidAt.toISOString(),
      next_payment_date: paymentType === 'recurring' ? endDate.toISOString() : null,
      subscription_auto_renew: paymentType === 'recurring',
      subscription_cancelled_at: null,
    } as any)
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  const existing = await supabaseClient
    .from('subscription_history')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (!existing.data) {
    const { error: historyError } = await supabaseClient
      .from('subscription_history')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        transaction_type: paymentType === 'recurring' ? 'renewal' : 'upgrade',
        plan_type: planType,
        amount_zar: amount,
        currency: 'ZAR',
        payment_status: 'completed',
        subscription_start_date: paidAt.toISOString(),
        subscription_end_date: endDate.toISOString(),
        payment_method: 'paystack',
      });

    if (historyError) {
      throw historyError;
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured.');
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secretKey),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign'],
    );

    const computedSignature = toHex(
      await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(rawBody)),
    );

    if (computedSignature !== signature) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(rawBody);
    const supabaseClient = getServiceClient();

    if (event.event === 'charge.success') {
      const transaction = event.data;
      const metadata = transaction.metadata || {};
      const userEmail = transaction.customer?.email as string | undefined;
      const metadataUserId = metadata.user_id as string | undefined;

      let userId = metadataUserId;

      if (!userId && userEmail) {
        const { data: matchedUser } = await supabaseClient
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        userId = matchedUser?.id;
      }

      if (userId) {
        const planType = parsePlanType((metadata.plan_type as string | undefined) || transaction.plan?.name);
        const paymentType: PaymentType =
          metadata.payment_type === 'recurring' || transaction.plan ? 'recurring' : 'one_time';

        await updateSubscriptionFromWebhook({
          supabaseClient,
          userId,
          transactionId: transaction.reference,
          amount: typeof transaction.amount === 'number' ? transaction.amount / 100 : PLAN_CONFIG[planType].amount,
          planType,
          paymentType,
          paidAt: transaction.paid_at ? new Date(transaction.paid_at) : new Date(),
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('paystack-webhook error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown webhook error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
