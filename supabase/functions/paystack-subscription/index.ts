import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type BillingPlan = 'monthly' | 'annual';
type PaymentType = 'one_time' | 'recurring';

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

const PLAN_CONFIG: Record<BillingPlan, { amount: number; interval: 'monthly' | 'annually'; durationDays: number; displayName: string }> = {
  monthly: {
    amount: 60,
    interval: 'monthly',
    durationDays: 30,
    displayName: 'EduFutura Monthly Premium',
  },
  annual: {
    amount: 120,
    interval: 'annually',
    durationDays: 365,
    displayName: 'EduFutura Annual Premium',
  },
};

const decoder = new TextDecoder();

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const parseSubscriptionToken = (value: string | null) => {
  if (!value) return null;

  try {
    return JSON.parse(value) as {
      provider?: string;
      subscription_code?: string;
      email_token?: string;
      customer_code?: string;
      authorization_code?: string;
      plan_code?: string;
    };
  } catch {
    return null;
  }
};

const getPaystackHeaders = () => {
  const secretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }

  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
};

const paystackRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      ...getPaystackHeaders(),
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json();

  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.message || `Paystack request failed for ${path}`);
  }

  return payload.data as T;
};

const getAuthenticatedUser = async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header.');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser();

  if (error || !user) {
    throw new Error('Authentication required.');
  }

  return user;
};

const getServiceClient = () =>
  createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

const ensureRecurringPlan = async (planType: BillingPlan) => {
  const envKey = planType === 'monthly' ? 'PAYSTACK_MONTHLY_PLAN_CODE' : 'PAYSTACK_ANNUAL_PLAN_CODE';
  const configuredPlanCode = Deno.env.get(envKey);
  if (configuredPlanCode) {
    return configuredPlanCode;
  }

  const config = PLAN_CONFIG[planType];
  const plans = await paystackRequest<Array<{ plan_code: string; name: string; amount: number; interval: string }>>('/plan');
  const existingPlan = plans.find(
    (plan) =>
      plan.name === config.displayName &&
      plan.amount === config.amount * 100 &&
      plan.interval === config.interval,
  );

  if (existingPlan) {
    return existingPlan.plan_code;
  }

  const createdPlan = await paystackRequest<{ plan_code: string }>('/plan', {
    method: 'POST',
    body: JSON.stringify({
      name: config.displayName,
      amount: config.amount * 100,
      interval: config.interval,
      currency: 'ZAR',
    }),
  });

  return createdPlan.plan_code;
};

const updateSubscriptionRecords = async ({
  supabaseClient,
  userId,
  userEmail,
  planType,
  paymentType,
  transactionId,
  amount,
  paymentMethod = 'paystack',
  paidAt,
  subscriptionCode,
  emailToken,
  customerCode,
  authorizationCode,
  planCode,
}: {
  supabaseClient: ReturnType<typeof getServiceClient>;
  userId: string;
  userEmail: string | null | undefined;
  planType: BillingPlan;
  paymentType: PaymentType;
  transactionId: string;
  amount: number;
  paymentMethod?: string;
  paidAt: Date;
  subscriptionCode?: string | null;
  emailToken?: string | null;
  customerCode?: string | null;
  authorizationCode?: string | null;
  planCode?: string | null;
}) => {
  const currentUserResponse = await supabaseClient
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .maybeSingle();

  if (currentUserResponse.error) {
    throw currentUserResponse.error;
  }

  const subscriptionEndDate = addDays(paidAt, PLAN_CONFIG[planType].durationDays);
  const subscriptionPayload =
    paymentType === 'recurring'
      ? JSON.stringify({
          provider: 'paystack',
          subscription_code: subscriptionCode,
          email_token: emailToken,
          customer_code: customerCode,
          authorization_code: authorizationCode,
          plan_code: planCode,
        })
      : null;

  const { error: updateError } = await supabaseClient
    .from('users')
    .update({
      account_type: 'premium',
      subscription_status: 'active',
      subscription_plan: planType,
      subscription_start_date: paidAt.toISOString(),
      subscription_end_date: subscriptionEndDate.toISOString(),
      payment_method: paymentMethod,
      payfast_subscription_token: subscriptionPayload,
      last_payment_date: paidAt.toISOString(),
      next_payment_date: paymentType === 'recurring' ? subscriptionEndDate.toISOString() : null,
      subscription_auto_renew: paymentType === 'recurring',
      subscription_cancelled_at: null,
    } as any)
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  const existingTransaction = await supabaseClient
    .from('subscription_history')
    .select('id')
    .eq('transaction_id', transactionId)
    .maybeSingle();

  if (existingTransaction.error) {
    throw existingTransaction.error;
  }

  if (!existingTransaction.data) {
    const { error: historyError } = await supabaseClient
      .from('subscription_history')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        transaction_type: currentUserResponse.data?.subscription_status === 'active' ? 'renewal' : 'upgrade',
        plan_type: planType,
        amount_zar: amount,
        currency: 'ZAR',
        payment_status: 'completed',
        subscription_start_date: paidAt.toISOString(),
        subscription_end_date: subscriptionEndDate.toISOString(),
        payment_method: paymentMethod,
      });

    if (historyError) {
      throw historyError;
    }
  }

  return {
    userId,
    userEmail,
    planType,
    paymentType,
    amount,
    subscriptionEndDate: subscriptionEndDate.toISOString(),
    nextPaymentDate: paymentType === 'recurring' ? subscriptionEndDate.toISOString() : null,
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const action = body.action as 'initialize' | 'verify' | 'cancel-recurring' | undefined;
      const supabaseClient = getServiceClient();

      if (action === 'initialize') {
        const user = await getAuthenticatedUser(req);
        const planType = body.planType as BillingPlan;
        const paymentType = body.paymentType as PaymentType;

        if (!planType || !PLAN_CONFIG[planType]) {
          return buildErrorResponse('Invalid plan selected.');
        }

        if (!paymentType || !['one_time', 'recurring'].includes(paymentType)) {
          return buildErrorResponse('Invalid payment type selected.');
        }

        const publicKey = Deno.env.get('PAYSTACK_PUBLIC_KEY');
        if (!publicKey) {
          return buildErrorResponse('PAYSTACK_PUBLIC_KEY is not configured.', 500);
        }

        const amount = PLAN_CONFIG[planType].amount;
        const reference = `edufutura_${planType}_${paymentType}_${crypto.randomUUID()}`;

        return new Response(
          JSON.stringify({
            publicKey,
            email: user.email,
            amount,
            currency: 'ZAR',
            reference,
            planType,
            paymentType,
            label: 'EduFutura Premium',
            metadata: {
              user_id: user.id,
              plan_type: planType,
              payment_type: paymentType,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      if (action === 'verify') {
        const user = await getAuthenticatedUser(req);
        const reference = body.reference as string | undefined;
        if (!reference) {
          return buildErrorResponse('Payment reference is required.');
        }

        const verification = await paystackRequest<any>(`/transaction/verify/${reference}`);

        if (verification.status !== 'success') {
          return buildErrorResponse('Payment was not successful.');
        }

        const metadata = verification.metadata || {};
        const planType = metadata.plan_type as BillingPlan;
        const paymentType = metadata.payment_type as PaymentType;
        const metadataUserId = metadata.user_id as string | undefined;

        if (!planType || !PLAN_CONFIG[planType]) {
          return buildErrorResponse('Payment plan metadata is missing.');
        }

        if (!paymentType || !['one_time', 'recurring'].includes(paymentType)) {
          return buildErrorResponse('Payment type metadata is missing.');
        }

        if (metadataUserId && metadataUserId !== user.id) {
          return buildErrorResponse('Payment does not belong to the authenticated user.', 403);
        }

        let subscriptionCode: string | null = null;
        let emailToken: string | null = null;
        let planCode: string | null = null;

        if (paymentType === 'recurring') {
          planCode = await ensureRecurringPlan(planType);

          const createdSubscription = await paystackRequest<any>('/subscription', {
            method: 'POST',
            body: JSON.stringify({
              customer: verification.customer?.customer_code,
              plan: planCode,
              authorization: verification.authorization?.authorization_code,
            }),
          });

          subscriptionCode = createdSubscription.subscription_code || null;
          emailToken = createdSubscription.email_token || null;
        }

        const paidAt = verification.paid_at ? new Date(verification.paid_at) : new Date();
        const amount = typeof verification.amount === 'number'
          ? verification.amount / 100
          : PLAN_CONFIG[planType].amount;

        const updatedSubscription = await updateSubscriptionRecords({
          supabaseClient,
          userId: user.id,
          userEmail: user.email,
          planType,
          paymentType,
          transactionId: verification.reference,
          amount,
          paidAt,
          subscriptionCode,
          emailToken,
          customerCode: verification.customer?.customer_code || null,
          authorizationCode: verification.authorization?.authorization_code || null,
          planCode,
        });

        return new Response(
          JSON.stringify({
            subscriptionStatus: 'active',
            paymentStatus: 'success',
            planType,
            paymentType,
            amount: updatedSubscription.amount,
            nextPaymentDate: updatedSubscription.nextPaymentDate,
            subscriptionEndDate: updatedSubscription.subscriptionEndDate,
            autoRenew: paymentType === 'recurring',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      if (action === 'cancel-recurring') {
        const user = await getAuthenticatedUser(req);
        const { data: currentUser, error } = await supabaseClient
          .from('users')
          .select('payfast_subscription_token, payment_method')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!currentUser || currentUser.payment_method !== 'paystack') {
          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        const tokenPayload = parseSubscriptionToken(currentUser.payfast_subscription_token);

        if (tokenPayload?.subscription_code && tokenPayload?.email_token) {
          await paystackRequest('/subscription/disable', {
            method: 'POST',
            body: JSON.stringify({
              code: tokenPayload.subscription_code,
              token: tokenPayload.email_token,
            }),
          });
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return buildErrorResponse('Unsupported action.');
    }

    if (req.method === 'GET') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return buildErrorResponse('Method not allowed.', 405);
  } catch (error) {
    console.error('paystack-subscription error:', error);
    return buildErrorResponse(
      error instanceof Error ? error.message : 'Unknown payment error.',
      500,
    );
  }
});
