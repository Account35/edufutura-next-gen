import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface FloatingAIButtonProps {
  onClick: () => void;
  unreadSuggestions?: number;
}

export const FloatingAIButton = ({ onClick, unreadSuggestions = 0 }: FloatingAIButtonProps) => {
  const { isPremium } = useSubscription();
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    const pulseDismissed = localStorage.getItem('ai-button-pulse-dismissed');
    if (!pulseDismissed) {
      setShowPulse(true);
      const timer = setTimeout(() => {
        setShowPulse(false);
        localStorage.setItem('ai-button-pulse-dismissed', 'true');
      }, 6000); // 3 iterations × 2s = 6s
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClick = () => {
    // Capture page context
    const context = {
      pathname: window.location.pathname,
      scrollPosition: window.scrollY,
      timeOnPage: sessionStorage.getItem('page-entry-time') 
        ? Date.now() - parseInt(sessionStorage.getItem('page-entry-time') || '0')
        : 0,
    };
    console.log('[AI Button] Context:', context);
    onClick();
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          <Button
            onClick={handleClick}
            className={cn(
              "fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl bg-secondary hover:bg-secondary/90 text-white z-40 group flex items-center justify-center transition-transform duration-200 hover:scale-110",
              showPulse && "animate-[pulse_2s_ease-in-out_3]"
            )}
            size="icon"
            aria-label="Ask AI Tutor"
          >
            <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform duration-200" />
            {!isPremium && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                3
              </span>
            )}
            {unreadSuggestions > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadSuggestions}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white shadow-md">
          <p className="font-medium">Ask AI Tutor</p>
          <p className="text-xs text-muted-foreground">Press / to open</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
