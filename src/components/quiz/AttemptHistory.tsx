import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Trophy,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Attempt {
  id: string;
  attempt_number: number;
  submitted_at: string | null;
  score_percentage: number | null;
  passed: boolean | null;
  time_spent_seconds: number | null;
  is_completed: boolean;
}

interface Stats {
  totalAttempts: number;
  completedAttempts: number;
  bestScore: number;
  averageScore: number;
  lastAttemptDate: string | null;
  attemptsToPassed: number | null;
  isImproving: boolean;
}

interface AttemptHistoryProps {
  attempts: Attempt[];
  stats: Stats;
  quizId: string;
}

export const AttemptHistory = ({ attempts, stats, quizId }: AttemptHistoryProps) => {
  const navigate = useNavigate();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const completedAttempts = attempts.filter(a => a.is_completed);

  if (completedAttempts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold text-foreground mb-4">Your Attempt History</h3>

      {/* Statistics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <Trophy className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
          <p className="text-2xl font-bold text-foreground">{Math.round(stats.bestScore)}%</p>
          <p className="text-xs text-muted-foreground">Best Score</p>
        </div>
        
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="h-5 w-5 bg-primary/20 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold text-primary">
            AVG
          </div>
          <p className="text-2xl font-bold text-foreground">{Math.round(stats.averageScore)}%</p>
          <p className="text-xs text-muted-foreground">Average</p>
        </div>
        
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="h-5 w-5 bg-secondary/20 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold text-secondary">
            #{stats.completedAttempts}
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.completedAttempts}</p>
          <p className="text-xs text-muted-foreground">Attempts</p>
        </div>
        
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          {stats.isImproving ? (
            <TrendingUp className="h-5 w-5 text-green-600 mx-auto mb-1" />
          ) : (
            <TrendingDown className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
          )}
          <p className="text-2xl font-bold text-foreground">
            {stats.isImproving ? '+' : ''}
            {Math.round(completedAttempts[0]?.score_percentage - completedAttempts[completedAttempts.length - 1]?.score_percentage || 0)}%
          </p>
          <p className="text-xs text-muted-foreground">Change</p>
        </div>
      </div>

      {/* Attempt List */}
      <div className="space-y-3">
        {completedAttempts.map((attempt, idx) => {
          const prevAttempt = idx < completedAttempts.length - 1 ? completedAttempts[idx + 1] : null;
          const scoreDiff = prevAttempt 
            ? (attempt.score_percentage || 0) - (prevAttempt.score_percentage || 0)
            : null;

          return (
            <div 
              key={attempt.id}
              className="flex items-center justify-between p-4 bg-card border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  attempt.passed 
                    ? 'bg-green-500/20 text-green-600' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  #{attempt.attempt_number}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-lg font-bold text-foreground">
                      {Math.round(attempt.score_percentage || 0)}%
                    </p>
                    {scoreDiff !== null && scoreDiff !== 0 && (
                      <Badge variant={scoreDiff > 0 ? "default" : "destructive"} className="text-xs">
                        {scoreDiff > 0 ? '↑' : '↓'} {Math.abs(Math.round(scoreDiff))}%
                      </Badge>
                    )}
                    {attempt.passed && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(attempt.submitted_at!)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(attempt.time_spent_seconds || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/quiz/${quizId}/results/${attempt.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </div>
          );
        })}
      </div>

      {/* Performance Message */}
      {stats.isImproving && completedAttempts.length >= 2 && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            🎉 Great progress! Your scores are improving. Keep up the excellent work!
          </p>
        </div>
      )}
    </Card>
  );
};
