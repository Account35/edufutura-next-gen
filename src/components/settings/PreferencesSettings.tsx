import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface PreferencesSettingsProps {
  userId: string;
}

export const PreferencesSettings = ({ userId }: PreferencesSettingsProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    learning_style: 'visual',
    study_pace: 'moderate',
    preferred_study_time: 'afternoon',
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
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('study_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        });

      if (error) throw error;

      toast.success('Preferences saved successfully!');
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
        <CardTitle>Learning Preferences</CardTitle>
        <CardDescription>Customize your learning experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Learning Style */}
        <div className="space-y-2">
          <Label>Learning Style</Label>
          <Select
            value={preferences.learning_style}
            onValueChange={(value) => setPreferences({ ...preferences, learning_style: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visual">Visual (images, diagrams)</SelectItem>
              <SelectItem value="auditory">Auditory (listening, discussions)</SelectItem>
              <SelectItem value="kinesthetic">Kinesthetic (hands-on, practice)</SelectItem>
              <SelectItem value="reading_writing">Reading/Writing (notes, text)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Study Pace */}
        <div className="space-y-2">
          <Label>Study Pace</Label>
          <Select
            value={preferences.study_pace}
            onValueChange={(value) => setPreferences({ ...preferences, study_pace: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slow">Slow & Steady</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="fast">Fast-Paced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Preferred Study Time */}
        <div className="space-y-2">
          <Label>Preferred Study Time</Label>
          <Select
            value={preferences.preferred_study_time}
            onValueChange={(value) => setPreferences({ ...preferences, preferred_study_time: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning (6am - 12pm)</SelectItem>
              <SelectItem value="afternoon">Afternoon (12pm - 6pm)</SelectItem>
              <SelectItem value="evening">Evening (6pm - 10pm)</SelectItem>
              <SelectItem value="night">Night (10pm - 2am)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Daily Goal */}
        <div className="space-y-2">
          <Label htmlFor="dailyGoal">Daily Study Goal (minutes)</Label>
          <Input
            id="dailyGoal"
            type="number"
            min="15"
            max="240"
            value={preferences.daily_goal_minutes}
            onChange={(e) => setPreferences({ ...preferences, daily_goal_minutes: parseInt(e.target.value) })}
          />
        </div>

        {/* Weekly Goal */}
        <div className="space-y-2">
          <Label htmlFor="weeklyGoal">Weekly Study Goal (hours)</Label>
          <Input
            id="weeklyGoal"
            type="number"
            min="1"
            max="40"
            value={preferences.weekly_goal_hours}
            onChange={(e) => setPreferences({ ...preferences, weekly_goal_hours: parseInt(e.target.value) })}
          />
        </div>

        {/* Study Reminders */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Study Reminders</Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications to help you stay on track
            </p>
          </div>
          <Switch
            checked={preferences.study_reminders_enabled}
            onCheckedChange={(checked) => setPreferences({ ...preferences, study_reminders_enabled: checked })}
          />
        </div>

        {/* Save Button */}
        <Button onClick={handleSavePreferences} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
};