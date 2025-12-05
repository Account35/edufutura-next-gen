import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingDiscussButtonProps {
  onClick: () => void;
}

export const FloatingDiscussButton = ({ onClick }: FloatingDiscussButtonProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling past introduction (500px)
      setIsVisible(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        "fixed right-6 bottom-6 z-50 shadow-lg transition-all duration-300 lg:bottom-6",
        "bg-secondary hover:bg-secondary/90 text-white",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none",
        "hidden lg:flex" // Hide on mobile to avoid overlap with bottom toolbar
      )}
    >
      <MessageSquare className="h-5 w-5 mr-2" />
      Discuss This Chapter
    </Button>
  );
};
