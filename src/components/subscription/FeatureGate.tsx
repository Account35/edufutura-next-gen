import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';

interface FeatureGateProps {
  children: ReactNode;
  feature: string;
  onUpgrade?: () => void;
}

export const FeatureGate = ({ children, feature, onUpgrade }: FeatureGateProps) => {
  const { isPremium } = useSubscription();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20">
            <Lock className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">Premium Feature</h3>
          <p className="text-muted-foreground max-w-sm">
            {feature} is available with a Premium subscription
          </p>
          <Button 
            onClick={onUpgrade}
            className="bg-accent hover:bg-accent/90 text-white"
          >
            Upgrade to Premium
          </Button>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </Card>
  );
};
