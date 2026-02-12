import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRICING } from '@/config/pricing';

interface UpgradeBannerProps {
  onUpgrade: () => void;
}

export const UpgradeBanner = ({ onUpgrade }: UpgradeBannerProps) => {
  return (
    <div className="bg-gradient-to-r from-primary to-primary-glow border border-border/20 rounded-lg p-4 shadow-elegant">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="text-background font-semibold">
              Unlock AI tutoring and certificates with Premium
            </p>
            <p className="text-background/80 text-sm">
              {PRICING.CURRENCY_SYMBOL}{PRICING.MONTHLY_PRICE}/month or {PRICING.CURRENCY_SYMBOL}{PRICING.ANNUAL_PRICE}/year (Save 50%)
            </p>
          </div>
        </div>
        <Button
          onClick={onUpgrade}
          className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg"
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};
