import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WelcomeStepProps {
  onNext: () => void;
  userName: string;
}

export const WelcomeStep = ({ onNext, userName }: WelcomeStepProps) => {
  useEffect(() => {
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-primary animate-pulse" />
              <CheckCircle className="h-8 w-8 text-green-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-3xl font-serif text-primary">
            Welcome to EduFutura, {userName}! 🎉
          </CardTitle>
          <p className="text-lg text-muted-foreground">
            Let's personalize your learning experience. This will take about 2 minutes.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step 1 of 4</span>
              <span>0% complete</span>
            </div>
            <Progress value={0} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium">Personalize</h3>
              <p className="text-sm text-muted-foreground">Set up your profile</p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                <span className="text-lg">📚</span>
              </div>
              <h3 className="font-medium">Choose Subjects</h3>
              <p className="text-sm text-muted-foreground">Select what you study</p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto">
                <span className="text-lg">🎯</span>
              </div>
              <h3 className="font-medium">Set Goals</h3>
              <p className="text-sm text-muted-foreground">Define your learning path</p>
            </div>
          </div>

          <Button
            onClick={onNext}
            className="w-full h-12 text-lg font-medium"
            size="lg"
          >
            Let's Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};