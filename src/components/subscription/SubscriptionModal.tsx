import { useEffect, useMemo, useState } from 'react';
import { Check, Crown, CreditCard, Loader2, RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PRICING, FEATURES } from '@/config/pricing';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  isPaystackCheckoutActive,
  loadPaystackPopup,
  onPaystackCheckoutStateChange,
  setPaystackCheckoutActive,
} from '@/lib/paystack';
import { toast } from '@/hooks/use-toast';
import type {
  BillingPlan,
  PaymentType,
  PaystackInitializeResponse,
  PaystackVerifyResponse,
  SubscriptionUpdatedEventDetail,
} from '@/types/paystack';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const { refreshProfile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('annual');
  const [paymentType, setPaymentType] = useState<PaymentType>('recurring');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (isPaystackCheckoutActive()) {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    return onPaystackCheckoutStateChange((isActive) => {
      if (isActive && isOpen) {
        onClose();
      }
    });
  }, [isOpen, onClose]);

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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleClose();
    }
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

      if (typeof window.PaystackPop?.setup !== 'function') {
        throw new Error('Paystack checkout did not initialize correctly.');
      }

      const paystackHandler = window.PaystackPop.setup({
        key: initializeData.publicKey,
        email: initializeData.email,
        amount: Math.round(initializeData.amount * 100),
        currency: initializeData.currency,
        ref: initializeData.reference,
        metadata: initializeData.metadata,
        label: initializeData.label,
        callback: function (response: { reference?: string }) {
          const reference = response.reference || initializeData.reference;
          console.log('[Paystack] Payment callback fired, reference:', reference);
          setIsLoading(true);

          const verifyPayment = async () => {
            try {
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke<PaystackVerifyResponse>(
                'paystack-subscription',
                { body: { action: 'verify', reference } }
              );

              console.log('[Paystack] Verify response:', { verifyData, verifyError });

              if (verifyError) {
                throw new Error(typeof verifyError === 'object' && 'message' in verifyError ? (verifyError as any).message : 'Verification request failed.');
              }

              if (!verifyData || verifyData.paymentStatus !== 'success') {
                throw new Error('Payment verification failed.');
              }

              const eventDetail: SubscriptionUpdatedEventDetail = {
                ...verifyData,
                paymentMethod: 'paystack',
                transactionDate: new Date().toISOString(),
                reference,
              };

              window.dispatchEvent(new CustomEvent('subscription-updated', {
                detail: eventDetail,
              }));
              void refreshProfile();

              toast({
                title: 'Payment successful',
                description:
                  verifyData.paymentType === 'recurring'
                    ? 'Your recurring premium subscription is now active.'
                    : 'Your premium access is now active for the selected billing period.',
              });

              setPaystackCheckoutActive(false);
              handleClose();
            } catch (error) {
              console.error('[Paystack] Error verifying payment:', error);
              toast({
                title: 'Payment verification failed',
                description: error instanceof Error ? error.message : 'We could not confirm your payment.',
                variant: 'destructive',
              });
              setPaystackCheckoutActive(false);
              setIsLoading(false);
            }
          };

          verifyPayment();
        },
        onClose: () => {
          setPaystackCheckoutActive(false);
          setIsLoading(false);
        },
      });

      if (!paystackHandler || typeof paystackHandler.openIframe !== 'function') {
        throw new Error('Paystack checkout popup could not be opened.');
      }

      setPaystackCheckoutActive(true);
      onClose();
      paystackHandler.openIframe();
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting checkout:', error);
      toast({
        title: 'Unable to start payment',
        description: error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.',
        variant: 'destructive',
      });
      setPaystackCheckoutActive(false);
      setIsLoading(false);
    }
  };

  if (isOpen && isPaystackCheckoutActive()) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl overflow-hidden p-0"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <div className="max-h-[min(92vh,900px)] overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <DialogHeader>
            <DialogTitle className="pr-10 text-xl sm:text-2xl">
              <span className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-accent" />
                Upgrade to Premium
              </span>
            </DialogTitle>
            <DialogDescription className="pr-6 text-sm sm:text-base">
              Choose your plan, then pay with Paystack without leaving the app.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <button
                  key={plan.type}
                  type="button"
                  className={`block w-full cursor-pointer rounded-lg border bg-card p-4 text-left transition-all sm:p-6 ${
                    selectedPlan === plan.type
                      ? 'border-accent border-2 shadow-elegant'
                      : 'border-border hover:border-accent/50'
                  }`}
                  onClick={() => setSelectedPlan(plan.type)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold sm:text-xl">{plan.name}</h3>
                      <div
                        className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selectedPlan === plan.type ? 'border-accent bg-accent' : 'border-border'
                        }`}
                      >
                        {selectedPlan === plan.type && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
                        <span className="text-2xl font-bold sm:text-3xl">
                          {PRICING.CURRENCY_SYMBOL}
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground text-sm">{plan.period}</span>
                      </div>
                      {plan.savings && (
                        <p className="mt-1 text-sm font-medium text-accent">{plan.savings}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold">How would you like to pay?</h4>
                <Badge variant="outline">Test mode</Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.type}
                      type="button"
                      className={`block w-full cursor-pointer rounded-lg border bg-card p-4 text-left transition-all sm:p-5 ${
                        paymentType === option.type
                          ? 'border-accent border-2 shadow-elegant'
                          : 'border-border hover:border-accent/50'
                      }`}
                      onClick={() => setPaymentType(option.type)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="font-semibold">{option.title}</p>
                          <p className="text-sm text-muted-foreground">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="mb-3 font-semibold">Premium features include:</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {FEATURES.PREMIUM.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 border-t pt-4">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="cursor-pointer text-sm leading-6 text-muted-foreground">
                I accept the subscription terms and understand that recurring billing continues until I cancel.
              </Label>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <Button variant="outline" onClick={handleClose} className="w-full flex-1" disabled={isLoading}>
                Cancel
              </Button>
              <Button
                onClick={handleCheckout}
                className="w-full flex-1 bg-accent text-white hover:bg-accent/90"
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Continue to Payment'
                )}
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Secure payment powered by Paystack. The checkout opens as an in-app popup.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
