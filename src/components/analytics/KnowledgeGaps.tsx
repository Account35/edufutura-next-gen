import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BookOpen, MessageSquare, Play } from 'lucide-react';
import { KnowledgeGap } from '@/hooks/useAnalytics';
import { useNavigate } from 'react-router-dom';

interface KnowledgeGapsProps {
  gaps: KnowledgeGap[];
}

export const KnowledgeGaps = ({ gaps }: KnowledgeGapsProps) => {
  const navigate = useNavigate();

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

  const getSeverity = (quizCount: number) => {
    if (quizCount >= 3) return { label: 'Critical', color: 'destructive' };
    if (quizCount >= 2) return { label: 'Important', color: 'default' };
    return { label: 'Review', color: 'secondary' };
  };

  if (gaps.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No Knowledge Gaps Detected</h3>
        <p className="text-muted-foreground">You're performing well across all topics! Keep up the great work.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <h3 className="text-xl font-bold text-foreground">Knowledge Gaps to Address</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        These topics appear frequently in your incorrect answers. Focus on these areas to improve your performance.
      </p>

      <div className="space-y-3">
        {gaps.map((gap, idx) => {
          const severity = getSeverity(gap.quizCount);
          
          return (
            <div key={idx} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground truncate">{gap.topic}</h4>
                    <Badge variant={severity.color as any} className="shrink-0">
                      {severity.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{gap.quizCount} quiz{gap.quizCount !== 1 ? 'zes' : ''} affected</span>
                    <span>•</span>
                    <span>Last seen {formatDate(gap.lastAttempted)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to curriculum search or chapter
                    navigate('/subjects');
                  }}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Review Content
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Would navigate to AI chat with pre-loaded topic
                    navigate('/dashboard');
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask AI Tutor
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Would generate a practice quiz on this topic
                    navigate('/subjects');
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Practice Quiz
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
