import { Card } from '@/components/ui/card';
import { Trophy, CheckSquare, Target, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { AnalyticsOverview } from '@/hooks/useAnalytics';

interface OverviewStatsProps {
  overview: AnalyticsOverview;
}

export const OverviewStats = ({ overview }: OverviewStatsProps) => {
  const stats = [
    {
      icon: Trophy,
      label: 'Average Score',
      value: `${Math.round(overview.averageScore)}%`,
      trend: overview.weeklyTrend,
      color: 'text-yellow-600',
    },
    {
      icon: CheckSquare,
      label: 'Quizzes Completed',
      value: overview.totalQuizzes,
      color: 'text-primary',
    },
    {
      icon: Target,
      label: 'Pass Rate',
      value: `${Math.round(overview.passRate)}%`,
      color: 'text-green-600',
    },
    {
      icon: Flame,
      label: 'Study Streak',
      value: `${overview.studyStreak} days`,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <Card key={idx} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-muted/30 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
              </div>
            </div>
            {stat.trend !== undefined && stat.trend !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${stat.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stat.trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{Math.abs(Math.round(stat.trend))}%</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};
