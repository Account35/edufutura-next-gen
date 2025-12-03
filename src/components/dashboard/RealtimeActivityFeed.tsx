import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, BookOpen, Trophy, CheckCircle, MessageSquare, Users, FileText, RefreshCw } from 'lucide-react';
import { useActivityFeed } from '@/hooks/useActivityFeed';

/**
 * Real-time activity feed component with Phase 9 backend integration
 * Shows recent user activities with live updates
 */
export const RealtimeActivityFeed = () => {
  const { activities, loading, hasMore, loadMore, refresh } = useActivityFeed({
    limit: 10,
    enableRealtime: true,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chapter_completed':
        return CheckCircle;
      case 'badge_earned':
      case 'certificate_earned':
        return Trophy;
      case 'quiz_completed':
        return Activity;
      case 'resource_shared':
        return FileText;
      case 'group_joined':
        return Users;
      case 'forum_post':
        return MessageSquare;
      default:
        return BookOpen;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'chapter_completed':
        return 'text-green-600';
      case 'badge_earned':
      case 'certificate_earned':
        return 'text-secondary';
      case 'quiz_completed':
        return 'text-primary';
      case 'resource_shared':
        return 'text-blue-600';
      case 'group_joined':
        return 'text-purple-600';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

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
            description="Your learning activities will appear here as you study"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest learning milestones</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          className="h-8 w-8"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const Icon = getActivityIcon(activity.type);
            const iconColor = getActivityColor(activity.type);
            const isNew = index === 0 && Date.now() - new Date(activity.timestamp).getTime() < 60000;

            return (
              <div 
                key={activity.id} 
                className={`flex gap-3 ${isNew ? 'animate-pulse bg-secondary/5 -mx-2 px-2 py-1 rounded-lg' : ''}`}
              >
                <div className={`mt-0.5 ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                    {activity.subject && (
                      <Badge variant="outline" className="text-xs">
                        {activity.subject}
                      </Badge>
                    )}
                    {isNew && (
                      <Badge className="text-xs bg-green-500">New</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};