import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Shield, 
  Bell, 
  Link2, 
  ToggleLeft,
  Lock,
  Database
} from 'lucide-react';
import { GeneralSettings } from '@/components/admin/settings/GeneralSettings';
import { AuthenticationSettings } from '@/components/admin/settings/AuthenticationSettings';
import { FeatureFlagsSettings } from '@/components/admin/settings/FeatureFlagsSettings';
import { IntegrationSettings } from '@/components/admin/settings/IntegrationSettings';
import { NotificationSettings } from '@/components/admin/settings/NotificationSettings';
import { SecuritySettings } from '@/components/admin/settings/SecuritySettings';
import { BackupSettings } from '@/components/admin/settings/BackupSettings';

const settingsTabs = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'authentication', label: 'Authentication', icon: Lock },
  { id: 'features', label: 'Features', icon: ToggleLeft },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'backup', label: 'Backup', icon: Database },
];

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <AdminLayout title="System Settings" subtitle="Configure platform settings and preferences">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Desktop Tabs */}
        <div className="hidden lg:block">
          <TabsList className="grid grid-cols-7 w-full">
            {settingsTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <tab.icon className="w-4 h-4" />
                <span className="hidden xl:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Mobile Tabs - Scrollable */}
        <div className="lg:hidden overflow-x-auto">
          <TabsList className="inline-flex w-max">
            {settingsTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2 px-4">
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>

        <TabsContent value="authentication">
          <AuthenticationSettings />
        </TabsContent>

        <TabsContent value="features">
          <FeatureFlagsSettings />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="backup">
          <BackupSettings />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
