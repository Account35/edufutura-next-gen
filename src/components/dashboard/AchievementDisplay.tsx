import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Star, Target, Zap, Crown, CheckCircle, Flame } from 'lucide-react';
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
    case 'beginner':
      return Star;
    case 'intermediate':
      return Award;
    case 'advanced':
      return Crown;
    case 'expert':
      return Trophy;
    case 'streak':
      return Flame;
    case 'completion':
      return CheckCircle;
    case 'milestone':
      return Target;
    default:
      return Trophy;
  }
};

const isRecentBadge = (earnedAt: string): boolean => {
  const earnedDate = new Date(earnedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - earnedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 2;
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

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary font-serif">
          <Trophy className="h-5 w-5 text-secondary" />
          Recent Achievements
        </CardTitle>
        <CardDescription>Your latest badges and milestones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0 relative">
          {/* Timeline connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 border-l-2 border-dashed border-secondary" />
          
          {achievements.map((achievement, index) => {
            const Icon = getBadgeIcon(achievement.badge_type);
            const color = getBadgeColor(achievement.subject_name);
            const isRecent = isRecentBadge(achievement.earned_at);
            
            return (
              <div 
                key={achievement.id} 
                className="flex items-start gap-4 group hover:bg-muted/50 p-3 rounded-lg transition-colors relative"
              >
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md relative z-10',
                  color,
                  isRecent && 'pulse-glow animate-pulse'
                )}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0 pt-1">
                  <p className="font-semibold text-base text-primary">
                    {achievement.badge_name}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {achievement.badge_description}
                  </p>
                  {achievement.subject_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {achievement.subject_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Earned {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <Button 
          variant="link" 
          className="w-full text-secondary hover:underline mt-4"
          onClick={() => window.location.href = '/certificates'}
        >
          View All Achievements
        </Button>
      </CardContent>
    </Card>
  );
};