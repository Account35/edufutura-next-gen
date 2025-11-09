import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Activity, BookOpen, Trophy, CheckCircle } from 'lucide-react';

interface ActivityItem {
  id: string;
  activity_type: string;
  activity_description: string;
  subject_name: string | null;
  timestamp: string;
  metadata: any;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chapter_completed':
        return CheckCircle;
      case 'badge_earned':
        return Trophy;
      case 'quiz_completed':
        return Activity;
      default:
        return BookOpen;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'chapter_completed':
        return 'text-green-600';
      case 'badge_earned':
        return 'text-accent';
      case 'quiz_completed':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="No activity yet"
            description="Your learning activities will appear here"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest learning milestones</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.activity_type);
            const iconColor = getActivityColor(activity.activity_type);

            return (
              <div key={activity.id} className="flex gap-3">
                <div className={`mt-0.5 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.activity_description}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                    {activity.subject_name && (
                      <Badge variant="outline" className="text-xs">
                        {activity.subject_name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};