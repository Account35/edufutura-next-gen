import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Activity, 
  UserPlus, 
  Crown, 
  FileQuestion, 
  BookOpen, 
  Shield, 
  MessageSquare,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  trend?: number;
  loading?: boolean;
  colorClass?: string;
}

const StatCard = ({ title, value, icon: Icon, trend, loading, colorClass = 'text-primary' }: StatCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {trend !== undefined && (
                <span className={`flex items-center text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-full bg-muted ${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AdminStatsGridProps {
  stats: {
    totalUsers: number;
    activeToday: number;
    newThisWeek: number;
    premiumSubscribers: number;
    activeQuizzes: number;
    totalChapters: number;
    pendingReviews: number;
    totalForumPosts: number;
  };
  loading: boolean;
}

export const AdminStatsGrid = ({ stats, loading }: AdminStatsGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers.toLocaleString()}
        icon={Users}
        loading={loading}
        colorClass="text-blue-600"
      />
      <StatCard
        title="Active Today"
        value={stats.activeToday.toLocaleString()}
        icon={Activity}
        loading={loading}
        colorClass="text-green-600"
      />
      <StatCard
        title="New This Week"
        value={stats.newThisWeek.toLocaleString()}
        icon={UserPlus}
        loading={loading}
        colorClass="text-purple-600"
      />
      <StatCard
        title="Premium Users"
        value={stats.premiumSubscribers.toLocaleString()}
        icon={Crown}
        loading={loading}
        colorClass="text-secondary"
      />
      <StatCard
        title="Active Quizzes"
        value={stats.activeQuizzes.toLocaleString()}
        icon={FileQuestion}
        loading={loading}
        colorClass="text-indigo-600"
      />
      <StatCard
        title="Total Chapters"
        value={stats.totalChapters.toLocaleString()}
        icon={BookOpen}
        loading={loading}
        colorClass="text-teal-600"
      />
      <StatCard
        title="Pending Reviews"
        value={stats.pendingReviews.toLocaleString()}
        icon={Shield}
        loading={loading}
        colorClass="text-orange-600"
      />
      <StatCard
        title="Forum Posts"
        value={stats.totalForumPosts.toLocaleString()}
        icon={MessageSquare}
        loading={loading}
        colorClass="text-pink-600"
      />
    </div>
  );
};
