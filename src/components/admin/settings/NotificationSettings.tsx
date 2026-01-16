import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Save,
  Send,
  Clock,
  AlertTriangle
} from 'lucide-react';

export function NotificationSettings() {
  const [defaults, setDefaults] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    frequency: 'realtime',
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    respectUnsubscribe: true,
  });

  const [templates, setTemplates] = useState([
    { id: 'quiz_reminder', name: 'Quiz Reminder', channels: ['email', 'push'], subject: 'Don\'t forget your quiz!' },
    { id: 'achievement', name: 'Achievement Earned', channels: ['email', 'push'], subject: 'Congratulations! New badge earned!' },
    { id: 'community_reply', name: 'Community Reply', channels: ['email'], subject: 'Someone replied to your post' },
    { id: 'deadline_alert', name: 'Deadline Alert', channels: ['email', 'sms', 'push'], subject: 'Quiz deadline approaching' },
  ]);

  const [rateLimits, setRateLimits] = useState({
    perUserDaily: 10,
    globalHourly: 5000,
    throttleEnabled: true,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Notification settings saved successfully');
    setSaving(false);
  };

  const handleTestNotification = (templateId: string) => {
    toast.success(`Test notification sent for ${templateId}`);
  };

  return (
    <div className="space-y-6">
      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Default Notification Settings
          </CardTitle>
          <CardDescription>Configure platform-wide notification defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Enabled Channels</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>Email</span>
                </div>
                <Switch
                  checked={defaults.emailEnabled}
                  onCheckedChange={(checked) => setDefaults({ ...defaults, emailEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span>SMS</span>
                </div>
                <Switch
                  checked={defaults.smsEnabled}
                  onCheckedChange={(checked) => setDefaults({ ...defaults, smsEnabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <span>Push</span>
                </div>
                <Switch
                  checked={defaults.pushEnabled}
                  onCheckedChange={(checked) => setDefaults({ ...defaults, pushEnabled: checked })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notification Frequency</Label>
            <Select
              value={defaults.frequency}
              onValueChange={(value) => setDefaults({ ...defaults, frequency: value })}
            >
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="hourly">Hourly Digest</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Quiet Hours
            </Label>
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={defaults.quietHoursStart}
                  onChange={(e) => setDefaults({ ...defaults, quietHoursStart: e.target.value })}
                  className="w-32"
                />
              </div>
              <span className="mt-6">to</span>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={defaults.quietHoursEnd}
                  onChange={(e) => setDefaults({ ...defaults, quietHoursEnd: e.target.value })}
                  className="w-32"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Non-urgent notifications will be held during quiet hours
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Respect Unsubscribe</p>
              <p className="text-sm text-muted-foreground">
                Never send to users who have opted out
              </p>
            </div>
            <Switch
              checked={defaults.respectUnsubscribe}
              onCheckedChange={(checked) => setDefaults({ ...defaults, respectUnsubscribe: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Templates</CardTitle>
          <CardDescription>Customize notification content for each type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {template.channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setEditingContent(`Dear {{student_name}},\n\n${template.subject}\n\nBest regards,\nEduFutura Team`);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestNotification(template.id)}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedTemplate && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  Editing: {templates.find(t => t.id === selectedTemplate)?.name}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTemplate(null)}
                >
                  Close
                </Button>
              </div>
              <Textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Available variables: {`{{student_name}}, {{quiz_title}}, {{deadline}}, {{badge_name}}`}
                </div>
                <Button size="sm">
                  Save Template
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Rate Limits
          </CardTitle>
          <CardDescription>Prevent notification spam and abuse</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Per User Daily Limit</Label>
              <Input
                type="number"
                value={rateLimits.perUserDaily}
                onChange={(e) => setRateLimits({ ...rateLimits, perUserDaily: parseInt(e.target.value) })}
                min={1}
                max={100}
              />
              <p className="text-xs text-muted-foreground">
                Maximum notifications per user per day
              </p>
            </div>
            <div className="space-y-2">
              <Label>Global Hourly Limit</Label>
              <Input
                type="number"
                value={rateLimits.globalHourly}
                onChange={(e) => setRateLimits({ ...rateLimits, globalHourly: parseInt(e.target.value) })}
                min={100}
                max={100000}
              />
              <p className="text-xs text-muted-foreground">
                Maximum platform notifications per hour
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Throttling</p>
              <p className="text-sm text-muted-foreground">
                Delay notifications during high volume to smooth delivery
              </p>
            </div>
            <Switch
              checked={rateLimits.throttleEnabled}
              onCheckedChange={(checked) => setRateLimits({ ...rateLimits, throttleEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
