import { useState, useRef, useEffect } from 'react';
import { X, Settings, HelpCircle, FileText, Shield, LogOut, ChevronRight, Home, BookOpen, Bookmark, User, Sparkles, Trophy, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';

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
  const location = useLocation();
  const { isPremium } = useSubscription();
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [showAllNav, setShowAllNav] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast.success('Signed out successfully');
      onClose();
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  // Mobile: Show all navigation items
  const mobileNavItems: MenuItem[] = [
    { id: 'home', icon: Home, label: 'Home', action: () => { navigate('/dashboard'); onClose(); } },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', action: () => { navigate('/subjects'); onClose(); } },
    { id: 'forums', icon: MessageSquare, label: 'Forums', action: () => { navigate('/community/forums'); onClose(); } },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', action: () => { navigate('/bookmarks'); onClose(); } },
    { id: 'reports', icon: FileText, label: 'Reports', action: () => { navigate('/reports'); onClose(); } },
    { id: 'profile', icon: User, label: 'Profile', action: () => { navigate('/profile'); onClose(); } },
    { id: 'ai-tutor', icon: Sparkles, label: 'AI Tutor', badge: !isPremium ? '3 free' : 'Premium', action: () => { toast.info('Open AI Tutor from the floating button'); onClose(); } },
    { id: 'certificates', icon: Trophy, label: 'Certificates', action: () => { navigate('/certificates'); onClose(); } },
  ];

  // Additional menu items (shown on both desktop and mobile)
  const additionalItems: MenuItem[] = [
    { id: 'settings', icon: Settings, label: 'Settings', action: () => { navigate('/settings'); onClose(); } },
    { id: 'help', icon: HelpCircle, label: 'Help & Support', action: () => { toast.info('Help center coming soon'); onClose(); } },
    { id: 'terms', icon: FileText, label: 'Terms & Conditions', action: () => { toast.info('Terms coming soon'); onClose(); } },
    { id: 'privacy', icon: Shield, label: 'Privacy Policy', action: () => { toast.info('Privacy policy coming soon'); onClose(); } },
    { id: 'logout', icon: LogOut, label: 'Logout', action: handleSignOut, destructive: true }
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
        <div className="overflow-y-auto flex-1">
          {/* Mobile Navigation Items (mobile only) */}
          <div className="lg:hidden">
            <div className="px-4 py-2">
              <button
                onClick={() => setShowAllNav(!showAllNav)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
              >
                <span>Navigation</span>
                {showAllNav ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showAllNav && (
                <div className="mt-2 space-y-1">
                  {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === (
                      item.id === 'home' ? '/dashboard' :
                      item.id === 'subjects' ? '/subjects' :
                      item.id === 'forums' ? '/community/forums' :
                      item.id === 'bookmarks' ? '/bookmarks' :
                      item.id === 'reports' ? '/reports' :
                      item.id === 'profile' ? '/profile' :
                      item.id === 'certificates' ? '/certificates' : ''
                    );
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        disabled={item.comingSoon}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                          isActive ? 'bg-secondary/10 text-secondary' : 'hover:bg-gray-50 text-gray-700',
                          item.comingSoon && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="text-xs px-2 py-0.5 bg-secondary/20 text-secondary rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mx-4 my-2 border-t border-gray-200" />
          </div>

          {/* Additional Menu Items (both mobile and desktop) */}
          <div className="px-4 py-2">
            {additionalItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200',
                    'hover:bg-gray-50 active:scale-98',
                    item.destructive 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-gray-700 hover:text-primary'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};