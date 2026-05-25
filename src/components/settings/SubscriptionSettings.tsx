import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { ReportUpload } from '@/components/settings/ReportUpload';
import { Crown, Calendar, CreditCard } from 'lucide-react';
import { PRICING } from '@/config/pricing';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import type { SubscriptionUpdatedEventDetail } from '@/types/paystack';

interface SubscriptionSettingsProps {
  userId: string;
}

export const SubscriptionSettings = ({ userId }: SubscriptionSettingsProps) => {
  const {
    isPremium,
    subscriptionStatus,
    subscriptionPlan,
    daysRemaining,
    subscriptionEndDate,
    nextPaymentDate,
    lastPaymentDate,
    checkSubscription,
  } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  useEffect(() => {
    void loadSubscriptionHistory();
  }, [userId]);

  useEffect(() => {
    const handleSubscriptionUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<SubscriptionUpdatedEventDetail>;
      const detail = customEvent.detail;

      if (detail?.paymentStatus === 'success') {
        setSubscriptionHistory((current) => {
          const alreadyExists = current.some((item) => item.transaction_id === detail.reference);
          if (alreadyExists) return current;

          return [
            {
              id: `local-${detail.reference}`,
              transaction_id: detail.reference,
              transaction_type: detail.paymentType === 'recurring' ? 'renewal' : 'upgrade',
              plan_type: detail.planType,
              amount_zar: detail.amount,
              currency: 'ZAR',
              payment_method: detail.paymentMethod,
              payment_status: 'completed',
              subscription_end_date: detail.subscriptionEndDate,
              transaction_date: detail.transactionDate,
            },
            ...current,
          ];
        });
      }

      void checkSubscription();
      void loadSubscriptionHistory();
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdated);
    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdated);
    };
  }, [checkSubscription, userId]);

  const loadSubscriptionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_history')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setSubscriptionHistory(data || []);
    } catch (error) {
      console.error('Error loading subscription history:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isPremium && <Crown className="h-5 w-5 text-accent" />}
            Current Plan
          </CardTitle>
          <CardDescription>
            {isPremium ? 'You have access to all premium features' : 'Upgrade to unlock premium features'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">
                {isPremium ? 'Premium' : 'Free'}
              </p>
              {isPremium && subscriptionPlan && (
                <p className="text-sm text-muted-foreground capitalize">
                  {subscriptionPlan} billing
                </p>
              )}
            </div>
            <Badge variant={isPremium ? 'default' : 'secondary'}>
              {subscriptionStatus}
            </Badge>
          </div>

          {isPremium && daysRemaining !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{daysRemaining} days remaining</span>
            </div>
          )}

          {isPremium && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
              {subscriptionEndDate && (
                <p className="text-muted-foreground">
                  Access expires on <span className="font-medium text-foreground">{format(new Date(subscriptionEndDate), 'd MMM yyyy')}</span>
                </p>
              )}
              {nextPaymentDate && (
                <p className="text-muted-foreground">
                  Next payment date: <span className="font-medium text-foreground">{format(new Date(nextPaymentDate), 'd MMM yyyy')}</span>
                </p>
              )}
              {lastPaymentDate && (
                <p className="text-muted-foreground">
                  Last payment: <span className="font-medium text-foreground">{format(new Date(lastPaymentDate), 'd MMM yyyy')}</span>
                </p>
              )}
            </div>
          )}

          {!isPremium && (
            <div className="pt-4 border-t">
              <p className="text-sm mb-4">
                Upgrade to Premium for {PRICING.CURRENCY_SYMBOL}{PRICING.MONTHLY_PRICE}/month
              </p>
              <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Year-End Report Upload */}
      <ReportUpload userId={userId} />

      {/* Payment History */}
      {subscriptionHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
            <CardDescription>Your recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subscriptionHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {transaction.transaction_type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.transaction_date), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {transaction.currency} {transaction.amount_zar?.toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
};
