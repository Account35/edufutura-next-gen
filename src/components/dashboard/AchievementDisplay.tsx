import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDistanceToNow } from 'date-fns';

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

export const AchievementDisplay = ({ achievements }: AchievementDisplayProps) => {
  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
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
    <Card>
      <CardHeader>
        <CardTitle>Recent Achievements</CardTitle>
        <CardDescription>Your latest badges and milestones</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="flex flex-col items-center text-center space-y-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium leading-none">
                  {achievement.badge_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(achievement.earned_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};