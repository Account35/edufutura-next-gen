import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfoSection } from '@/components/profile/BasicInfoSection';
import { AcademicInfoSection } from '@/components/profile/AcademicInfoSection';
import { AccountSettingsSection } from '@/components/profile/AccountSettingsSection';
import { SubscriptionManagement } from '@/components/profile/SubscriptionManagement';
import { FullPageLoader } from '@/components/ui/loading';

export default function Profile() {
  const navigate = useNavigate();
  const { user, userProfile, loading: isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  if (isLoading || !userProfile) {
    return <FullPageLoader message="Loading profile..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information, academic settings, and preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="basic" className="min-h-[44px]">Basic Info</TabsTrigger>
            <TabsTrigger value="academic" className="min-h-[44px]">Academic Info</TabsTrigger>
            <TabsTrigger value="account" className="min-h-[44px]">Account Settings</TabsTrigger>
            <TabsTrigger value="subscription" className="min-h-[44px]">Subscription</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoSection userProfile={userProfile} />
          </TabsContent>

          <TabsContent value="academic">
            <AcademicInfoSection userProfile={userProfile} userId={user!.id} />
          </TabsContent>

          <TabsContent value="account">
            <AccountSettingsSection userProfile={userProfile} userId={user!.id} />
          </TabsContent>

          <TabsContent value="subscription">
            <SubscriptionManagement userId={user!.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
