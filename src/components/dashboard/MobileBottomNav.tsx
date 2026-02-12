import { Home, BookOpen, User, Menu, Bookmark, FileText, Trophy, MessageSquare, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export const MobileBottomNav = ({ onMoreClick }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  // Primary nav items (shown in bottom bar on mobile)
  const primaryNavItems: NavItem[] = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', path: '/subjects' },
    { id: 'forums', icon: MessageSquare, label: 'Forums', path: '/community/forums' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  // All nav items (shown in desktop sidebar)
  const allNavItems: NavItem[] = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', path: '/subjects' },
    { id: 'forums', icon: MessageSquare, label: 'Forums', path: '/community/forums' },
    { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks', path: '/bookmarks' },
    { id: 'reports', icon: FileText, label: 'Reports', path: '/reports' },
    { id: 'certificates', icon: Trophy, label: 'Certificates', path: '/certificates' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Side Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 bg-background border-r border-border z-50 flex-col items-center py-6 gap-4">
        {allNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg min-h-[56px] min-w-[56px] transition-all duration-200',
                active 
                  ? 'bg-secondary/10 text-secondary' 
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className={cn(
                'text-[10px] font-medium text-center',
                active && 'font-semibold'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Menu Button for desktop */}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg min-h-[56px] min-w-[56px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          aria-label="More Options"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>

        {/* Logout Button at bottom - anchored to footer so it's visible on all viewports */}
        <div className="mt-auto w-full flex items-center justify-center pb-6 z-60">
          <button
            onClick={handleSignOut}
            title="Logout"
            className="flex flex-col items-center gap-1 p-2 rounded-lg min-h-[56px] min-w-[56px] text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 lg:hidden bottom-nav safe-area-pb">
        <div className="flex items-center justify-around py-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-4 py-2 min-h-[44px] transition-colors duration-200 active:scale-95',
                  active 
                    ? 'text-secondary' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={item.label}
              >
                <div className={cn(
                  'flex flex-col items-center gap-1',
                  active && 'bg-secondary/10 rounded-full px-3 py-1'
                )}>
                  <Icon className="h-6 w-6" />
                  <span className={cn(
                    'text-xs font-medium',
                    active && 'font-semibold'
                  )}>
                    {item.label}
                  </span>
                </div>
              </button>
            );
          })}
          
          {/* Hamburger Menu for mobile */}
          <button
            onClick={onMoreClick}
            className="relative flex flex-col items-center gap-1 px-4 py-2 min-h-[44px] text-muted-foreground hover:text-foreground transition-colors duration-200 active:scale-95"
            aria-label="More"
          >
            <Menu className="h-6 w-6" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
