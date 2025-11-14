import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { SubjectPerformance as SubjectPerformanceType } from '@/hooks/useAnalytics';
import { useNavigate } from 'react-router-dom';

interface SubjectPerformanceProps {
  subjects: SubjectPerformanceType[];
}

export const SubjectPerformance = ({ subjects }: SubjectPerformanceProps) => {
  const navigate = useNavigate();

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (score >= 75) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    if (score >= 60) return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (subjects.length === 0) {
    return (
      <Card className="p-12 text-center">
        <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold text-foreground mb-2">No Quiz Data Yet</h3>
        <p className="text-muted-foreground">Complete some quizzes to see your performance analytics</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {subjects.map((subject) => (
        <Card key={subject.subjectName} className="p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xl font-bold text-foreground truncate">{subject.subjectName}</h3>
                <Badge variant="outline" className="shrink-0">
                  {subject.quizCount} quiz{subject.quizCount !== 1 ? 'zes' : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Average Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(subject.averageScore).split(' ')[0]}`}>
                    {Math.round(subject.averageScore)}%
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Best Score</p>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <p className="text-2xl font-bold text-foreground">{Math.round(subject.bestScore)}%</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last Attempt</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{formatDate(subject.lastAttemptDate)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Knowledge Gaps</p>
                  <div className="flex items-center gap-1">
                    {subject.knowledgeGaps > 0 && <AlertCircle className="h-4 w-4 text-orange-600" />}
                    <p className="text-sm font-medium text-foreground">
                      {subject.knowledgeGaps > 0 ? `${subject.knowledgeGaps} topics` : 'None'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/analytics/${encodeURIComponent(subject.subjectName)}`)}
              className="shrink-0"
            >
              View Details
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};
