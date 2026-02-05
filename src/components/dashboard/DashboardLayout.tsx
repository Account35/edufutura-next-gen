import { ReactNode, useState } from "react";
import { useAIChat } from "@/hooks/useAIChat";
import { AIChatModal } from "@/components/ai/AIChatModal";
import { FloatingAIButton } from "@/components/ai/FloatingAIButton";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { OnboardingReminderBanner } from "@/components/onboarding";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { isOpen: isAIChatOpen, openChat: openAIChat, closeChat: closeAIChat } = useAIChat();

  return (
    <div className="min-h-screen bg-background">
      {/* Onboarding Reminder Banner */}
      <OnboardingReminderBanner />

      {/* Notification Bell - Fixed position on desktop */}
      <div className="fixed top-4 right-4 z-30 hidden lg:block">
        <NotificationBell />
      </div>

      {/* Main Content */}
      <main className="pb-16 lg:pb-0 lg:pl-20">
        <div className="container mx-auto p-4 md:p-6 lg:p-8">{children}</div>
      </main>

      {/* Navigation (side on desktop, bottom on mobile) */}
      <MobileBottomNav onMoreClick={() => setMoreMenuOpen(true)} />
      <MobileMoreSheet isOpen={moreMenuOpen} onClose={() => setMoreMenuOpen(false)} />

      {/* Floating AI Button */}
      <FloatingAIButton onClick={openAIChat} />

      {/* AI Chat Modal */}
      <AIChatModal isOpen={isAIChatOpen} onClose={closeAIChat} />
    </div>
  );
};
