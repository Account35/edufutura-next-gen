import { useState, useRef, useEffect } from 'react';
import { X, Bookmark, Trophy, FileText, LogOut, Compass, HelpCircle, DollarSign, Building2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  destructive?: boolean;
  badge?: string;
  comingSoon?: boolean;
}

export const MobileMoreSheet = ({ isOpen, onClose }: MobileMoreSheetProps) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  // Mobile-only navigation items (shown on small screens)
  const mobileNavItems: MenuItem[] = [
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', action: () => { navigate('/bookmarks'); onClose(); } },
    { id: 'reports', icon: FileText, label: 'Reports', action: () => { navigate('/reports'); onClose(); } },
    { id: 'certificates', icon: Trophy, label: 'Certificates', action: () => { navigate('/certificates'); onClose(); } },
  ];

  // Career Guidance items (shown on desktop)
  const careerGuidanceItems: MenuItem[] = [
    { id: 'career-quiz', icon: Sparkles, label: 'Career Quiz', action: () => { navigate('/career-guidance/quiz'); onClose(); } },
    { id: 'universities', icon: Building2, label: 'Universities', action: () => { navigate('/career-guidance/universities'); onClose(); } },
    { id: 'salary-calculator', icon: DollarSign, label: 'Salary Calculator', action: () => { navigate('/career-guidance/salary-calculator'); onClose(); } },
    { id: 'career-resources', icon: Compass, label: 'Career Resources', action: () => { navigate('/career-guidance/resources'); onClose(); } },
    { id: 'career-faq', icon: HelpCircle, label: 'Career FAQ', action: () => { navigate('/career-guidance/faq'); onClose(); } },
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0) {
      setDragY(diff);
    } else if (diff < 0) {
      // Rubber band effect when dragging up
      setDragY(diff * 0.3);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (dragY > 100) {
      onClose();
    }
    
    setDragY(0);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={cn(
          'fixed bg-white shadow-2xl transition-transform duration-300 ease-out',
          'lg:bottom-20 lg:left-4 lg:w-80 lg:rounded-2xl',
          'bottom-0 left-0 right-0 rounded-t-3xl lg:translate-y-0',
          isOpen && dragY === 0 ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          maxHeight: 'calc(100vh - 100px)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle Bar (mobile only) */}
        <div className="flex justify-center pt-3 pb-2 lg:hidden">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">More</h2>
          <button onClick={onClose} className="lg:flex hidden p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="overflow-y-auto flex-1 px-4 py-4">
          {/* Mobile Navigation - shown only on mobile */}
          <div className="lg:hidden space-y-2 mb-6">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-gray-50 text-gray-700"
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                </button>
              );
            })}
            
            {/* Logout - mobile only */}
            <div className="pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-red-50 text-red-600"
              >
                <LogOut className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left font-medium">Logout</span>
              </button>
            </div>
          </div>

          {/* Career Guidance Section - shown only on desktop */}
          <div className="hidden lg:block">
            <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Career Guidance
            </h3>
            <div className="space-y-2">
              {careerGuidanceItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 hover:bg-secondary/10 text-gray-700"
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};