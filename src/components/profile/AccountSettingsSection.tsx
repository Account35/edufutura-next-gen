import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Settings, Globe, Bell, Shield, Loader2 } from 'lucide-react';

interface AccountSettingsSectionProps {
  userProfile: any;
  userId: string;
}

export const AccountSettingsSection = ({ userProfile, userId }: AccountSettingsSectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    platform_language: userProfile.platform_language || 'en',
    comm_study_tips: userProfile.comm_study_tips ?? true,
    comm_content_updates: userProfile.comm_content_updates ?? true,
    comm_assessment_reminders: userProfile.comm_assessment_reminders ?? true,
    comm_progress_reports: userProfile.comm_progress_reports ?? true,
  });

  const handleSave = async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('users')
        .update(settings)
        .eq('id', userId);

      if (error) throw error;

      toast.success('Account settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Preference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Preference
          </CardTitle>
          <CardDescription>Choose your preferred platform language</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setSettings({ ...settings, platform_language: 'en' })}
              className={`p-4 border-2 rounded-lg transition-all ${
                settings.platform_language === 'en'
                  ? 'border-secondary bg-secondary/10'
                  : 'border-border hover:border-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🇬🇧</span>
                <div className="text-left">
                  <p className="font-semibold">English</p>
                  <p className="text-sm text-muted-foreground">Platform language</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSettings({ ...settings, platform_language: 'af' })}
              className={`p-4 border-2 rounded-lg transition-all ${
                settings.platform_language === 'af'
                  ? 'border-secondary bg-secondary/10'
                  : 'border-border hover:border-primary'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🇿🇦</span>
                <div className="text-left">
                  <p className="font-semibold">Afrikaans</p>
                  <p className="text-sm text-muted-foreground">Platformtaal</p>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose which notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-base">Study Tips & Motivation</Label>
              <p className="text-sm text-muted-foreground">
                Receive helpful study tips and motivational messages
              </p>
            </div>
            <Switch
              checked={settings.comm_study_tips}
              onCheckedChange={(checked) => setSettings({ ...settings, comm_study_tips: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-base">New Content Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified when new curriculum content is added
              </p>
            </div>
            <Switch
              checked={settings.comm_content_updates}
              onCheckedChange={(checked) => setSettings({ ...settings, comm_content_updates: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-base">Assessment Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Reminders for upcoming assessments and quizzes
              </p>
            </div>
            <Switch
              checked={settings.comm_assessment_reminders}
              onCheckedChange={(checked) => setSettings({ ...settings, comm_assessment_reminders: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label className="text-base">Weekly Progress Reports</Label>
              <p className="text-sm text-muted-foreground">
                Receive weekly summaries of your learning progress
              </p>
            </div>
            <Switch
              checked={settings.comm_progress_reports}
              onCheckedChange={(checked) => setSettings({ ...settings, comm_progress_reports: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>Control your data and profile visibility</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Privacy settings will be available in future updates when community features are enabled.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isLoading} className="w-full lg:w-auto">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
};
