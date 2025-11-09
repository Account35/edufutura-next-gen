import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, MapPin, Flame, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeBannerProps {
  userName: string;
  gradeLevel: number;
  schoolName?: string;
  province?: string;
  profilePicture?: string;
  isPremium: boolean;
  totalStudyHours?: number;
  studyStreakDays?: number;
  overallProgress?: number;
  onUpgradeClick?: () => void;
  className?: string;
}

const getTimeBasedGreeting = (name: string): string => {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];
  
  if (hour >= 5 && hour < 12) return `Good morning, ${firstName}!`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}!`;
  if (hour >= 17 && hour < 24) return `Good evening, ${firstName}!`;
  return `Welcome back, ${firstName}!`;
};

export const WelcomeBanner = ({
  userName,
  gradeLevel,
  schoolName,
  province,
  profilePicture,
  isPremium,
  totalStudyHours = 0,
  studyStreakDays = 0,
  overallProgress = 0,
  onUpgradeClick,
  className,
}: WelcomeBannerProps) => {
  const greeting = getTimeBasedGreeting(userName);
  const hours = Math.floor(totalStudyHours);
  const minutes = Math.round((totalStudyHours - hours) * 60);
  
  return (
    <div className={cn('welcome-banner rounded-xl p-4 md:p-6 relative overflow-hidden', className)}>
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary-glow/95" />
      
      <div className="relative z-10">
        {/* Top section with profile and greeting */}
        <div className="flex items-start gap-4 md:gap-6 mb-4">
          {/* Profile Picture */}
          <Avatar className="h-16 w-16 md:h-20 md:w-20 border-4 border-white shadow-lg flex-shrink-0">
            <AvatarImage src={profilePicture} alt={userName} className="object-cover" />
            <AvatarFallback className="text-2xl font-bold bg-secondary text-secondary-foreground">
              {userName.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-3xl font-serif font-bold text-white truncate">
              {greeting}
            </h1>
            <p className="text-white/90 text-sm md:text-base mt-1 flex items-center gap-2 flex-wrap">
              <span>Grade {gradeLevel}</span>
              {schoolName && province && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {schoolName} ({province})
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Premium Badge */}
          <div className="flex-shrink-0">
            {isPremium ? (
              <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md">
                <Crown className="h-3 w-3 mr-1" />
                Premium Member
              </Badge>
            ) : (
              <div className="text-right">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-2">
                  Free Plan
                </Badge>
                {onUpgradeClick && (
                  <Button
                    onClick={onUpgradeClick}
                    size="sm"
                    className="bg-secondary/20 text-white border border-secondary rounded-full px-3 py-1 text-xs font-semibold hover:bg-secondary/30 transition"
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick stats summary */}
        <div className="flex items-center gap-4 md:gap-6 text-white/90 text-sm flex-wrap">
          {totalStudyHours > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-semibold">
                {hours}h {minutes}m
              </span>
              <span className="opacity-75">total study time</span>
            </div>
          )}
          
          {studyStreakDays > 0 && (
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-secondary" />
              <span className="font-mono font-semibold">{studyStreakDays}</span>
              <span className="opacity-75">day streak</span>
            </div>
          )}
          
          {overallProgress > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono font-semibold">{Math.round(overallProgress)}%</span>
              <span className="opacity-75">overall progress</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
    </div>
  );
};