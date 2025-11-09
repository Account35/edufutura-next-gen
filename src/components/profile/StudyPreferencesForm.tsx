import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Loader2, Eye, Ear, Hand, FileText, Turtle, Gauge, Rabbit, Sun, Sunset, Moon, Stars } from 'lucide-react';

interface StudyPreferencesFormProps {
  userId: string;
}

const learningStyles = [
  { value: 'visual', label: 'Visual', description: 'Learn best with diagrams, charts, and images', icon: Eye },
  { value: 'auditory', label: 'Auditory', description: 'Learn best through listening and discussions', icon: Ear },
  { value: 'kinesthetic', label: 'Kinesthetic', description: 'Learn best through hands-on practice and physical activity', icon: Hand },
  { value: 'reading_writing', label: 'Reading/Writing', description: 'Learn best through notes and text', icon: FileText },
];

const studyPaces = [
  { value: 'slow', label: 'Slow & Steady', description: '20-30 minutes per day', icon: Turtle },
  { value: 'moderate', label: 'Moderate', description: '30-45 minutes per day', icon: Gauge },
  { value: 'fast', label: 'Fast-Paced', description: '60+ minutes per day', icon: Rabbit },
];

const studyTimes = [
  { value: 'morning', label: 'Morning', time: '6am - 12pm', icon: Sun },
  { value: 'afternoon', label: 'Afternoon', time: '12pm - 5pm', icon: Sunset },
  { value: 'evening', label: 'Evening', time: '5pm - 9pm', icon: Moon },
  { value: 'night', label: 'Night', time: '9pm - 12am', icon: Stars },
];

export const StudyPreferencesForm = ({ userId }: StudyPreferencesFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    learning_style: 'visual',
    study_pace: 'moderate',
    preferred_study_time: ['afternoon'],
    daily_goal_minutes: 30,
    weekly_goal_hours: 5,
    study_reminders_enabled: true,
  });

  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('study_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          ...data,
          preferred_study_time: Array.isArray(data.preferred_study_time) 
            ? data.preferred_study_time 
            : [data.preferred_study_time]
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleStudyTimeToggle = (time: string) => {
    const currentTimes = preferences.preferred_study_time;
    if (currentTimes.includes(time)) {
      setPreferences({
        ...preferences,
        preferred_study_time: currentTimes.filter(t => t !== time)
      });
    } else {
      setPreferences({
        ...preferences,
        preferred_study_time: [...currentTimes, time]
      });
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('study_preferences')
        .upsert([{
          user_id: userId,
          learning_style: preferences.learning_style,
          study_pace: preferences.study_pace,
          preferred_study_time: preferences.preferred_study_time[0] || 'afternoon',
          daily_goal_minutes: preferences.daily_goal_minutes,
          weekly_goal_hours: preferences.weekly_goal_hours,
          study_reminders_enabled: preferences.study_reminders_enabled,
        }]);

      if (error) throw error;

      toast.success('Study preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Study Preferences
        </CardTitle>
        <CardDescription>Customize your learning experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Learning Style */}
        <div className="space-y-3">
          <Label className="text-primary font-medium">Learning Style</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {learningStyles.map((style) => {
              const Icon = style.icon;
              return (
                <button
                  key={style.value}
                  onClick={() => setPreferences({ ...preferences, learning_style: style.value })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    preferences.learning_style === style.value
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      preferences.learning_style === style.value
                        ? 'bg-secondary/20'
                        : 'bg-muted'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{style.label}</p>
                      <p className="text-sm text-muted-foreground">{style.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Study Pace */}
        <div className="space-y-3">
          <Label className="text-primary font-medium">Study Pace</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {studyPaces.map((pace) => {
              const Icon = pace.icon;
              return (
                <button
                  key={pace.value}
                  onClick={() => setPreferences({ ...preferences, study_pace: pace.value })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    preferences.study_pace === pace.value
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${
                    preferences.study_pace === pace.value ? 'text-secondary' : 'text-muted-foreground'
                  }`} />
                  <p className="font-semibold">{pace.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{pace.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Study Time */}
        <div className="space-y-3">
          <Label className="text-primary font-medium">Preferred Study Time (select all that apply)</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {studyTimes.map((time) => {
              const Icon = time.icon;
              const isSelected = preferences.preferred_study_time.includes(time.value);
              return (
                <button
                  key={time.value}
                  onClick={() => handleStudyTimeToggle(time.value)}
                  className={`p-3 border-2 rounded-lg text-center transition-all ${
                    isSelected
                      ? 'border-secondary bg-secondary/10'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Icon className={`h-5 w-5 mx-auto mb-1 ${
                    isSelected ? 'text-secondary' : 'text-muted-foreground'
                  }`} />
                  <p className="font-semibold text-sm">{time.label}</p>
                  <p className="text-xs text-muted-foreground">{time.time}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Study Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dailyGoal">Daily Goal (minutes)</Label>
            <Input
              id="dailyGoal"
              type="number"
              min="15"
              max="180"
              step="15"
              value={preferences.daily_goal_minutes}
              onChange={(e) => setPreferences({ ...preferences, daily_goal_minutes: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Daily goal: {preferences.daily_goal_minutes} minutes</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeklyGoal">Weekly Goal (hours)</Label>
            <Input
              id="weeklyGoal"
              type="number"
              min="2"
              max="20"
              step="1"
              value={preferences.weekly_goal_hours}
              onChange={(e) => setPreferences({ ...preferences, weekly_goal_hours: parseInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Weekly goal: {preferences.weekly_goal_hours} hours</p>
          </div>
        </div>

        {/* Study Reminders */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Study Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications to help you stay on track
            </p>
          </div>
          <Switch
            checked={preferences.study_reminders_enabled}
            onCheckedChange={(checked) => setPreferences({ ...preferences, study_reminders_enabled: checked })}
          />
        </div>

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};
