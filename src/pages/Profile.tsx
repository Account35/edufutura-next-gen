import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BasicInfoSection } from '@/components/profile/BasicInfoSection';
import { AcademicInfoSection } from '@/components/profile/AcademicInfoSection';
import { AccountSettingsSection } from '@/components/profile/AccountSettingsSection';
import { SubscriptionManagement } from '@/components/profile/SubscriptionManagement';
import { ReputationDisplay } from '@/components/profile/ReputationDisplay';
import { CommunityStatsSection } from '@/components/profile/CommunityStatsSection';
import { FullPageLoader } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart3, ArrowRight, Award } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userProfile, loading: isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'basic');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

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

        {/* Community Stats */}
        <CommunityStatsSection userId={user!.id} />

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setSearchParams({ tab: value });
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
            <TabsTrigger value="basic" className="min-h-[44px]">Basic Info</TabsTrigger>
            <TabsTrigger value="academic" className="min-h-[44px]">Academic Info</TabsTrigger>
            <TabsTrigger value="account" className="min-h-[44px]">Account Settings</TabsTrigger>
            <TabsTrigger value="subscription" className="min-h-[44px]">Subscription</TabsTrigger>
            <TabsTrigger value="reputation" className="min-h-[44px]">Reputation</TabsTrigger>
            <TabsTrigger value="analytics" className="min-h-[44px]">Analytics</TabsTrigger>
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

          <TabsContent value="reputation">
            <ReputationDisplay userId={user!.id} />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-8 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Performance Analytics</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  View comprehensive analytics, track your progress, identify knowledge gaps, and export detailed reports.
                </p>
                <Link to="/analytics">
                  <Button size="lg">
                    View Full Analytics
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </Card>

              <Card className="p-8 text-center">
                <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="h-10 w-10 text-secondary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Certificates & Achievements</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  See all your official certificates in one place, download them, and share your achievements.
                </p>
                <Link to="/profile/certificates">
                  <Button size="lg" variant="outline">
                    View Certificates
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
