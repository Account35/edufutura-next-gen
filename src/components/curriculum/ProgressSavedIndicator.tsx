import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressSavedIndicatorProps {
  show: boolean;
}

export const ProgressSavedIndicator = ({ show }: ProgressSavedIndicatorProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 md:bottom-4 left-1/2 transform -translate-x-1/2 z-50",
        "bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2",
        "flex items-center gap-2 text-sm shadow-lg",
        "animate-in fade-in slide-in-from-bottom-2 duration-200"
      )}
    >
      <Check className="h-4 w-4 text-green-600" />
      <span className="font-medium">Progress saved</span>
    </div>
  );
};
