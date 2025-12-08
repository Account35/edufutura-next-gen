import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Trophy, 
  BookOpen, 
  Users, 
  Flame,
  GraduationCap,
  Calendar,
  Moon
} from 'lucide-react';
import { useNotifications, NotificationPreference } from '@/hooks/useNotifications';
import { toast } from 'sonner';

interface NotificationType {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  defaultChannels: string[];
}

const notificationTypes: NotificationType[] = [
  {
    type: 'quiz_reminders',
    label: 'Quiz Reminders',
    description: 'Reminders for upcoming and scheduled quizzes',
    icon: <BookOpen className="h-5 w-5 text-blue-500" />,
    defaultChannels: ['in_app', 'email'],
  },
  {
    type: 'forum_replies',
    label: 'Forum Replies',
    description: 'When someone replies to your forum posts',
    icon: <MessageSquare className="h-5 w-5 text-green-500" />,
    defaultChannels: ['in_app'],
  },
  {
    type: 'group_messages',
    label: 'Group Messages',
    description: 'New messages in your study groups',
    icon: <Users className="h-5 w-5 text-purple-500" />,
    defaultChannels: ['in_app'],
  },
  {
    type: 'achievement_celebrations',
    label: 'Achievements',
    description: 'When you earn badges and achievements',
    icon: <Trophy className="h-5 w-5 text-yellow-500" />,
    defaultChannels: ['in_app', 'email'],
  },
  {
    type: 'study_streak',
    label: 'Study Streak',
    description: 'Reminders to maintain your study streak',
    icon: <Flame className="h-5 w-5 text-orange-500" />,
    defaultChannels: ['in_app'],
  },
  {
    type: 'buddy_requests',
    label: 'Study Buddy Requests',
    description: 'When someone wants to connect as a study buddy',
    icon: <Users className="h-5 w-5 text-indigo-500" />,
    defaultChannels: ['in_app', 'email'],
  },
  {
    type: 'career_deadlines',
    label: 'Career Deadlines',
    description: 'University application and career-related deadlines',
    icon: <GraduationCap className="h-5 w-5 text-red-500" />,
    defaultChannels: ['in_app', 'email', 'sms'],
  },
  {
    type: 'admin_announcements',
    label: 'Platform Announcements',
    description: 'Important updates from EduFutura',
    icon: <Bell className="h-5 w-5 text-primary" />,
    defaultChannels: ['in_app', 'email'],
  },
];

const channelOptions = [
  { id: 'in_app', label: 'In-App', icon: <Bell className="h-4 w-4" /> },
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { id: 'sms', label: 'SMS', icon: <Smartphone className="h-4 w-4" /> },
];

export const NotificationPreferences = () => {
  const { preferences, updatePreference } = useNotifications();
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const [digestFrequency, setDigestFrequency] = useState('real-time');

  const getPreference = (type: string): NotificationPreference | undefined => {
    return preferences.find(p => p.notification_type === type);
  };

  const isEnabled = (type: string): boolean => {
    const pref = getPreference(type);
    return pref?.enabled ?? true;
  };

  const getChannels = (type: string): string[] => {
    const pref = getPreference(type);
    const defaultType = notificationTypes.find(t => t.type === type);
    return pref?.channels ?? defaultType?.defaultChannels ?? ['in_app'];
  };

  const handleToggle = (type: string, enabled: boolean) => {
    updatePreference(type, { enabled });
  };

  const handleChannelToggle = (type: string, channel: string, enabled: boolean) => {
    const currentChannels = getChannels(type);
    const newChannels = enabled
      ? [...currentChannels, channel]
      : currentChannels.filter(c => c !== channel);
    
    // Ensure at least one channel is selected
    if (newChannels.length === 0) {
      toast.error('At least one notification channel must be selected');
      return;
    }

    updatePreference(type, { channels: newChannels });
  };

  const handleQuietHoursChange = () => {
    // Update all preferences with quiet hours
    notificationTypes.forEach(type => {
      updatePreference(type.type, {
        quiet_hours: {
          enabled: quietHoursEnabled,
          start: quietHoursStart,
          end: quietHoursEnd,
        },
      });
    });
  };

  const handleDigestFrequencyChange = (value: string) => {
    setDigestFrequency(value);
    // Update all preferences with digest frequency
    notificationTypes.forEach(type => {
      updatePreference(type.type, {
        digest_frequency: value as NotificationPreference['digest_frequency'],
      });
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive and how
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationTypes.map((type) => (
            <div key={type.type} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{type.icon}</div>
                  <div>
                    <Label className="text-base font-medium">{type.label}</Label>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                </div>
                <Switch
                  checked={isEnabled(type.type)}
                  onCheckedChange={(checked) => handleToggle(type.type, checked)}
                />
              </div>
              
              {isEnabled(type.type) && (
                <div className="ml-8 flex flex-wrap gap-4">
                  {channelOptions.map((channel) => (
                    <label
                      key={channel.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={getChannels(type.type).includes(channel.id)}
                        onCheckedChange={(checked) => 
                          handleChannelToggle(type.type, channel.id, checked as boolean)
                        }
                      />
                      <span className="flex items-center gap-1.5 text-sm">
                        {channel.icon}
                        {channel.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific hours (except urgent ones)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Enable Quiet Hours</Label>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
          </div>
          
          {quietHoursEnabled && (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={handleQuietHoursChange}
              >
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Digest
          </CardTitle>
          <CardDescription>
            Choose how often you want to receive email notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={digestFrequency} onValueChange={handleDigestFrequencyChange}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real-time">Real-time (instant)</SelectItem>
              <SelectItem value="hourly">Hourly digest</SelectItem>
              <SelectItem value="daily">Daily digest</SelectItem>
              <SelectItem value="weekly">Weekly digest</SelectItem>
              <SelectItem value="never">Never (in-app only)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">
            {digestFrequency === 'real-time' && 'You will receive emails immediately as notifications occur.'}
            {digestFrequency === 'hourly' && 'You will receive a summary email every hour if there are new notifications.'}
            {digestFrequency === 'daily' && 'You will receive a daily summary email at 8:00 AM.'}
            {digestFrequency === 'weekly' && 'You will receive a weekly summary email every Monday.'}
            {digestFrequency === 'never' && 'You will only see notifications within the app.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
