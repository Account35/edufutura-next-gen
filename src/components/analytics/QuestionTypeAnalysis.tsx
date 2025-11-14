import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, TrendingUp } from 'lucide-react';
import { QuestionTypeStats } from '@/hooks/useAnalytics';

interface QuestionTypeAnalysisProps {
  stats: QuestionTypeStats[];
}

export const QuestionTypeAnalysis = ({ stats }: QuestionTypeAnalysisProps) => {
  const formatType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' };
    return { label: 'Needs Work', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' };
  };

  if (stats.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-foreground mb-4">Performance by Question Type</h3>
      <div className="space-y-4">
        {stats.map((stat) => {
          const performance = getPerformanceLevel(stat.averageScore);
          
          return (
            <div key={stat.type} className={`p-4 rounded-lg border ${performance.bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{formatType(stat.type)}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stat.correctAnswered} of {stat.totalAnswered} correct
                  </p>
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${performance.color} bg-background/50`}>
                  {performance.label}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className={`font-bold ${performance.color}`}>
                    {Math.round(stat.averageScore)}%
                  </span>
                </div>
                <Progress value={stat.averageScore} className="h-2" />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Correct</p>
                    <p className="text-sm font-medium text-foreground">{stat.correctAnswered}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-sm font-medium text-foreground">{stat.totalAnswered}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                    <p className="text-sm font-medium text-foreground">{formatTime(stat.averageTime)}</p>
                  </div>
                </div>
              </div>

              {stat.averageScore < 60 && (
                <div className="mt-3 p-3 bg-background/50 rounded border border-border/50">
                  <p className="text-xs text-muted-foreground">
                    💡 <span className="font-medium">Tip:</span> Practice more {formatType(stat.type).toLowerCase()} questions to improve your accuracy.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
