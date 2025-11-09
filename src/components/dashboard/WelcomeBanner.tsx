import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeBannerProps {
  userName: string;
  gradeLevel: number;
  schoolName?: string;
  profilePicture?: string;
  isPremium: boolean;
  className?: string;
}

export const WelcomeBanner = ({
  userName,
  gradeLevel,
  schoolName,
  profilePicture,
  isPremium,
  className,
}: WelcomeBannerProps) => {
  return (
    <div className={cn('welcome-banner rounded-xl p-6 md:p-8 relative overflow-hidden', className)}>
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary-glow opacity-50" />
      
      <div className="relative z-10 flex items-center gap-4 md:gap-6">
        {/* Profile Picture */}
        <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-secondary shadow-lg">
          <AvatarImage src={profilePicture} alt={userName} />
          <AvatarFallback className="text-2xl font-bold bg-secondary text-secondary-foreground">
            {userName.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground truncate">
            Welcome, {userName}!
          </h1>
          <p className="text-primary-foreground/90 text-sm md:text-base mt-1">
            Grade {gradeLevel}
            {schoolName && ` • ${schoolName}`}
          </p>
        </div>

        {/* Premium Badge */}
        <div className="absolute top-4 right-4">
          {isPremium ? (
            <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md">
              <Crown className="h-3 w-3 mr-1" />
              Premium
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-muted-foreground">
              Free Plan
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary" />
    </div>
  );
};