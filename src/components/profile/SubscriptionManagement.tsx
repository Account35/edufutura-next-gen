import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown, Calendar, CreditCard, Check, Lock, Loader2 } from 'lucide-react';
import { PRICING } from '@/config/pricing';
import { format } from 'date-fns';
import type { SubscriptionUpdatedEventDetail } from '@/types/paystack';

interface SubscriptionManagementProps {
  userId: string;
}

const freeFeatures = [
  'Access all CAPS curriculum',
  'Take unlimited practice quizzes',
  'Earn achievement badges',
  'Track your learning progress',
];

const premiumFeatures = [
  'AI-powered voice tutor',
  'Personalized assessments',
  'Official certificates',
  'Community forums',
  'Career guidance',
];

export const SubscriptionManagement = ({ userId }: SubscriptionManagementProps) => {
  const {
    isPremium,
    subscriptionStatus,
    subscriptionPlan,
    daysRemaining,
    subscriptionEndDate,
    nextPaymentDate,
    lastPaymentDate,
    paymentMethod,
    subscriptionAutoRenew,
    checkSubscription,
  } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [showAllHistory, setShowAllHistory] = useState(false);

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
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      setSubscriptionHistory(data || []);
    } catch (error) {
      console.error('Error loading subscription history:', error);
    }
  };

  const handleDowngrade = async () => {
    if (!understood) return;

    try {
      setIsLoading(true);

      if (paymentMethod === 'paystack' && subscriptionAutoRenew) {
        const { error: cancelError } = await supabase.functions.invoke('paystack-subscription', {
          body: {
            action: 'cancel-recurring',
          },
        });

        if (cancelError) throw cancelError;
      }

      const { error } = await supabase
        .from('users')
        .update({
          subscription_status: 'cancelled',
          subscription_auto_renew: false,
          subscription_cancelled_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('subscription_history').insert({
        user_id: userId,
        transaction_type: 'cancellation',
        plan_type: subscriptionPlan || 'premium',
        payment_status: 'completed',
      });

      await checkSubscription();
      
      toast.success('Your subscription will end on the current billing date. You\'ll continue to have Premium access until then.');
      setShowDowngradeDialog(false);
      setUnderstood(false);
    } catch (error) {
      console.error('Error downgrading subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const displayedHistory = showAllHistory ? subscriptionHistory : subscriptionHistory.slice(0, 10);

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
              <p className="text-3xl font-bold text-primary">
                {isPremium ? 'Premium' : 'Free'}
              </p>
              {isPremium && subscriptionPlan && (
                <p className="text-sm text-muted-foreground capitalize mt-1">
                  {subscriptionPlan} Plan • {PRICING.CURRENCY_SYMBOL}{subscriptionPlan === 'monthly' ? PRICING.MONTHLY_PRICE : PRICING.ANNUAL_PRICE}/{subscriptionPlan === 'monthly' ? 'month' : 'year'}
                </p>
              )}
            </div>
            <Badge 
              variant={isPremium ? 'default' : 'secondary'}
              className={isPremium ? 'bg-green-500' : ''}
            >
              {subscriptionStatus}
            </Badge>
          </div>

          {isPremium && daysRemaining !== null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              <Calendar className="h-4 w-4" />
              <span>{daysRemaining} days remaining until next billing</span>
            </div>
          )}

          {isPremium && (
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
              {subscriptionEndDate && (
                <p className="text-muted-foreground">
                  Premium access expires on <span className="font-medium text-foreground">{format(new Date(subscriptionEndDate), 'd MMM yyyy')}</span>
                </p>
              )}
              {nextPaymentDate && (
                <p className="text-muted-foreground">
                  Next payment date: <span className="font-medium text-foreground">{format(new Date(nextPaymentDate), 'd MMM yyyy')}</span>
                </p>
              )}
              {lastPaymentDate && (
                <p className="text-muted-foreground">
                  Last successful payment: <span className="font-medium text-foreground">{format(new Date(lastPaymentDate), 'd MMM yyyy')}</span>
                </p>
              )}
            </div>
          )}

          {isPremium ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Premium Features:</p>
                {premiumFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              {subscriptionStatus === 'active' && (
                <Button 
                  variant="outline" 
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => setShowDowngradeDialog(true)}
                >
                  {subscriptionAutoRenew ? 'Cancel Auto-Renew' : 'Downgrade to Free'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <p className="text-sm font-medium">Free Features:</p>
                {freeFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Locked Premium Features:</p>
                {premiumFeatures.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
                <p className="font-semibold text-primary mb-2">Upgrade to Premium</p>
                <p className="text-sm text-muted-foreground mb-3">
                  {PRICING.CURRENCY_SYMBOL}{PRICING.MONTHLY_PRICE}/month or {PRICING.CURRENCY_SYMBOL}{PRICING.ANNUAL_PRICE}/year 
                  <span className="text-secondary font-semibold ml-1">(Save 50%!)</span>
                </p>
                <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="space-y-2">
              {displayedHistory.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium capitalize">
                      {transaction.transaction_type.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.transaction_date), 'd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {transaction.currency} {transaction.amount_zar?.toFixed(2)}
                    </p>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        transaction.payment_status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        transaction.payment_status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {transaction.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            
            {subscriptionHistory.length > 10 && !showAllHistory && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => setShowAllHistory(true)}
              >
                Show More
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade to Free Plan?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>If you downgrade to Free plan, you will lose access to:</p>
              <ul className="list-disc list-inside space-y-1 text-red-600">
                {premiumFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <p className="font-medium">
                Your subscription will remain active until {daysRemaining ? `${daysRemaining} days from now` : 'the end of your billing period'}, then you'll be downgraded to Free. 
                You will not receive a refund for the remaining subscription period.
              </p>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="understand-downgrade" 
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked as boolean)}
                />
                <label
                  htmlFor="understand-downgrade"
                  className="text-sm font-medium leading-none"
                >
                  I understand I will not be reimbursed
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading} onClick={() => setUnderstood(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDowngrade} 
              disabled={isLoading || !understood}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
