import { ChevronLeft, ChevronRight, Bookmark, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface ChapterToolbarProps {
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  onFontSizeChange: (size: string) => void;
  fontSize: string;
  onDarkModeToggle: () => void;
  isDarkMode: boolean;
}

export const ChapterToolbar = ({
  isBookmarked,
  onBookmarkToggle,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onFontSizeChange,
  fontSize,
  onDarkModeToggle,
  isDarkMode,
}: ChapterToolbarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t border-border z-20">
      <div className="flex items-center justify-around p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="flex-1"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onBookmarkToggle}
          className="flex-1"
        >
          <Bookmark className={cn("h-5 w-5", isBookmarked && "fill-secondary text-secondary")} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!hasNext}
          className="flex-1"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="flex-1">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[400px]">
            <SheetHeader>
              <SheetTitle>Reading Options</SheetTitle>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              <div>
                <h4 className="font-medium mb-3">Font Size</h4>
                <div className="space-y-2">
                  {['small', 'medium', 'large', 'xlarge'].map((size) => (
                    <button
                      key={size}
                      onClick={() => onFontSizeChange(size)}
                      className={cn(
                        "w-full text-left px-4 py-2 rounded-lg transition-colors",
                        fontSize === size
                          ? "bg-secondary text-white"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={onDarkModeToggle}
                  className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
