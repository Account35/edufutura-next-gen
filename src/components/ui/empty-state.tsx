import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
}

export const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action,
  children 
}: EmptyStateProps) => {
  return (
    <Card className="p-8 md:p-12 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted mb-4 md:mb-6">
        <Icon className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground" />
      </div>
      
      <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          className="bg-primary hover:bg-primary/90 min-h-[44px]"
        >
          {action.label}
        </Button>
      )}

      {children}
    </Card>
  );
};
