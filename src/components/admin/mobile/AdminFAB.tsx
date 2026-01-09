import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminFABProps {
  icon?: ReactNode;
  label?: string;
  onClick: () => void;
  className?: string;
}

export function AdminFAB({ icon, label, onClick, className }: AdminFABProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        'fixed right-4 bottom-20 lg:bottom-6 z-40',
        'h-14 min-w-14 rounded-full shadow-lg',
        'bg-secondary text-secondary-foreground hover:bg-secondary/90',
        label ? 'px-6 gap-2' : 'w-14 p-0',
        className
      )}
    >
      {icon || <Plus className="h-6 w-6" />}
      {label && <span className="font-medium">{label}</span>}
    </Button>
  );
}
