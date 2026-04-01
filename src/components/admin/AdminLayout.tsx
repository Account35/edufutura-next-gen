import { ReactNode, useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { FullPageLoader } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import {
  GraduationCap, 
  LogOut, 
  Users, 
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Shield,
  BarChart3,
  Settings,
  Briefcase,
  Headphones,
  ScrollText,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AdminMobileNav } from './mobile/AdminMobileNav';
import { BackButton } from '@/components/ui/BackButton';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const sidebarItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/content', label: 'Content', icon: BookOpen },
  { href: '/admin/curriculum', label: 'Curriculum', icon: GraduationCap },
  { href: '/admin/quizzes', label: 'Quizzes', icon: FileQuestion },
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/onboarding', label: 'Onboarding', icon: Users },
  { href: '/admin/support', label: 'Support', icon: Headphones },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

// Extracted as a separate component to avoid re-creation on every render
interface SidebarContentProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
}

const SidebarContent = ({ currentPath, onNavigate, onSignOut }: SidebarContentProps) => {
  const isActive = (href: string) => {
    if (href === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(href);
  };

  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-primary-foreground/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">EduFutura</h1>
            <p className="text-xs opacity-80">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px]',
              isActive(item.href) 
                ? 'bg-secondary text-secondary-foreground' 
                : 'hover:bg-primary-foreground/10'
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-primary-foreground/10 space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 min-h-[48px]"
          onClick={() => onNavigate('/dashboard')}
        >
          <Users className="w-5 h-5 mr-3" />
          Student View
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-primary-foreground hover:bg-primary-foreground/10 min-h-[48px]"
          onClick={onSignOut}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </>
  );
};

const ADMIN_LAYOUT_TIMEOUT_MS = 8000; // 8 second timeout for admin layout

export const AdminLayout = ({ children, title, subtitle }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading, hasChecked } = useAdminRole();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    if (hasCheckedAccess) return;
    
    const timeout = setTimeout(() => {
      console.warn('[AdminLayout] Safety timeout reached');
      setTimedOut(true);
    }, ADMIN_LAYOUT_TIMEOUT_MS);
    
    return () => clearTimeout(timeout);
  }, [hasCheckedAccess]);

  useEffect(() => {
    // Wait for auth to finish loading (but respect timeout)
    if (authLoading && !timedOut) {
      return;
    }

    // No user - redirect to landing
    if (!user) {
      navigate('/', { replace: true });
      return;
    }

    // Wait for role check to complete (but respect timeout)
    if (roleLoading && !timedOut) {
      return;
    }

    // Role check completed or timed out - now check access
    if (hasChecked || timedOut) {
      if (isAdmin || isEducator) {
        // User has admin/educator access
        setHasCheckedAccess(true);
      } else if (timedOut) {
        // Timed out without confirmed access - check by email as last resort
        const isAdminEmail = user.email === 'admin_edufutura@gmail.com' || user.email === 'ntlemezal35@gmail.com';
        if (isAdminEmail) {
          console.log('[AdminLayout] Timeout fallback: granting access based on email');
          setHasCheckedAccess(true);
        } else {
          console.warn('[AdminLayout] Timed out, no admin access, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        }
      } else {
        // Role check completed but no admin/educator role found
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, isAdmin, isEducator, authLoading, roleLoading, hasChecked, navigate, timedOut]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Show loader while checking access (but not if timed out)
  if ((authLoading || roleLoading || !hasCheckedAccess) && !timedOut) {
    return <FullPageLoader message="Loading admin panel..." />;
  }

  // This shouldn't render because we navigate away, but just in case
  if (!isAdmin && !isEducator) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-primary text-primary-foreground fixed left-0 top-0 bottom-0 z-30">
        <SidebarContent 
          currentPath={location.pathname} 
          onNavigate={handleNavigate} 
          onSignOut={handleSignOut} 
        />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-primary text-primary-foreground p-4 sticky top-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Hamburger Menu */}
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-foreground h-10 w-10"
                  >
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-primary text-primary-foreground border-none">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-primary-foreground/10">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-6 h-6" />
                        <span className="font-bold">Admin Menu</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary-foreground h-10 w-10"
                        onClick={() => setSidebarOpen(false)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                    <SidebarContent 
                      currentPath={location.pathname} 
                      onNavigate={handleNavigate} 
                      onSignOut={handleSignOut} 
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Back Button for Mobile */}
              <BackButton
                className="text-primary-foreground hover:bg-primary-foreground/10 h-10 w-10"
                fallbackPath="/admin"
              />

              <div className="flex items-center gap-2">
                <span className="font-bold truncate max-w-[150px]">{title || 'Admin'}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground h-10 w-10"
                onClick={() => navigate('/dashboard')}
              >
                <Users className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground h-10 w-10"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Header - Desktop only */}
        {(title || subtitle) && (
          <div className="hidden lg:flex items-center gap-4 bg-background border-b px-6 py-4">
            <BackButton fallbackPath="/admin" />
            <div>
              {title && <h1 className="text-2xl font-bold text-foreground">{title}</h1>}
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 lg:pb-6">
          {children}
        </main>

        {/* Mobile Bottom Nav - Priority items */}
        <AdminMobileNav />
      </div>
    </div>
  );
};
