import { Award, Crown, Shield, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ReputationBadgeProps {
  level: string;
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

const levelConfig = {
  Newcomer: {
    icon: Star,
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    description: 'New community member',
  },
  Contributor: {
    icon: Award,
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    description: 'Active community contributor',
  },
  Trusted: {
    icon: Shield,
    color: 'bg-secondary/20 text-primary border-secondary',
    description: 'Trusted community member',
  },
  Leader: {
    icon: Crown,
    color: 'bg-gradient-to-r from-secondary/30 to-primary/20 text-primary border-secondary',
    description: 'Community leader',
  },
};

export function ReputationBadge({
  level,
  score,
  size = 'md',
  showScore = false,
  className,
}: ReputationBadgeProps) {
  const config = levelConfig[level as keyof typeof levelConfig] || levelConfig.Newcomer;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 font-semibold border transition-all hover:scale-105',
              config.color,
              sizeClasses[size],
              className
            )}
          >
            <Icon className={iconSizes[size]} />
            <span>{level}</span>
            {showScore && <span className="ml-1 opacity-70">({score})</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{level}</p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
          <p className="text-xs font-mono mt-1">{score} reputation points</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
