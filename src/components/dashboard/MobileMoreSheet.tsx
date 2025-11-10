import { useState, useRef, useEffect } from 'react';
import { X, Settings, HelpCircle, FileText, Shield, LogOut, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
      onClose();
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      action: () => {
        navigate('/settings');
        onClose();
      }
    },
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help & Support',
      action: () => {
        toast.info('Help center coming soon');
        onClose();
      }
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms & Conditions',
      action: () => {
        toast.info('Terms coming soon');
        onClose();
      }
    },
    {
      id: 'privacy',
      icon: Shield,
      label: 'Privacy Policy',
      action: () => {
        toast.info('Privacy policy coming soon');
        onClose();
      }
    },
    {
      id: 'logout',
      icon: LogOut,
      label: 'Logout',
      action: handleSignOut,
      destructive: true
    }
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
          'fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out',
          isOpen && dragY === 0 ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          maxHeight: '80vh'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-6 pb-8 pt-2">
          <h3 className="text-lg font-semibold text-primary text-center mb-6">
            More Options
          </h3>

          <div className="space-y-1">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === menuItems.length - 1;
              
              return (
                <div key={item.id}>
                  {isLast && <div className="my-4 border-t border-border" />}
                  <button
                    onClick={item.action}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-4 rounded-lg transition-colors duration-200 active:scale-98 min-h-[56px]',
                      item.destructive
                        ? 'text-destructive hover:bg-destructive/10'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {!item.destructive && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};