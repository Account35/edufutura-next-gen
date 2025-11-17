import { Home, BookOpen, User, Menu, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface MobileBottomNavProps {
  onMoreClick: () => void;
  onAIClick: () => void;
  unreadAISuggestions?: number;
}

export const MobileBottomNav = ({ onMoreClick, onAIClick, unreadAISuggestions = 0 }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPremium } = useSubscription();

  const navItems: NavItem[] = [
    { id: 'home', icon: Home, label: 'Home', path: '/dashboard' },
    { id: 'subjects', icon: BookOpen, label: 'Subjects', path: '/subjects' },
    { id: 'profile', icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Side Navigation */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-border z-50 flex-col items-center py-6 gap-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg min-h-[60px] min-w-[60px] transition-all duration-200',
                active 
                  ? 'bg-secondary/10 text-secondary' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-foreground'
              )}
              aria-label={item.label}
            >
              <Icon className="h-6 w-6" />
              <span className={cn(
                'text-xs font-medium text-center',
                active && 'font-semibold'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
        
        <button
          onClick={onAIClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg min-h-[60px] min-w-[60px] text-gray-600 hover:bg-gray-100 hover:text-foreground transition-all duration-200 relative"
          aria-label="AI Tutor"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!isPremium && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                3
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-center">AI Tutor</span>
        </button>
        
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center gap-1 p-2 rounded-lg min-h-[60px] min-w-[60px] text-gray-600 hover:bg-gray-100 hover:text-foreground transition-all duration-200 mt-auto"
          aria-label="More"
        >
          <Menu className="h-6 w-6" />
          <span className="text-xs font-medium">More</span>
        </button>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 lg:hidden bottom-nav safe-area-pb">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
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
                    : 'text-gray-600 hover:text-foreground'
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
          
          <button
            onClick={onAIClick}
            className="relative flex flex-col items-center gap-1 px-3 py-2 min-h-[44px] text-gray-600 hover:text-foreground transition-colors duration-200 active:scale-95"
            aria-label="AI Tutor"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              {!isPremium && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  3
                </span>
              )}
            </div>
            <span className="text-xs font-medium">AI Tutor</span>
          </button>
          
          <button
            onClick={onMoreClick}
            className="relative flex flex-col items-center gap-1 px-4 py-2 min-h-[44px] text-gray-600 hover:text-foreground transition-colors duration-200 active:scale-95"
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
