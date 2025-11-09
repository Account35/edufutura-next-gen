import { BookOpen, Lock, TrendingUp, Clock, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressRing } from '@/components/ui/progress-ring';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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

const getSubjectColor = (subjectName: string) => {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return 'from-subject-math to-subject-math/80';
  if (name.includes('physic') || name.includes('science')) return 'from-subject-physics to-subject-physics/80';
  if (name.includes('life') || name.includes('biology')) return 'from-subject-biology to-subject-biology/80';
  if (name.includes('english')) return 'from-subject-english to-subject-english/80';
  if (name.includes('afrikaans')) return 'from-subject-afrikaans to-subject-afrikaans/80';
  if (name.includes('history')) return 'from-subject-history to-subject-history/80';
  if (name.includes('geography')) return 'from-subject-geography to-subject-geography/80';
  if (name.includes('business')) return 'from-subject-business to-subject-business/80';
  if (name.includes('accounting')) return 'from-subject-accounting to-subject-accounting/80';
  if (name.includes('economic')) return 'from-subject-economics to-subject-economics/80';
  return 'from-primary to-primary-glow';
};

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold text-primary">Your Subjects</h2>
        <Button variant="outline" disabled className="border-secondary hover:bg-secondary/10">
          Add Subject
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {subjects.map((subject) => (
          <Card 
            key={subject.id}
            className="subject-card group relative overflow-hidden"
          >
            {/* Subject color strip */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
              getSubjectColor(subject.subject_name)
            )} />

            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md",
                      getSubjectColor(subject.subject_name)
                    )}>
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-serif truncate">{subject.subject_name}</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {subject.chapters_completed} of {subject.total_chapters || 0} chapters completed
                  </CardDescription>
                </div>

                {/* Progress Ring */}
                <div className="flex-shrink-0">
                  <ProgressRing 
                    progress={subject.progress_percentage} 
                    size={80}
                    strokeWidth={6}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* Stats Row */}
              <div className="flex items-center gap-4 text-sm">
                {subject.average_quiz_score !== null && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-secondary/20 text-secondary-foreground hover:bg-secondary/30">
                      <span className="font-mono">{Math.round(subject.average_quiz_score)}%</span> avg
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">
                    {formatDistanceToNow(new Date(subject.last_accessed), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1 bg-primary hover:bg-primary-glow"
                  disabled
                >
                  Continue Learning
                  <span className="ml-2 text-xs opacity-70">Soon</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  disabled
                  className="min-h-[44px] min-w-[44px] border-primary/20 hover:bg-primary/10"
                >
                  <TrendingUp className="h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Premium Locked Subject Example */}
        {!isPremium && (
          <Card className="subject-card relative overflow-hidden border-dashed border-accent/30">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center space-y-3 p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 pulse-glow">
                  <Lock className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground mb-1">Premium Feature</p>
                  <p className="text-sm text-muted-foreground">Advanced Analytics & More</p>
                </div>
                <Button 
                  size="sm" 
                  onClick={onUpgrade} 
                  className="bg-accent hover:bg-accent/90 shadow-md"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              </div>
            </div>
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent/60" />
            <CardHeader className="opacity-20 pointer-events-none">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl font-serif">Advanced Analytics</span>
                  </CardTitle>
                  <CardDescription>Detailed progress tracking</CardDescription>
                </div>
                <ProgressRing progress={75} size={80} strokeWidth={6} />
              </div>
            </CardHeader>
            <CardContent className="opacity-20 pointer-events-none pt-0">
              <div className="h-20" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};