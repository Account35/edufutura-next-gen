import { CheckCircle, Clock, Circle } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress-ring";

interface ProgressIndicatorProps {
  status: 'not_started' | 'in_progress' | 'completed';
  percentage?: number;
  completedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressIndicator = ({ 
  status, 
  percentage = 0, 
  completedAt,
  size = 'md'
}: ProgressIndicatorProps) => {
  const sizeConfig = {
    sm: { ring: 40, icon: 'h-4 w-4', text: 'text-xs' },
    md: { ring: 60, icon: 'h-5 w-5', text: 'text-sm' },
    lg: { ring: 80, icon: 'h-6 w-6', text: 'text-base' },
  };

  const { ring, icon, text } = sizeConfig[size];

  if (status === 'completed') {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
          <CheckCircle className={`${icon} text-green-600`} />
        </div>
        <span className={`${text} text-green-600 font-medium`}>Completed</span>
        {completedAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(completedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    );
  }

  if (status === 'in_progress') {
    return (
      <div className="flex flex-col items-center gap-1">
        <ProgressRing progress={percentage} size={ring} strokeWidth={4} />
        <span className={`${text} text-secondary font-medium`}>
          {Math.round(percentage)}% complete
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
        <Circle className={`${icon} text-muted-foreground`} />
      </div>
      <span className={`${text} text-muted-foreground`}>Not Started</span>
    </div>
  );
};
