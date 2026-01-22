import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Play, SkipForward, X } from 'lucide-react';

interface TourStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const tourSteps = [
  {
    title: 'Your Dashboard',
    description: 'Your personalized dashboard shows your progress, upcoming quizzes, and study streak.',
    icon: '📊',
    highlight: 'dashboard'
  },
  {
    title: 'Subject Curriculum',
    description: 'Browse all subjects and chapters aligned with CAPS curriculum, organized by grade.',
    icon: '📚',
    highlight: 'curriculum'
  },
  {
    title: 'AI Study Assistant',
    description: 'Get instant help from your AI tutor - ask questions anytime, anywhere.',
    icon: '🤖',
    highlight: 'ai-assistant'
  },
  {
    title: 'Interactive Quizzes',
    description: 'Test your knowledge with chapter quizzes and track your performance over time.',
    icon: '✍️',
    highlight: 'quizzes'
  },
  {
    title: 'Study Community',
    description: 'Join study groups, share resources, and connect with other students.',
    icon: '👥',
    highlight: 'community'
  }
];

export const TourStep = ({ onNext, onBack, onSkip }: TourStepProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(false);

  const handleStartTour = () => {
    setShowTour(true);
  };

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowTour(false);
      onNext();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTour = () => {
    setShowTour(false);
    onSkip();
  };

  if (showTour) {
    const step = tourSteps[currentStep];
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-between items-center">
              <Badge variant="secondary">
                {currentStep + 1} of {tourSteps.length}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkipTour}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-4xl mb-4">{step.icon}</div>
            <CardTitle className="text-xl">{step.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground text-center">
              {step.description}
            </p>

            <div className="flex justify-center space-x-2">
              {tourSteps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex-1"
              >
                Previous
              </Button>
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-serif text-primary">
            Discover EduFutura Features
          </CardTitle>
          <p className="text-muted-foreground">
            Quick overview of what you can do - takes less than 2 minutes
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step 4 of 4</span>
              <span>100% complete</span>
            </div>
            <Progress value={100} className="h-2" />
          </div>

          {/* Premium Preview */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-lg border">
            <h3 className="font-semibold text-lg mb-2">🚀 Unlock Premium Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Unlimited AI tutor questions (Free: 3/day)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Voice mode for AI assistant</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Private study buddy messaging</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Ad-free experience</span>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="font-semibold text-primary">
                Only R60/month or R600/year (Save R120!)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tourSteps.slice(0, 3).map((step, index) => (
              <div key={index} className="text-center space-y-2 p-4 border rounded-lg">
                <div className="text-2xl">{step.icon}</div>
                <h4 className="font-medium">{step.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {step.description}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={handleSkipTour}
              className="flex items-center gap-2 flex-1"
            >
              <SkipForward className="h-4 w-4" />
              Skip Tour
            </Button>
            <Button
              onClick={handleStartTour}
              className="flex items-center gap-2 flex-1"
            >
              <Play className="h-4 w-4" />
              Start Tour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};