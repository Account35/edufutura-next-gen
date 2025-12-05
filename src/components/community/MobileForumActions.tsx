import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileForumActionsProps {
  onNewDiscussion: () => void;
}

export const MobileForumActions = ({ onNewDiscussion }: MobileForumActionsProps) => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <Button
      size="lg"
      onClick={onNewDiscussion}
      className={cn(
        "fixed bottom-20 right-6 z-40 shadow-lg transition-all duration-300 lg:hidden",
        "bg-secondary hover:bg-secondary/90 text-white rounded-full h-14 w-14 p-0",
        isVisible ? "scale-100 opacity-100" : "scale-0 opacity-0"
      )}
    >
      <MessageSquarePlus className="h-6 w-6" />
    </Button>
  );
};
