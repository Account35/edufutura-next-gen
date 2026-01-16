import { ReactNode, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronRight, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SwipeAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'warning';
}

interface AdminMobileCardProps {
  children: ReactNode;
  onClick?: () => void;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  menuActions?: SwipeAction[];
  className?: string;
}

export function AdminMobileCard({
  children,
  onClick,
  leftActions = [],
  rightActions = [],
  menuActions = [],
  className,
}: AdminMobileCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 100;
    const limitedDiff = Math.max(-maxSwipe, Math.min(maxSwipe, diff));
    
    // Only allow swipe if there are actions
    if ((diff > 0 && leftActions.length > 0) || (diff < 0 && rightActions.length > 0)) {
      setSwipeX(limitedDiff);
    }
  };

  const handleTouchEnd = () => {
    // Snap back or trigger action based on swipe distance
    if (Math.abs(swipeX) > 60) {
      if (swipeX > 0 && leftActions[0]) {
        leftActions[0].onClick();
      } else if (swipeX < 0 && rightActions[0]) {
        rightActions[0].onClick();
      }
    }
    setSwipeX(0);
  };

  const getActionColor = (variant: SwipeAction['variant']) => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left swipe action background */}
      {leftActions.length > 0 && (
        <div className={cn('absolute left-0 top-0 bottom-0 flex items-center justify-start px-4', getActionColor(leftActions[0]?.variant))}>
          <div className="text-white flex items-center gap-2">
            {leftActions[0]?.icon}
            <span className="text-sm font-medium">{leftActions[0]?.label}</span>
          </div>
        </div>
      )}
      
      {/* Right swipe action background */}
      {rightActions.length > 0 && (
        <div className={cn('absolute right-0 top-0 bottom-0 flex items-center justify-end px-4', getActionColor(rightActions[0]?.variant))}>
          <div className="text-white flex items-center gap-2">
            <span className="text-sm font-medium">{rightActions[0]?.label}</span>
            {rightActions[0]?.icon}
          </div>
        </div>
      )}
      
      {/* Main card */}
      <Card
        ref={cardRef}
        className={cn(
          'relative transition-transform touch-pan-y',
          onClick && 'cursor-pointer active:bg-muted/50',
          className
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {children}
            </div>
            
            {menuActions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuActions.map((action, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      className={action.variant === 'destructive' ? 'text-destructive' : ''}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : onClick ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
