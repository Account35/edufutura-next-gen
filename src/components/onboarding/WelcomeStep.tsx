import { Button } from '@/components/ui/button';
import { CheckCircle, BookOpen, Users, Trophy } from 'lucide-react';

interface WelcomeStepProps {
  data: {
    full_name: string;
    grade_level: number | null;
    subjects_studying: string[];
  };
  onComplete: () => void;
  onPrev: () => void;
}

export function WelcomeStep({ data, onComplete }: WelcomeStepProps) {
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0] || 'Student';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Welcome to EduFutura, {getFirstName(data.full_name)}!</h2>
        <p className="text-muted-foreground">
          Your learning journey begins now. Here's what you can do next:
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg">
            <BookOpen className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Explore Your Subjects</h3>
              <p className="text-sm text-muted-foreground">
                Browse CAPS-aligned curriculum for Grade {data.grade_level} subjects
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg">
            <Trophy className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Take Quizzes</h3>
              <p className="text-sm text-muted-foreground">
                Test your knowledge and earn achievements
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-primary/5 rounded-lg">
            <Users className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium">Join Communities</h3>
              <p className="text-sm text-muted-foreground">
                Connect with other students and get help
              </p>
            </div>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Your Profile Summary:</h3>
          <ul className="text-sm space-y-1">
            <li><strong>Grade:</strong> {data.grade_level}</li>
            <li><strong>Subjects:</strong> {data.subjects_studying?.join(', ') || 'None selected'}</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => {}}>
          Previous
        </Button>
        <Button onClick={onComplete} className="bg-primary hover:bg-primary/90">
          Start Learning!
        </Button>
      </div>
    </div>
  );
}