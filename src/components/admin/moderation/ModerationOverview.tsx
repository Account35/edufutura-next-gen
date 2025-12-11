import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  FileText, 
  AlertTriangle, 
  Flag,
  CheckCircle,
  Clock,
  Trophy
} from 'lucide-react';
import type { ModerationStats } from '@/hooks/useModeration';

interface ModerationOverviewProps {
  stats: ModerationStats;
}

export const ModerationOverview = ({ stats }: ModerationOverviewProps) => {
  const statCards = [
    {
      label: 'Forum Posts',
      value: stats.pendingForumPosts,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Chat Messages',
      value: stats.pendingChatMessages,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      label: 'Resources',
      value: stats.pendingResources,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      label: 'User Reports',
      value: stats.pendingReports,
      icon: Flag,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  const totalPending = stats.pendingForumPosts + stats.pendingChatMessages + 
    stats.pendingResources + stats.pendingReports;

  return (
    <div className="space-y-6">
      {/* Pending Counts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Pending Review</h2>
          {totalPending > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {totalPending} items need attention
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.reviewedToday}</p>
              <p className="text-sm text-muted-foreground">Reviewed Today</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/20">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.avgReviewTime > 0 ? `${stats.avgReviewTime}m` : '--'}
              </p>
              <p className="text-sm text-muted-foreground">Avg Review Time</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">Top Moderator</p>
              <p className="text-sm text-muted-foreground">View Leaderboard</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
