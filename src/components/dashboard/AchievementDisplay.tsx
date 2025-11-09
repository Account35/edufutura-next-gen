import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Award, Star, Target, Zap, Medal } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  badge_name: string;
  badge_type: string;
  badge_description: string;
  subject_name: string | null;
  earned_at: string;
  icon_url: string | null;
}

interface AchievementDisplayProps {
  achievements: Achievement[];
}

const getBadgeIcon = (badgeType: string) => {
  switch (badgeType.toLowerCase()) {
    case 'subject_mastery':
      return Trophy;
    case 'streak':
      return Zap;
    case 'milestone':
      return Target;
    case 'special':
      return Star;
    default:
      return Medal;
  }
};

const getBadgeColor = (subjectName: string | null) => {
  if (!subjectName) return 'from-secondary to-secondary/60';
  
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return 'from-subject-math to-subject-math/60';
  if (name.includes('physic') || name.includes('science')) return 'from-subject-physics to-subject-physics/60';
  if (name.includes('life') || name.includes('biology')) return 'from-subject-biology to-subject-biology/60';
  if (name.includes('english')) return 'from-subject-english to-subject-english/60';
  if (name.includes('afrikaans')) return 'from-subject-afrikaans to-subject-afrikaans/60';
  if (name.includes('history')) return 'from-subject-history to-subject-history/60';
  if (name.includes('geography')) return 'from-subject-geography to-subject-geography/60';
  if (name.includes('business')) return 'from-subject-business to-subject-business/60';
  if (name.includes('accounting')) return 'from-subject-accounting to-subject-accounting/60';
  if (name.includes('economic')) return 'from-subject-economics to-subject-economics/60';
  return 'from-secondary to-secondary/60';
};

export const AchievementDisplay = ({ achievements }: AchievementDisplayProps) => {
  if (achievements.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary font-serif">
            <Trophy className="h-5 w-5 text-secondary" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Trophy}
            title="No badges yet"
            description="Earn badges by completing chapters and quizzes"
          />
        </CardContent>
      </Card>
    );
  }

  const isRecent = (date: string) => {
    const earnedDate = new Date(date);
    const daysSince = (Date.now() - earnedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 7; // Recent if earned within last 7 days
  };

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary font-serif">
          <Trophy className="h-5 w-5 text-secondary" />
          Recent Achievements
        </CardTitle>
        <CardDescription>Your latest badges and milestones</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline connector line */}
          {achievements.length > 1 && (
            <div className="achievement-timeline absolute inset-0" />
          )}
          
          <div className="grid grid-cols-3 gap-4 relative">
            {achievements.map((achievement) => {
              const Icon = getBadgeIcon(achievement.badge_type);
              const recent = isRecent(achievement.earned_at);
              
              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "flex flex-col items-center text-center space-y-2 p-3 rounded-lg",
                    "hover:bg-muted/30 transition-all duration-200 cursor-pointer group",
                    recent && "scale-110"
                  )}
                >
                  <div className={cn(
                    "w-14 h-14 md:w-16 md:h-16 rounded-full shadow-md",
                    "flex items-center justify-center relative",
                    "bg-gradient-to-br",
                    getBadgeColor(achievement.subject_name),
                    "group-hover:scale-110 transition-transform duration-200",
                    recent && "pulse-glow"
                  )}>
                    <Icon className="h-7 w-7 md:h-8 md:w-8 text-white" />
                    {recent && (
                      <div className="absolute -top-1 -right-1">
                        <Star className="h-4 w-4 text-secondary fill-secondary animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 min-h-[3rem]">
                    <p className="text-xs font-semibold leading-tight line-clamp-2">
                      {achievement.badge_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};