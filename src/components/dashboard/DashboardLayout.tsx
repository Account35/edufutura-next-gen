import { ReactNode, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home, 
  BookOpen, 
  User, 
  Trophy, 
  Settings, 
  LogOut,
  Menu,
  X,
  Crown,
  MessageSquare,
  FileText,
  HelpCircle,
  FileTextIcon,
  ShieldIcon,
  Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileMoreSheet } from './MobileMoreSheet';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'My Subjects', href: '/subjects', icon: BookOpen },
  { name: 'Bookmarks', href: '/bookmarks', icon: Bookmark },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'AI Tutor', href: '/ai-tutor', icon: MessageSquare, premium: true, comingSoon: true },
  { name: 'Certificates', href: '/certificates', icon: Trophy, premium: true, comingSoon: true },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { isPremium } = useSubscription();

  const handleNavigation = (href: string, comingSoon?: boolean) => {
    if (comingSoon) {
      toast.info('This feature is coming soon!');
      return;
    }
    navigate(href);
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Error signing out');
    }
  };

  const navigationItems = navigation;
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div 
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
          onClick={() => {
            navigate('/dashboard');
            setSidebarOpen(false);
          }}
        >
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl text-primary">EduFutura</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">South African Education</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isLocked = item.premium && !isPremium;
          
          if (item.comingSoon) {
            return (
              <Button
                key={item.name}
                variant="ghost"
                className={cn(
                  'w-full justify-start min-h-[44px]',
                  'opacity-60'
                )}
                onClick={() => {
                  toast.info('This feature is coming soon!');
                }}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.premium && !isPremium && (
                  <Crown className="ml-auto h-4 w-4 text-secondary" />
                )}
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </Button>
            );
          }
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className="w-full justify-start min-h-[44px] flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-secondary text-secondary-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
              {item.premium && !isPremium && (
                <Crown className="ml-auto h-4 w-4 text-secondary" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src={userProfile?.profile_picture_url} />
            <AvatarFallback>
              {userProfile?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userProfile?.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {isPremium ? '👑 Premium' : 'Free Account'}
            </p>
          </div>
        </div>
        <NavLink
          to="/settings"
          className="w-full justify-start min-h-[44px] flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          activeClassName="bg-secondary text-secondary-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start min-h-[44px] text-destructive hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-serif font-bold text-xl text-primary">EduFutura</span>
          </div>
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:bg-background lg:z-[60] relative pointer-events-auto">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64 pb-16 lg:pb-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => navigate('/settings')} />
    </div>
  );
};