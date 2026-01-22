import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight, Eye, Headphones, BookOpen, Hand, Clock, Target } from 'lucide-react';

interface PreferencesStepProps {
  onNext: (preferences: {
    learningStyle: string;
    studyPace: string;
    preferredStudyTimes: string[];
    studyGoals: string[];
    dailyGoalMinutes: number;
  }) => void;
  onBack: () => void;
  initialData?: {
    learningStyle?: string;
    studyPace?: string;
    preferredStudyTimes?: string[];
    studyGoals?: string[];
    dailyGoalMinutes?: number;
  };
}

const learningStyles = [
  {
    id: 'visual',
    name: 'Visual',
    icon: Eye,
    description: 'I learn best with diagrams, images, and videos'
  },
  {
    id: 'auditory',
    name: 'Auditory',
    icon: Headphones,
    description: 'I prefer listening and discussions'
  },
  {
    id: 'reading',
    name: 'Reading/Writing',
    icon: BookOpen,
    description: 'I like detailed notes and written explanations'
  },
  {
    id: 'kinesthetic',
    name: 'Kinesthetic',
    icon: Hand,
    description: 'I learn by doing and hands-on practice'
  }
];

const studyPaces = [
  {
    id: 'relaxed',
    name: 'Relaxed',
    description: 'I like to take my time - 30 minutes per day'
  },
  {
    id: 'moderate',
    name: 'Moderate',
    description: 'Balanced approach - 1 hour per day'
  },
  {
    id: 'intensive',
    name: 'Intensive',
    description: 'I\'m preparing for exams - 2+ hours per day'
  }
];

const studyTimes = [
  { id: 'morning', label: 'Morning (06:00-12:00)', time: '06:00-12:00' },
  { id: 'afternoon', label: 'Afternoon (12:00-18:00)', time: '12:00-18:00' },
  { id: 'evening', label: 'Evening (18:00-23:00)', time: '18:00-23:00' }
];

const studyGoals = [
  'Pass matric exams with 50%+ average',
  'Achieve distinctions scoring 80%+ in subjects',
  'Get into university meeting admission requirements',
  'Improve specific subject targeting weak areas',
  'Learn at my own pace no pressure'
];

export const PreferencesStep = ({ onNext, onBack, initialData }: PreferencesStepProps) => {
  const [learningStyle, setLearningStyle] = useState(initialData?.learningStyle || '');
  const [studyPace, setStudyPace] = useState(initialData?.studyPace || '');
  const [preferredStudyTimes, setPreferredStudyTimes] = useState<string[]>(initialData?.preferredStudyTimes || []);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialData?.studyGoals || []);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(initialData?.dailyGoalMinutes || 60);

  const toggleStudyTime = (timeId: string) => {
    setPreferredStudyTimes(prev =>
      prev.includes(timeId)
        ? prev.filter(t => t !== timeId)
        : [...prev, timeId]
    );
  };

  const toggleGoal = (goal: string) => {
    setSelectedGoals(prev =>
      prev.includes(goal)
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  const handleContinue = () => {
    if (!learningStyle || !studyPace) {
      alert('Please select your learning style and study pace.');
      return;
    }

    onNext({
      learningStyle,
      studyPace,
      preferredStudyTimes,
      studyGoals: selectedGoals,
      dailyGoalMinutes
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-serif text-primary">
            How Do You Learn Best?
          </CardTitle>
          <p className="text-muted-foreground">
            Help us personalize your experience with EduFutura
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step 3 of 4</span>
              <span>75% complete</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>

          {/* Learning Style */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Style
            </h3>
            <RadioGroup value={learningStyle} onValueChange={setLearningStyle}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningStyles.map((style) => {
                  const IconComponent = style.icon;
                  return (
                    <div key={style.id}>
                      <RadioGroupItem
                        value={style.id}
                        id={style.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={style.id}
                        className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5"
                      >
                        <IconComponent className="h-6 w-6 text-primary" />
                        <div>
                          <div className="font-medium">{style.name}</div>
                          <div className="text-sm text-muted-foreground">{style.description}</div>
                        </div>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Study Pace */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Study Pace</h3>
            <RadioGroup value={studyPace} onValueChange={setStudyPace}>
              <div className="space-y-3">
                {studyPaces.map((pace) => (
                  <div key={pace.id}>
                    <RadioGroupItem
                      value={pace.id}
                      id={pace.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={pace.id}
                      className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/5"
                    >
                      <div>
                        <div className="font-medium">{pace.name}</div>
                        <div className="text-sm text-muted-foreground">{pace.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Study Times */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" />
              When do you prefer to study? (Optional)
            </h3>
            <div className="space-y-3">
              {studyTimes.map((time) => (
                <div key={time.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={time.id}
                    checked={preferredStudyTimes.includes(time.id)}
                    onCheckedChange={() => toggleStudyTime(time.id)}
                  />
                  <Label htmlFor={time.id} className="text-sm">
                    {time.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Study Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">What are your study goals? (Optional)</h3>
            <div className="space-y-3">
              {studyGoals.map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={goal}
                    checked={selectedGoals.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  <Label htmlFor={goal} className="text-sm">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Study Goal */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Daily Study Goal</h3>
            <div className="space-y-4">
              <div className="px-2">
                <Slider
                  value={[dailyGoalMinutes]}
                  onValueChange={(value) => setDailyGoalMinutes(value[0])}
                  max={180}
                  min={15}
                  step={15}
                  className="w-full"
                />
              </div>
              <div className="text-center">
                <span className="text-2xl font-bold text-primary">{dailyGoalMinutes}</span>
                <span className="text-muted-foreground ml-2">minutes per day</span>
              </div>
            </div>
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
              onClick={handleContinue}
              disabled={!learningStyle || !studyPace}
              className="flex items-center gap-2 flex-1"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};