import { ChevronLeft, ChevronRight, Bookmark, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface MobileReadingToolbarProps {
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

export const MobileReadingToolbar = ({
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
}: MobileReadingToolbarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t border-border z-20 safe-area-pb">
      <div className="flex items-center justify-around p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="h-11 w-11"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onBookmarkToggle}
          className="h-11 w-11"
        >
          <Bookmark
            className={cn(
              "h-5 w-5 transition-colors",
              isBookmarked && "fill-secondary text-secondary"
            )}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!hasNext}
          className="h-11 w-11"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-11 w-11">
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
                  {[
                    { value: 'small', label: 'Small (16px)' },
                    { value: 'medium', label: 'Medium (18px)' },
                    { value: 'large', label: 'Large (20px)' },
                    { value: 'xlarge', label: 'Extra Large (24px)' }
                  ].map((size) => (
                    <button
                      key={size.value}
                      onClick={() => onFontSizeChange(size.value)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-lg transition-colors",
                        fontSize === size.value
                          ? "bg-secondary text-secondary-foreground font-medium"
                          : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button
                  onClick={onDarkModeToggle}
                  className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <span className="font-medium">Dark Mode: </span>
                  <span>{isDarkMode ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
