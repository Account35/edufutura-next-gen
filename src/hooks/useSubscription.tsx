import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type SubscriptionStatus = 'active' | 'inactive' | 'expired' | 'cancelled';

interface SubscriptionData {
  isPremium: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: 'monthly' | 'annual' | null;
  daysRemaining: number | null;
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
        .select('account_type, subscription_status, subscription_plan, subscription_end_date, payment_method, subscription_auto_renew')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (userData) {
        const endDate = userData.subscription_end_date 
          ? new Date(userData.subscription_end_date) 
          : null;
        
        const daysRemaining = endDate 
          ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        setSubscription({
          isPremium: userData.account_type === 'premium',
          subscriptionStatus: userData.subscription_status as SubscriptionStatus,
          subscriptionPlan: userData.subscription_plan as 'monthly' | 'annual' | null,
          daysRemaining,
          paymentMethod: userData.payment_method,
          subscriptionAutoRenew: !!userData.subscription_auto_renew,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  useEffect(() => {
    const handleSubscriptionUpdated = () => {
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
