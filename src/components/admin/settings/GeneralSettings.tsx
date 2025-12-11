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
import { 
  Globe, 
  Palette, 
  Upload, 
  AlertTriangle,
  Save,
  ExternalLink
} from 'lucide-react';

export function GeneralSettings() {
  const [settings, setSettings] = useState({
    siteName: 'EduFutura',
    siteUrl: 'https://edufutura.co.za',
    defaultLanguage: 'en',
    timezone: 'Africa/Johannesburg',
    maintenanceMode: false,
    maintenanceMessage: 'We are currently performing scheduled maintenance. Please check back soon.',
    contactEmail: 'support@edufutura.co.za',
    termsUrl: '/terms',
    privacyUrl: '/privacy',
  });

  const [branding, setBranding] = useState({
    primaryColor: '#1B4332',
    secondaryColor: '#D4AF37',
    accentColor: '#800020',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
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
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <div className="flex gap-2">
                <Input
                  id="siteUrl"
                  value={settings.siteUrl}
                  onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                />
                <Button variant="outline" size="icon" asChild>
                  <a href={settings.siteUrl} target="_blank" rel="noopener noreferrer">
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
                value={settings.defaultLanguage}
                onValueChange={(value) => setSettings({ ...settings, defaultLanguage: value })}
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
                value={settings.timezone}
                onValueChange={(value) => setSettings({ ...settings, timezone: value })}
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
              value={settings.contactEmail}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="termsUrl">Terms & Conditions URL</Label>
              <Input
                id="termsUrl"
                value={settings.termsUrl}
                onChange={(e) => setSettings({ ...settings, termsUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
              <Input
                id="privacyUrl"
                value={settings.privacyUrl}
                onChange={(e) => setSettings({ ...settings, privacyUrl: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Mode */}
      <Card className={settings.maintenanceMode ? 'border-destructive' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${settings.maintenanceMode ? 'text-destructive' : ''}`} />
            Maintenance Mode
            {settings.maintenanceMode && (
              <Badge variant="destructive">Active</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Enable maintenance mode to temporarily disable access for updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">
                Users will see a maintenance page when enabled
              </p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>

          {settings.maintenanceMode && (
            <div className="space-y-2">
              <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
              <Textarea
                id="maintenanceMessage"
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Branding
          </CardTitle>
          <CardDescription>Customize platform appearance and logos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Primary Color (Forest Green)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Secondary Color (Gold)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.secondaryColor}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Accent Color (Burgundy)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.accentColor}
                  onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Logo Images</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Header Logo</p>
                <p className="text-xs text-muted-foreground">PNG, max 2MB</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload
                </Button>
              </div>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Favicon</p>
                <p className="text-xs text-muted-foreground">ICO or PNG, 32x32</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload
                </Button>
              </div>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Email Logo</p>
                <p className="text-xs text-muted-foreground">PNG, 200x50 recommended</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Upload
                </Button>
              </div>
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
