import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PreferencesSettings } from '@/components/settings/PreferencesSettings';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { PrivacyDataSection } from '@/components/settings/PrivacyDataSection';
import { FullPageLoader } from '@/components/ui/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, FileText, Shield } from 'lucide-react';
import { toast } from 'sonner';

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="min-h-[44px]">Profile</TabsTrigger>
            <TabsTrigger value="preferences" className="min-h-[44px]">Preferences</TabsTrigger>
            <TabsTrigger value="subscription" className="min-h-[44px]">Subscription</TabsTrigger>
            <TabsTrigger value="more" className="min-h-[44px]">More</TabsTrigger>
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

          <TabsContent value="more">
            <div className="space-y-4">
              {/* POPIA Compliance - Data Export & Deletion */}
              <PrivacyDataSection />

              <Card>
                <CardHeader>
                  <CardTitle>Help & Support</CardTitle>
                  <CardDescription>Get assistance and answers to your questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => toast.info('Help center coming soon')}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Visit Help Center
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Legal & Privacy</CardTitle>
                  <CardDescription>Review our terms and policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => toast.info('Terms coming soon')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Terms & Conditions
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => toast.info('Privacy policy coming soon')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Privacy Policy
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}