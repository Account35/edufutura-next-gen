import { MessageSquare, FileText, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileGroupNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileGroupNavigation = ({ activeTab, onTabChange }: MobileGroupNavigationProps) => {
  const tabs = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: FileText },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-30 lg:hidden">
      <div className="grid grid-cols-4 gap-1 p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center py-3 rounded-lg transition-all",
                activeTab === tab.id
                  ? "bg-secondary text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
