import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Globe, Palette, Upload, AlertTriangle, Save, ExternalLink } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

export function GeneralSettings() {
  const { maintenanceMode, maintenanceMessage, branding, updateSettings, updateBranding } = usePlatformSettings();

  const [localSettings, setLocalSettings] = useState({
    siteName: 'EduFutura',
    siteUrl: 'https://edufutura.co.za',
    defaultLanguage: 'en',
    timezone: 'Africa/Johannesburg',
    maintenanceMode,
    maintenanceMessage,
    contactEmail: 'support@edufutura.co.za',
    termsUrl: '/terms',
    privacyUrl: '/privacy',
  });

  const [localBranding, setLocalBranding] = useState({ ...branding });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateSettings({
      maintenanceMode: localSettings.maintenanceMode,
      maintenanceMessage: localSettings.maintenanceMessage,
    });
    updateBranding(localBranding);
    toast.success('General settings saved successfully');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Platform Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Platform Information
          </CardTitle>
          <CardDescription>Basic platform configuration and identity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={localSettings.siteName}
                onChange={(e) => setLocalSettings({ ...localSettings, siteName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <div className="flex gap-2">
                <Input
                  id="siteUrl"
                  value={localSettings.siteUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, siteUrl: e.target.value })}
                />
                <Button variant="outline" size="icon" asChild>
                  <a href={localSettings.siteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Default Language</Label>
              <Select
                value={localSettings.defaultLanguage}
                onValueChange={(value) => setLocalSettings({ ...localSettings, defaultLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="af">Afrikaans</SelectItem>
                  <SelectItem value="zu">Zulu</SelectItem>
                  <SelectItem value="xh">Xhosa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={localSettings.timezone}
                onValueChange={(value) => setLocalSettings({ ...localSettings, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST)</SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={localSettings.contactEmail}
              onChange={(e) => setLocalSettings({ ...localSettings, contactEmail: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termsUrl">Terms & Conditions URL</Label>
              <Input
                id="termsUrl"
                value={localSettings.termsUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, termsUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
              <Input
                id="privacyUrl"
                value={localSettings.privacyUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, privacyUrl: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className={localSettings.maintenanceMode ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${localSettings.maintenanceMode ? 'text-destructive' : ''}`} />
            Maintenance Mode
            {localSettings.maintenanceMode && <Badge variant="destructive">Active</Badge>}
          </CardTitle>
          <CardDescription>
            When enabled, existing users cannot log in but new users can still register. Registered users without dashboard access will see the maintenance message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Blocks login for existing users — new registrations still allowed
              </p>
            </div>
            <Switch
              checked={localSettings.maintenanceMode}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, maintenanceMode: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
            <Textarea
              id="maintenanceMessage"
              value={localSettings.maintenanceMessage}
              onChange={(e) => setLocalSettings({ ...localSettings, maintenanceMessage: e.target.value })}
              rows={3}
              placeholder="Message shown to users when they try to log in..."
            />
            <p className="text-xs text-muted-foreground">
              This message is shown on the login form when maintenance mode is active.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding
          </CardTitle>
          <CardDescription>Customize platform colors — changes apply across the entire student-facing app after saving</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color (Forest Green)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localBranding.primaryColor}
                  onChange={(e) => setLocalBranding({ ...localBranding, primaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localBranding.primaryColor}
                  onChange={(e) => setLocalBranding({ ...localBranding, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color (Gold)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localBranding.secondaryColor}
                  onChange={(e) => setLocalBranding({ ...localBranding, secondaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localBranding.secondaryColor}
                  onChange={(e) => setLocalBranding({ ...localBranding, secondaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color (Burgundy)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={localBranding.accentColor}
                  onChange={(e) => setLocalBranding({ ...localBranding, accentColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={localBranding.accentColor}
                  onChange={(e) => setLocalBranding({ ...localBranding, accentColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Logo Images</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Header Logo', hint: 'PNG, max 2MB' },
                { label: 'Favicon', hint: 'ICO or PNG, 32x32' },
                { label: 'Email Logo', hint: 'PNG, 200x50 recommended' },
              ].map(({ label, hint }) => (
                <div key={label} className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                  <Button variant="outline" size="sm" className="mt-2">Upload</Button>
                </div>
              ))}
            </div>
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
