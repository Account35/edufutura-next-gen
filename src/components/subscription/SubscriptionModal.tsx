import { useMemo, useState } from 'react';
import { Check, Crown, CreditCard, Loader2, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PRICING, FEATURES } from '@/config/pricing';
import { supabase } from '@/integrations/supabase/client';
import { loadPaystackPopup } from '@/lib/paystack';
import { toast } from '@/hooks/use-toast';
import type { BillingPlan, PaymentType, PaystackInitializeResponse, PaystackVerifyResponse } from '@/types/paystack';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('annual');
  const [paymentType, setPaymentType] = useState<PaymentType>('recurring');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const plans = useMemo(
    () => [
      {
        type: 'monthly' as BillingPlan,
        name: 'Monthly',
        price: PRICING.MONTHLY_PRICE,
        period: 'per month',
        savings: null,
      },
      {
        type: 'annual' as BillingPlan,
        name: 'Annual',
        price: PRICING.ANNUAL_PRICE,
        period: 'per year',
        savings: `Save ${PRICING.CURRENCY_SYMBOL}${PRICING.ANNUAL_SAVINGS} per year!`,
      },
    ],
    []
  );

  const paymentOptions = [
    {
      type: 'recurring' as PaymentType,
      title: 'Recurring payment',
      description: 'Pay automatically every billing cycle until you cancel.',
      icon: RefreshCcw,
    },
    {
      type: 'one_time' as PaymentType,
      title: 'One-time payment',
      description: 'Pay once for this billing period and renew manually later.',
      icon: CreditCard,
    },
  ];

  const resetModalState = () => {
    setAcceptedTerms(false);
    setPaymentType('recurring');
    setSelectedPlan('annual');
    setIsLoading(false);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleCheckout = async () => {
    if (!acceptedTerms) {
      toast({
        title: 'Terms Required',
        description: 'Please accept the terms and conditions to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: initializeData, error: initializeError } = await supabase.functions.invoke<PaystackInitializeResponse>(
        'paystack-subscription',
        {
          body: {
            action: 'initialize',
            planType: selectedPlan,
            paymentType,
          },
        }
      );

      if (initializeError) {
        throw initializeError;
      }

      if (!initializeData?.publicKey || !initializeData.reference) {
        throw new Error('Invalid payment session received.');
      }

      await loadPaystackPopup();

      const paystackHandler = window.PaystackPop?.setup({
        key: initializeData.publicKey,
        email: initializeData.email,
        amount: Math.round(initializeData.amount * 100),
        currency: initializeData.currency,
        ref: initializeData.reference,
        metadata: initializeData.metadata,
        label: initializeData.label,
        callback: async (response: { reference?: string }) => {
          try {
            const reference = response.reference || initializeData.reference;

            const { data: verifyData, error: verifyError } = await supabase.functions.invoke<PaystackVerifyResponse>(
              'paystack-subscription',
              {
                body: {
                  action: 'verify',
                  reference,
                },
              }
            );

            if (verifyError) {
              throw verifyError;
            }

            if (!verifyData || verifyData.paymentStatus !== 'success') {
              throw new Error('Payment verification failed.');
            }

            window.dispatchEvent(new CustomEvent('subscription-updated'));

            toast({
              title: 'Payment successful',
              description:
                verifyData.paymentType === 'recurring'
                  ? 'Your recurring premium subscription is now active.'
                  : 'Your premium access is now active for the selected billing period.',
            });

            handleClose();
          } catch (error) {
            console.error('Error verifying payment:', error);
            toast({
              title: 'Payment verification failed',
              description: error instanceof Error ? error.message : 'We could not confirm your payment.',
              variant: 'destructive',
            });
            setIsLoading(false);
          }
        },
        onClose: () => {
          setIsLoading(false);
        },
      });

      paystackHandler?.openIframe();
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast({
        title: 'Unable to start payment',
        description: error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-6 h-6 text-accent" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Choose your plan, then pay with Paystack without leaving the app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <Card
                key={plan.type}
                className={`p-6 cursor-pointer transition-all ${
                  selectedPlan === plan.type
                    ? 'border-accent border-2 shadow-elegant'
                    : 'border-border hover:border-accent/50'
                }`}
                onClick={() => setSelectedPlan(plan.type)}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedPlan === plan.type ? 'border-accent bg-accent' : 'border-border'
                      }`}
                    >
                      {selectedPlan === plan.type && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {PRICING.CURRENCY_SYMBOL}
                        {plan.price}
                      </span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                    {plan.savings && (
                      <p className="text-accent font-medium text-sm mt-1">{plan.savings}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">How would you like to pay?</h4>
              <Badge variant="outline">Test mode</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.type}
                    className={`p-5 cursor-pointer transition-all ${
                      paymentType === option.type
                        ? 'border-accent border-2 shadow-elegant'
                        : 'border-border hover:border-accent/50'
                    }`}
                    onClick={() => setPaymentType(option.type)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold">{option.title}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Premium features include:</h4>
            <div className="grid md:grid-cols-2 gap-2">
              {FEATURES.PREMIUM.map((feature) => (
                <div key={feature} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2 pt-4 border-t">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
              I accept the subscription terms and understand that recurring billing continues until I cancel.
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              className="flex-1 bg-accent hover:bg-accent/90 text-white"
              disabled={isLoading || !acceptedTerms}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Paystack. The checkout opens as an in-app popup.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
