import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface FloatingAIButtonProps {
  onClick: () => void;
}

export const FloatingAIButton = ({ onClick }: FloatingAIButtonProps) => {
  const { isPremium } = useSubscription();

  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 lg:bottom-12 lg:right-12 w-14 h-14 rounded-full shadow-2xl bg-secondary hover:bg-secondary/90 text-white z-40 group"
      size="icon"
      title="Ask AI Tutor"
    >
      <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
      {!isPremium && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full text-[10px] flex items-center justify-center font-bold text-white">
          3
        </span>
      )}
    </Button>
  );
};
