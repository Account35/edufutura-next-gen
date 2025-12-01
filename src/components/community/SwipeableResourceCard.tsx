import { useState } from 'react';
import { Download, Bookmark, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SwipeableResourceCardProps {
  resource: {
    id: string;
    resource_title: string;
    resource_type: string;
    file_url: string;
    rating_average: number;
    download_count: number;
  };
  onBookmark?: (id: string) => void;
  onHide?: (id: string) => void;
}

export const SwipeableResourceCard = ({ resource, onBookmark, onHide }: SwipeableResourceCardProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setSwipeX(Math.max(-100, Math.min(100, diff)));
  };

  const handleTouchEnd = () => {
    if (swipeX > 50 && onBookmark) {
      onBookmark(resource.id);
      toast.success('Resource bookmarked!', {
        action: {
          label: 'Undo',
          onClick: () => {},
        },
      });
    } else if (swipeX < -50 && onHide) {
      onHide(resource.id);
      toast.info('Resource hidden', {
        action: {
          label: 'Undo',
          onClick: () => {},
        },
      });
    }
    setSwipeX(0);
    setIsDragging(false);
  };

  return (
    <div className="relative lg:static">
      {/* Swipe indicators - mobile only */}
      <div className="absolute inset-0 flex items-center justify-between px-4 lg:hidden">
        <div
          className={cn(
            "transition-opacity",
            swipeX > 20 ? "opacity-100" : "opacity-0"
          )}
        >
          <Bookmark className="h-6 w-6 text-secondary" />
        </div>
        <div
          className={cn(
            "transition-opacity",
            swipeX < -20 ? "opacity-100" : "opacity-0"
          )}
        >
          <X className="h-6 w-6 text-destructive" />
        </div>
      </div>

      <Card
        className={cn(
          "transition-transform lg:transform-none cursor-pointer hover:shadow-md",
          isDragging && "transition-none"
        )}
        style={{ transform: `translateX(${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 lg:h-24 lg:w-24 rounded-lg bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium line-clamp-2">{resource.resource_title}</h3>
              <Badge variant="outline" className="mt-2">
                {resource.resource_type}
              </Badge>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>⭐ {resource.rating_average.toFixed(1)}</span>
                <span>•</span>
                <span>{resource.download_count} downloads</span>
              </div>
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="flex-shrink-0 h-12 w-12 lg:h-10 lg:w-10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                window.open(resource.file_url, '_blank');
              }}
            >
              <Download className="h-5 w-5 lg:h-4 lg:w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
