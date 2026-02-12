import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Shield, 
  Users, 
  Headphones, 
  BarChart3,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { BookOpen, FileQuestion, Briefcase, ScrollText, GraduationCap } from 'lucide-react';

// Priority mobile navigation items (shown in bottom nav)
const priorityItems = [
  { href: '/admin/moderation', label: 'Moderation', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/support', label: 'Support', icon: Headphones },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

// Additional items shown in "More" sheet
const moreItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/content', label: 'Content', icon: BookOpen },
  { href: '/admin/curriculum', label: 'Curriculum', icon: GraduationCap },
  { href: '/admin/quizzes', label: 'Quizzes', icon: FileQuestion },
  { href: '/admin/onboarding', label: 'Onboarding', icon: GraduationCap },
  { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminMobileNav() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {priorityItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[48px] rounded-lg transition-colors',
              isActive(item.href) 
                ? 'text-secondary' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </Link>
        ))}
        
        {/* More Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center p-2 min-w-[64px] min-h-[48px] rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh]">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-secondary" />
                Admin Menu
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 pb-6">
              {moreItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex flex-col items-center justify-center p-4 rounded-xl border transition-colors min-h-[80px]',
                    isActive(item.href)
                      ? 'bg-secondary/10 border-secondary text-secondary'
                      : 'bg-muted/50 border-transparent hover:bg-muted'
                  )}
                >
                  <item.icon className="w-6 h-6 mb-2" />
                  <span className="text-xs font-medium text-center">{item.label}</span>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
