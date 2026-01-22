import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, GraduationCap, BookOpen, Target, Users, Sparkles } from 'lucide-react';

interface CompletionStepProps {
  onComplete: () => void;
  userData: {
    name: string;
    selectedSubjects: string[];
    learningStyle: string;
    studyPace: string;
  };
}

export const CompletionStep = ({ onComplete, userData }: CompletionStepProps) => {
  useEffect(() => {
    // Celebration animation
    const timer = setTimeout(() => {
      // Could add more celebration effects here
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getLearningStyleDisplay = (style: string) => {
    const styles = {
      visual: 'Visual',
      auditory: 'Auditory',
      reading: 'Reading/Writing',
      kinesthetic: 'Hands-on'
    };
    return styles[style as keyof typeof styles] || style;
  };

  const getStudyPaceDisplay = (pace: string) => {
    const paces = {
      relaxed: 'Relaxed (30 min/day)',
      moderate: 'Moderate (1 hour/day)',
      intensive: 'Intensive (2+ hours/day)'
    };
    return paces[pace as keyof typeof paces] || pace;
  };

  const nextSteps = [
    {
      icon: BookOpen,
      title: 'Browse your first chapter',
      description: `Start with ${userData.selectedSubjects[0]} curriculum`
    },
    {
      icon: Target,
      title: 'Take a practice quiz',
      description: 'Test your knowledge and see your level'
    },
    {
      icon: Sparkles,
      title: 'Ask the AI tutor a question',
      description: 'Get instant help with any topic'
    },
    {
      icon: Users,
      title: 'Join a study group',
      description: `Connect with other ${userData.selectedSubjects[0]} students`
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <GraduationCap className="h-20 w-20 text-primary animate-bounce" />
              <CheckCircle className="h-8 w-8 text-green-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-4xl font-serif text-primary">
            You're All Set! 🎓
          </CardTitle>
          <p className="text-xl text-muted-foreground">
            Welcome to EduFutura, {userData.name}!
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Setup Summary */}
          <div className="bg-muted/50 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-4">Here's what we've set up for you:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Your Subjects
                </h4>
                <div className="flex flex-wrap gap-1">
                  {userData.selectedSubjects.slice(0, 3).map(subject => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                  {userData.selectedSubjects.length > 3 && (
                    <Badge variant="outline">
                      +{userData.selectedSubjects.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Learning Preferences
                </h4>
                <div className="space-y-1 text-sm">
                  <div>Style: {getLearningStyleDisplay(userData.learningStyle)}</div>
                  <div>Pace: {getStudyPaceDisplay(userData.studyPace)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Recommended First Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nextSteps.map((step, index) => {
                const IconComponent = step.icon;
                return (
                  <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Badge */}
          <div className="text-center p-6 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h4 className="font-semibold text-lg mb-2">Quick Starter Badge Unlocked! 🏆</h4>
            <p className="text-muted-foreground">
              You've completed your EduFutura profile setup. Keep learning to unlock more achievements!
            </p>
          </div>

          <Button
            onClick={onComplete}
            className="w-full h-14 text-lg font-medium"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};