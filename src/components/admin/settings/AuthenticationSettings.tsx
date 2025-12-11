import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Key, 
  Clock, 
  Save,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function AuthenticationSettings() {
  const [registration, setRegistration] = useState({
    allowRegistration: true,
    emailVerification: true,
    phoneVerification: false,
    socialLogin: true,
    minimumAge: 13,
  });

  const [passwordPolicy, setPasswordPolicy] = useState({
    minimumLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordHistory: 5,
    passwordExpiryDays: 90,
    lockoutThreshold: 5,
    lockoutDuration: 30,
  });

  const [sessionSettings, setSessionSettings] = useState({
    sessionTimeout: 30,
    absoluteTimeout: 7,
    rememberMe: true,
    concurrentSessions: 3,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Authentication settings saved successfully');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Registration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Registration Settings
          </CardTitle>
          <CardDescription>Control how users can register for the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Allow New Registrations</p>
                <p className="text-sm text-muted-foreground">Enable or disable new user signups</p>
              </div>
              <Switch
                checked={registration.allowRegistration}
                onCheckedChange={(checked) => setRegistration({ ...registration, allowRegistration: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Verification Required</p>
                <p className="text-sm text-muted-foreground">Users must verify email before accessing platform</p>
              </div>
              <Switch
                checked={registration.emailVerification}
                onCheckedChange={(checked) => setRegistration({ ...registration, emailVerification: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Phone Verification</p>
                <p className="text-sm text-muted-foreground">Add SMS verification step during registration</p>
              </div>
              <Switch
                checked={registration.phoneVerification}
                onCheckedChange={(checked) => setRegistration({ ...registration, phoneVerification: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Social Login (Google)</p>
                <p className="text-sm text-muted-foreground">Allow users to sign in with Google</p>
              </div>
              <Switch
                checked={registration.socialLogin}
                onCheckedChange={(checked) => setRegistration({ ...registration, socialLogin: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Age (COPPA Compliance)</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[registration.minimumAge]}
                  onValueChange={([value]) => setRegistration({ ...registration, minimumAge: value })}
                  min={10}
                  max={18}
                  step={1}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium">{registration.minimumAge}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Users younger than {registration.minimumAge} years will be blocked from registration
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Password Policy
          </CardTitle>
          <CardDescription>Configure password strength and security requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Minimum Password Length</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[passwordPolicy.minimumLength]}
                onValueChange={([value]) => setPasswordPolicy({ ...passwordPolicy, minimumLength: value })}
                min={8}
                max={24}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-medium">{passwordPolicy.minimumLength}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Password Complexity Requirements</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'requireUppercase', label: 'Uppercase letters (A-Z)' },
                { key: 'requireLowercase', label: 'Lowercase letters (a-z)' },
                { key: 'requireNumbers', label: 'Numbers (0-9)' },
                { key: 'requireSpecialChars', label: 'Special characters (!@#$)' },
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-2">
                  {passwordPolicy[item.key as keyof typeof passwordPolicy] ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">{item.label}</span>
                  <Switch
                    checked={passwordPolicy[item.key as keyof typeof passwordPolicy] as boolean}
                    onCheckedChange={(checked) => 
                      setPasswordPolicy({ ...passwordPolicy, [item.key]: checked })
                    }
                    className="ml-auto"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Password History</Label>
              <Input
                type="number"
                value={passwordPolicy.passwordHistory}
                onChange={(e) => setPasswordPolicy({ ...passwordPolicy, passwordHistory: parseInt(e.target.value) })}
                min={0}
                max={24}
              />
              <p className="text-xs text-muted-foreground">
                Prevent reuse of last {passwordPolicy.passwordHistory} passwords
              </p>
            </div>
            <div className="space-y-2">
              <Label>Password Expiry (days)</Label>
              <Input
                type="number"
                value={passwordPolicy.passwordExpiryDays}
                onChange={(e) => setPasswordPolicy({ ...passwordPolicy, passwordExpiryDays: parseInt(e.target.value) })}
                min={0}
                max={365}
              />
              <p className="text-xs text-muted-foreground">
                0 = passwords never expire
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lockout Threshold</Label>
              <Input
                type="number"
                value={passwordPolicy.lockoutThreshold}
                onChange={(e) => setPasswordPolicy({ ...passwordPolicy, lockoutThreshold: parseInt(e.target.value) })}
                min={3}
                max={10}
              />
              <p className="text-xs text-muted-foreground">
                Lock account after {passwordPolicy.lockoutThreshold} failed attempts
              </p>
            </div>
            <div className="space-y-2">
              <Label>Lockout Duration (minutes)</Label>
              <Input
                type="number"
                value={passwordPolicy.lockoutDuration}
                onChange={(e) => setPasswordPolicy({ ...passwordPolicy, lockoutDuration: parseInt(e.target.value) })}
                min={5}
                max={1440}
              />
              <p className="text-xs text-muted-foreground">
                Account unlocks after {passwordPolicy.lockoutDuration} minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Session Settings
          </CardTitle>
          <CardDescription>Configure user session behavior and timeouts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Idle Timeout (minutes)</Label>
              <Input
                type="number"
                value={sessionSettings.sessionTimeout}
                onChange={(e) => setSessionSettings({ ...sessionSettings, sessionTimeout: parseInt(e.target.value) })}
                min={5}
                max={480}
              />
              <p className="text-xs text-muted-foreground">
                Auto logout after {sessionSettings.sessionTimeout} minutes of inactivity
              </p>
            </div>
            <div className="space-y-2">
              <Label>Absolute Timeout (days)</Label>
              <Input
                type="number"
                value={sessionSettings.absoluteTimeout}
                onChange={(e) => setSessionSettings({ ...sessionSettings, absoluteTimeout: parseInt(e.target.value) })}
                min={1}
                max={30}
              />
              <p className="text-xs text-muted-foreground">
                Maximum session length: {sessionSettings.absoluteTimeout} days
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Remember Me Option</p>
              <p className="text-sm text-muted-foreground">Allow users to extend session duration</p>
            </div>
            <Switch
              checked={sessionSettings.rememberMe}
              onCheckedChange={(checked) => setSessionSettings({ ...sessionSettings, rememberMe: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Concurrent Sessions Limit</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[sessionSettings.concurrentSessions]}
                onValueChange={([value]) => setSessionSettings({ ...sessionSettings, concurrentSessions: value })}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <span className="w-12 text-center font-medium">{sessionSettings.concurrentSessions}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum devices per user account
            </p>
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
