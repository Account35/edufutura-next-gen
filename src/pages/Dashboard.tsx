import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { SubjectGrid } from '@/components/dashboard/SubjectGrid';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AchievementDisplay } from '@/components/dashboard/AchievementDisplay';
import { CommunityActivityWidget } from '@/components/community/CommunityActivityWidget';
import { UpgradeBanner } from '@/components/subscription/UpgradeBanner';
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal';
import { FullPageLoader } from '@/components/ui/loading';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, userProfile, loading: authLoading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    subjects: [],
    activities: [],
    achievements: [],
  });

  const [schoolData, setSchoolData] = useState<{ school_name?: string; province?: string }>({});
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/');
      return;
    }

    if (user && userProfile && !userProfile.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    // Redirect admins/educators to admin dashboard
    if (!roleLoading && (isAdmin || isEducator)) {
      navigate('/admin');
      return;
    }

    if (user) {
      loadDashboardData();
      loadSchoolData();
      updateLastDashboardVisit();
    }
  }, [user, userProfile, authLoading, roleLoading, isAdmin, isEducator, navigate]);

  const loadDashboardData = async () => {
    try {
      // Load user progress (subjects)
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user!.id)
        .order('last_accessed', { ascending: false });

      if (progressError) throw progressError;

      // Calculate overall progress
      if (progressData && progressData.length > 0) {
        const avgProgress = progressData.reduce((sum, item) => 
          sum + (Number(item.progress_percentage) || 0), 0
        ) / progressData.length;
        setOverallProgress(avgProgress);
      }

      // Load recent activities
      const { data: activityData, error: activityError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', user!.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (activityError) throw activityError;

      // Load achievements
      const { data: achievementData, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user!.id)
        .order('earned_at', { ascending: false })
        .limit(10);

      if (achievementError) throw achievementError;

      setDashboardData({
        subjects: progressData || [],
        activities: activityData || [],
        achievements: achievementData || [],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
  };

  const loadSchoolData = async () => {
    if (!userProfile?.school_id) return;
    
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('school_name, province')
        .eq('id', userProfile.school_id)
        .single();

      if (error) throw error;
      if (data) {
        setSchoolData(data);
      }
    } catch (error) {
      console.error('Error loading school data:', error);
    }
  };

  const updateLastDashboardVisit = async () => {
    try {
      await supabase
        .from('users')
        .update({ last_dashboard_visit: new Date().toISOString() })
        .eq('id', user!.id);
    } catch (error) {
      console.error('Error updating last visit:', error);
    }
  };

  if (authLoading || subLoading || !userProfile) {
    return <FullPageLoader message="Loading your dashboard..." />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        {/* Welcome Banner */}
        <WelcomeBanner
          userName={userProfile.full_name}
          gradeLevel={userProfile.grade_level}
          schoolName={schoolData.school_name}
          province={schoolData.province}
          profilePicture={userProfile.profile_picture_url}
          isPremium={isPremium}
          totalStudyHours={userProfile.total_study_hours || 0}
          studyStreakDays={userProfile.study_streak_days || 0}
          overallProgress={overallProgress}
          onUpgradeClick={() => setShowUpgradeModal(true)}
        />

        {/* Upgrade Banner for Free Users */}
        {!isPremium && (
          <UpgradeBanner onUpgrade={() => setShowUpgradeModal(true)} />
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subject Cards - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <SubjectGrid 
              subjects={dashboardData.subjects}
              isPremium={isPremium}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </div>

          {/* Sidebar - Takes 1 column on large screens */}
          <div className="space-y-6">
            {/* Community Activity Widget */}
            <CommunityActivityWidget />

            {/* Recent Achievements */}
            <AchievementDisplay achievements={dashboardData.achievements} />

            {/* Recent Activity */}
            <ActivityFeed activities={dashboardData.activities} />
          </div>
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </DashboardLayout>
  );
}