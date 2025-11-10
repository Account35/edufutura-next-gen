import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  { name: 'AI Tutor', href: '/tutor', icon: MessageSquare, premium: true, comingSoon: true },
  { name: 'Certificates', href: '/certificates', icon: Trophy, premium: true, comingSoon: true },
  { name: 'Reports', href: '/reports', icon: FileText },
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
        <div className="flex items-center gap-2">
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
              className={cn(
                'w-full justify-start min-h-[44px] flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isLocked && 'opacity-60'
              )}
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
        <Button
          variant="ghost"
          className="w-full justify-start min-h-[44px]"
          onClick={() => handleNavigation('/settings')}
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </Button>
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
      {/* Desktop Top Navigation */}
      <header className="hidden lg:flex sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 py-4 px-6">
        <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-serif font-bold text-xl text-primary">EduFutura</span>
            </div>
            <nav className="flex items-center gap-6">
              {navigationItems.slice(0, 3).map((item) => {
                if (item.comingSoon) {
                  return (
                    <button
                      key={item.name}
                      onClick={() => toast.info('This feature is coming soon!')}
                      className="relative text-base font-medium transition-colors duration-200 pb-1 text-gray-700 hover:text-primary opacity-60"
                    >
                      {item.name}
                    </button>
                  );
                }
                
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className="relative text-base font-medium transition-colors duration-200 pb-1 text-gray-700 hover:text-primary"
                    activeClassName="!text-primary !font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-t-full"
                  >
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {isPremium && (
              <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1 rounded-full">
                <Crown className="h-4 w-4" />
                <span className="text-sm font-semibold">Premium</span>
              </div>
            )}
            
            <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={userProfile?.profile_picture_url} />
                    <AvatarFallback>
                      {userProfile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden xl:inline">{userProfile?.full_name?.split(' ')[0]}</span>
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate('/settings');
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account Settings
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        toast.info('Subscription settings coming soon');
                        setMoreMenuOpen(false);
                      }}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Subscription
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        toast.info('Help center coming soon');
                        setMoreMenuOpen(false);
                      }}
                    >
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Help & Support
                    </Button>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs text-muted-foreground"
                      onClick={() => toast.info('Terms coming soon')}
                    >
                      <FileTextIcon className="h-3 w-3 mr-2" />
                      Terms & Conditions
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-xs text-muted-foreground"
                      onClick={() => toast.info('Privacy policy coming soon')}
                    >
                      <ShieldIcon className="h-3 w-3 mr-2" />
                      Privacy Policy
                    </Button>
                  </div>
                  <Separator />
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

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
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 lg:border-r lg:bg-background lg:top-[73px]">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64 lg:pt-[73px]">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setMoreMenuOpen(true)} />

      {/* Mobile More Menu */}
      <MobileMoreSheet 
        isOpen={moreMenuOpen} 
        onClose={() => setMoreMenuOpen(false)} 
      />
    </div>
  );
};