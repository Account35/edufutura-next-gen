import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { FullPageLoader } from '@/components/ui/loading';

export default function Settings() {
  const navigate = useNavigate();
  const { user, userProfile, loading: isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !userProfile) {
    return <FullPageLoader message="Loading settings..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="min-h-[44px]">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="min-h-[44px]">Preferences</TabsTrigger>
            <TabsTrigger value="subscription" className="min-h-[44px]">Subscription</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="preferences">
            <PreferencesSettings userId={user!.id} />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionSettings userId={user!.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}