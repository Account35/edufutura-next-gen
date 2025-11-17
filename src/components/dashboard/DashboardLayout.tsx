import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAIChat } from "@/hooks/useAIChat";
import { AIChatModal } from "@/components/ai/AIChatModal";
import { FloatingAIButton } from "@/components/ai/FloatingAIButton";
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
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
}

// Shared navigation config matching bottom nav
const navigation = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Subjects", href: "/subjects", icon: BookOpen },
  { name: "Bookmarks", href: "/bookmarks", icon: Bookmark },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Profile", href: "/profile", icon: User },
  { name: "AI Tutor", href: "#", icon: MessageSquare, premium: true, isAITutor: true },
  { name: "Certificates", href: "/certificates", icon: Trophy, premium: true, comingSoon: true },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const { isOpen: isAIChatOpen, openChat: openAIChat, closeChat: closeAIChat } = useAIChat();

  // Track page entry time for AI context
  useEffect(() => {
    sessionStorage.setItem('page-entry-time', Date.now().toString());
  }, [location.pathname]);

  // Keyboard shortcut to open AI chat
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && !isAIChatOpen && 
          !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        openAIChat();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAIChatOpen, openAIChat]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Error signing out");
    }
  };

  // Helper to check if route is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  // Temporary route change logger
  useEffect(() => {
    console.log("[Route] Now at:", location.pathname);
  }, [location.pathname]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-border flex-shrink-0">
        <Button
          variant="ghost"
          className="flex items-center gap-2 p-0 h-auto hover:bg-transparent hover:text-primary focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
          onClick={() => {
            navigate("/dashboard");
            setSidebarOpen(false);
          }}
        >
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-serif font-bold text-xl text-primary">EduFutura</span>
        </Button>
        <p className="text-sm text-muted-foreground mt-1">South African Education</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;

          // Coming Soon items
          if (item.comingSoon) {
            return (
              <button
                key={item.name}
                type="button"
                className="w-full flex items-center justify-start min-h-[44px] px-4 py-2 rounded-md transition-colors opacity-60 hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  toast.info("This feature is coming soon!");
                  setSidebarOpen(false);
                }}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.premium && !isPremium && <Crown className="ml-auto h-4 w-4 text-secondary" />}
                <span className="ml-auto text-xs text-muted-foreground">Soon</span>
              </button>
            );
          }

          // AI Tutor button
          if (item.isAITutor) {
            return (
              <button
                key={item.name}
                type="button"
                className="w-full flex items-center justify-start min-h-[44px] px-4 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  openAIChat();
                  setSidebarOpen(false);
                }}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
                {item.premium && !isPremium && <Crown className="ml-auto h-4 w-4 text-secondary" />}
              </button>
            );
          }

          // Regular navigation - simplified like bottom nav
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                navigate(item.href);
                setSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-start min-h-[44px] px-4 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive(item.href) && "bg-secondary text-secondary-foreground",
              )}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
              {item.premium && !isPremium && <Crown className="ml-auto h-4 w-4 text-secondary" />}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Avatar>
            <AvatarImage src={userProfile?.profile_picture_url} />
            <AvatarFallback>{userProfile?.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userProfile?.full_name}</p>
            <p className="text-xs text-muted-foreground">{isPremium ? "👑 Premium" : "Free Account"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            navigate("/settings");
            setSidebarOpen(false);
          }}
          className={cn(
            "w-full flex items-center justify-start min-h-[44px] px-4 py-2 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground",
            isActive("/settings") && "bg-secondary text-secondary-foreground",
          )}
          aria-current={isActive("/settings") ? "page" : undefined}
        >
          <Settings className="mr-3 h-5 w-5" />
          Settings
        </button>
        <Button
          variant="ghost"
          className="w-full justify-start min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
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
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:bg-background lg:z-[100] relative pointer-events-auto">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:pl-64 pb-16 lg:pb-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onMoreClick={() => setMoreMenuOpen(true)} onAIClick={openAIChat} />
      <MobileMoreSheet isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />

      {/* Floating AI Button */}
      <FloatingAIButton onClick={openAIChat} />

      {/* AI Chat Modal */}
      <AIChatModal isOpen={isAIChatOpen} onClose={closeAIChat} />
    </div>
  );
};
