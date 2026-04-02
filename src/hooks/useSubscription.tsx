import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionUpdatedEventDetail } from '@/types/paystack';

type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'cancelled';

interface SubscriptionData {
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: 'monthly' | 'annual' | null;
  daysRemaining: number | null;
  subscriptionEndDate: string | null;
  nextPaymentDate: string | null;
  lastPaymentDate: string | null;
  paymentMethod: string | null;
  subscriptionAutoRenew: boolean;
  isLoading: boolean;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<SubscriptionData>({
    isPremium: false,
    subscriptionStatus: 'inactive',
    subscriptionPlan: null,
    daysRemaining: null,
    subscriptionEndDate: null,
    nextPaymentDate: null,
    lastPaymentDate: null,
    paymentMethod: null,
    subscriptionAutoRenew: false,
    isLoading: true,
  });

  const checkSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSubscription(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Check for expired subscriptions
      await supabase.rpc('check_subscription_status');

      // Fetch user subscription data
      const { data: userData, error } = await supabase
        .from('users')
        .select('account_type, subscription_status, subscription_plan, subscription_end_date, next_payment_date, last_payment_date, payment_method, subscription_auto_renew')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      const userEndDate = userData?.subscription_end_date
        ? new Date(userData.subscription_end_date)
        : null;
      const userDaysRemaining = userEndDate
        ? Math.ceil((userEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const hasActiveUserSubscription =
        userData?.subscription_status === 'active' &&
        !!userEndDate &&
        userEndDate.getTime() > Date.now();

      const { data: latestPayment, error: historyError } = await supabase
        .from('subscription_history')
        .select('plan_type, payment_method, payment_status, subscription_end_date, subscription_start_date, transaction_date')
        .eq('user_id', user.id)
        .eq('payment_status', 'completed')
        .order('transaction_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (historyError) throw historyError;

      const historyEndDate = latestPayment?.subscription_end_date
        ? new Date(latestPayment.subscription_end_date)
        : null;
      const historyDaysRemaining = historyEndDate
        ? Math.ceil((historyEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      const hasActiveHistorySubscription =
        !!historyEndDate && historyEndDate.getTime() > Date.now();

      const isPremium = Boolean(
        userData?.account_type === 'premium' ||
        hasActiveUserSubscription ||
        hasActiveHistorySubscription
      );

      setSubscription({
        isPremium,
        subscriptionStatus: (isPremium
          ? (userData?.subscription_status as SubscriptionStatus) || 'active'
          : (userData?.subscription_status as SubscriptionStatus) || 'inactive'),
        subscriptionPlan:
          (userData?.subscription_plan as 'monthly' | 'annual' | null) ||
          (latestPayment?.plan_type as 'monthly' | 'annual' | null) ||
          null,
        daysRemaining:
          userDaysRemaining !== null && userDaysRemaining > 0
            ? userDaysRemaining
            : historyDaysRemaining,
        subscriptionEndDate:
          userData?.subscription_end_date ||
          latestPayment?.subscription_end_date ||
          null,
        nextPaymentDate: userData?.next_payment_date || null,
        lastPaymentDate:
          userData?.last_payment_date ||
          latestPayment?.transaction_date ||
          null,
        paymentMethod:
          userData?.payment_method ||
          latestPayment?.payment_method ||
          null,
        subscriptionAutoRenew: !!userData?.subscription_auto_renew,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  useEffect(() => {
    const handleSubscriptionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<SubscriptionUpdatedEventDetail>;
      const detail = customEvent.detail;

      if (detail?.paymentStatus === 'success') {
        const endDate = detail.subscriptionEndDate ? new Date(detail.subscriptionEndDate) : null;
        const daysRemaining = endDate
          ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        setSubscription((prev) => ({
          ...prev,
          isPremium: true,
          subscriptionStatus: detail.subscriptionStatus,
          subscriptionPlan: detail.planType,
          daysRemaining,
          subscriptionEndDate: detail.subscriptionEndDate,
          nextPaymentDate: detail.nextPaymentDate,
          lastPaymentDate: detail.transactionDate,
          paymentMethod: detail.paymentMethod,
          subscriptionAutoRenew: detail.autoRenew,
          isLoading: false,
        }));
      }

      void checkSubscription();
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdated);
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdated);
    };
  }, []);

  return {
    ...subscription,
    checkSubscription,
  };
};
