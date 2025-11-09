import { BookOpen, Lock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

interface Subject {
  id: string;
  subject_name: string;
  progress_percentage: number;
  chapters_completed: number;
  total_chapters: number;
  average_quiz_score: number | null;
  last_accessed: string;
}

interface SubjectGridProps {
  subjects: Subject[];
  isPremium: boolean;
  onUpgrade: () => void;
}

export const SubjectGrid = ({ subjects, isPremium, onUpgrade }: SubjectGridProps) => {
  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No subjects yet"
        description="Complete your profile to see your subjects here"
        action={{
          label: 'Update Profile',
          onClick: () => window.location.href = '/settings'
        }}
      />
    );
  }

  const getSubjectColor = (index: number) => {
    const colors = [
      'from-primary to-primary-glow',
      'from-secondary to-secondary/80',
      'from-accent to-accent/80',
      'from-muted to-muted/60',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">My Subjects</h2>
        <Button variant="outline" disabled>
          Add Subject
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((subject, index) => (
          <Card 
            key={subject.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getSubjectColor(index)} flex items-center justify-center`}>
                      <BookOpen className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="text-lg">{subject.subject_name}</span>
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {subject.chapters_completed} of {subject.total_chapters || 0} chapters completed
                  </CardDescription>
                </div>
                {subject.average_quiz_score !== null && (
                  <Badge variant="secondary" className="ml-2">
                    {Math.round(subject.average_quiz_score)}% avg
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {Math.round(subject.progress_percentage)}%
                  </span>
                </div>
                <Progress value={subject.progress_percentage} />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  variant="outline"
                  disabled
                >
                  Continue Learning
                  <span className="ml-2 text-xs text-muted-foreground">Soon</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled
                  className="min-h-[44px] min-w-[44px]"
                >
                  <TrendingUp className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Premium Locked Subject Example */}
        {!isPremium && (
          <Card className="relative overflow-hidden border-dashed">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center space-y-2 p-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/20">
                  <Lock className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium">Premium Feature</p>
                <Button size="sm" onClick={onUpgrade} className="bg-accent hover:bg-accent/90">
                  Upgrade
                </Button>
              </div>
            </div>
            <CardHeader className="opacity-30">
              <CardTitle>Advanced Analytics</CardTitle>
              <CardDescription>Detailed progress tracking</CardDescription>
            </CardHeader>
            <CardContent className="opacity-30">
              <Progress value={75} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};