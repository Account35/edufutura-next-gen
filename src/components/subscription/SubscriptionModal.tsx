import { useState } from 'react';
import { Check, Crown } from 'lucide-react';
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
import { PRICING, FEATURES } from '@/config/pricing';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlanType = 'monthly' | 'annual';

export const SubscriptionModal = ({ isOpen, onClose }: SubscriptionModalProps) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = async () => {
    if (!acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the terms and conditions to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Store selected plan preference
      const { error } = await supabase
        .from('users')
        .update({ subscription_plan: selectedPlan })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Plan Selected",
        description: "Redirecting to payment...",
      });

      // TODO: Integrate with PayFast payment gateway
      // This is a placeholder for future PayFast integration
      console.log('Selected plan:', selectedPlan);
      
    } catch (error) {
      console.error('Error selecting plan:', error);
      toast({
        title: "Error",
        description: "Failed to process subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const plans = [
    {
      type: 'monthly' as PlanType,
      name: 'Monthly',
      price: PRICING.MONTHLY_PRICE,
      period: 'per month',
      savings: null,
    },
    {
      type: 'annual' as PlanType,
      name: 'Annual',
      price: PRICING.ANNUAL_PRICE,
      period: 'per year',
      savings: `Save ${PRICING.CURRENCY_SYMBOL}${PRICING.ANNUAL_SAVINGS} per year!`,
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="w-6 h-6 text-accent" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            Choose your plan and unlock all premium features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Plan Selection */}
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
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === plan.type ? 'border-accent bg-accent' : 'border-border'
                    }`}>
                      {selectedPlan === plan.type && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{PRICING.CURRENCY_SYMBOL}{plan.price}</span>
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

          {/* Features List */}
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

          {/* Terms Acceptance */}
          <div className="flex items-start gap-2 pt-4 border-t">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
              I accept the{' '}
              <a href="#" className="text-accent hover:underline">
                subscription terms and conditions
              </a>
            </Label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSelectPlan}
              className="flex-1 bg-accent hover:bg-accent/90 text-white"
              disabled={isLoading || !acceptedTerms}
            >
              {isLoading ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </div>

          {/* Payment Note */}
          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by PayFast. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
