import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface CooldownTimerProps {
  nextAvailableTime: Date;
  onComplete?: () => void;
}

export const CooldownTimer = ({ nextAvailableTime, onComplete }: CooldownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = nextAvailableTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Available now!');
        onComplete?.();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [nextAvailableTime, onComplete]);

  return (
    <Card className="p-6 bg-accent/5 border-accent/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Clock className="h-6 w-6 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Next attempt available in
          </h3>
          <p className="text-3xl font-bold text-accent mb-3">
            {timeLeft}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            The 1-hour cooldown between attempts helps you review content and retain what you've learned.
          </p>
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">While you wait, try:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Review your incorrect answers and feedback</li>
              <li>• Study the chapter content again</li>
              <li>• Ask the AI Tutor about challenging topics</li>
              <li>• Take quizzes on other chapters</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};
