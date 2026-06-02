 import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { OnboardingDashboardCard } from '@/components/onboarding';
import { toast } from 'sonner';

const normalizeSubjectName = (subjectName?: string | null) =>
  (subjectName || '').trim().toLowerCase();

const getPercent = (completed: number, total: number, fallback = 0) => {
  if (total <= 0) return fallback;
  return Math.min(100, Math.round((completed / total) * 100));
};

export default function Dashboard() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { isPremium, isLoading: subLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    subjects: [],
    activities: [],
    achievements: [],
  });

  const [schoolData, setSchoolData] = useState<{ school_name?: string; province?: string }>({});
  const [overallProgress, setOverallProgress] = useState(0);

   // Load dashboard data when user is available
   useEffect(() => {
    if (user) {
      loadDashboardData();
      loadSchoolData();
      updateLastDashboardVisit();
    }
   }, [user]);

   const loadDashboardData = useCallback(async () => {
     if (!user) return;
    try {
      // Load user progress (subjects)
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user!.id)
        .order('last_accessed', { ascending: false });

      if (progressError) throw progressError;

     // Auto-include any published subjects matching the student's grade
     // so newly published admin subjects appear immediately for existing users.
     let mergedSubjects: any[] = [];
     const studentGrade = (userProfile as any)?.grade_level;
     const progressSubjectNames = Array.from(
       new Set((progressData || []).map((p: any) => (p.subject_name || '').trim()).filter(Boolean))
     );
     let curriculumSubjects: any[] = [];

     if (progressSubjectNames.length > 0) {
       const { data: progressSubjects } = await supabase
         .from('curriculum_subjects')
         .select('id, subject_name, total_chapters, grade_level, thumbnail_url')
         .in('subject_name', progressSubjectNames);

       curriculumSubjects = [...curriculumSubjects, ...(progressSubjects || [])];
     }

     if (studentGrade) {
       const { data: publishedSubjects } = await supabase
         .from('curriculum_subjects')
         .select('id, subject_name, total_chapters, grade_level, thumbnail_url')
         .eq('is_published', true)
         .eq('grade_level', studentGrade);

       curriculumSubjects = [...curriculumSubjects, ...(publishedSubjects || [])];
     }

     const subjectsByName = curriculumSubjects.reduce<Record<string, any>>((acc, subject) => {
       const key = normalizeSubjectName(subject.subject_name);
       if (key && !acc[key]) acc[key] = subject;
       return acc;
     }, {});

     const progressByName = (progressData || []).reduce<Record<string, any>>((acc, progress) => {
       const key = normalizeSubjectName(progress.subject_name);
       if (key) acc[key] = progress;
       return acc;
     }, {});

     const subjectIds = Object.values(subjectsByName)
       .map((subject: any) => subject.id)
       .filter(Boolean);

     let chapterCountsBySubjectId: Record<string, number> = {};
     let completedCountsBySubjectId: Record<string, number> = {};

     if (subjectIds.length > 0) {
       const { data: chaptersData } = await supabase
         .from('curriculum_chapters')
         .select('id, subject_id')
         .in('subject_id', subjectIds)
         .eq('is_published', true);

       const chapters = chaptersData || [];
       chapterCountsBySubjectId = chapters.reduce<Record<string, number>>((acc, chapter: any) => {
         if (chapter.subject_id) {
           acc[chapter.subject_id] = (acc[chapter.subject_id] || 0) + 1;
         }
         return acc;
       }, {});

       const chapterIds = chapters.map((chapter: any) => chapter.id).filter(Boolean);
       if (chapterIds.length > 0) {
         const { data: chapterProgressData } = await supabase
           .from('user_chapter_progress')
           .select('chapter_id, status')
           .eq('user_id', user!.id)
           .in('chapter_id', chapterIds);

         const chapterSubjectMap = chapters.reduce<Record<string, string>>((acc, chapter: any) => {
           if (chapter.id && chapter.subject_id) acc[chapter.id] = chapter.subject_id;
           return acc;
         }, {});

         completedCountsBySubjectId = (chapterProgressData || []).reduce<Record<string, number>>((acc, progress: any) => {
           const subjectId = chapterSubjectMap[progress.chapter_id];
           if (subjectId && progress.status === 'completed') {
             acc[subjectId] = (acc[subjectId] || 0) + 1;
           }
           return acc;
         }, {});
       }
     }

     const allSubjectNames = new Set([
       ...Object.keys(subjectsByName),
       ...Object.keys(progressByName),
     ]);

     mergedSubjects = Array.from(allSubjectNames).map((subjectKey) => {
       const curriculumSubject = subjectsByName[subjectKey];
       const progress = progressByName[subjectKey] || {};
       const totalChapters = curriculumSubject?.id
         ? chapterCountsBySubjectId[curriculumSubject.id] ?? curriculumSubject.total_chapters ?? progress.total_chapters ?? 0
         : progress.total_chapters ?? 0;
       const completedChapters = curriculumSubject?.id
         ? completedCountsBySubjectId[curriculumSubject.id] ?? progress.chapters_completed ?? 0
         : progress.chapters_completed ?? 0;

       return {
         ...progress,
         id: progress.id || curriculumSubject?.id || subjectKey,
         subject_name: progress.subject_name || curriculumSubject?.subject_name,
         progress_percentage: getPercent(
           Number(completedChapters) || 0,
           Number(totalChapters) || 0,
           Number(progress.progress_percentage) || 0
         ),
         chapters_completed: Number(completedChapters) || 0,
         total_chapters: Number(totalChapters) || 0,
         average_quiz_score: progress.average_quiz_score ?? null,
         last_accessed: progress.last_accessed || new Date().toISOString(),
         thumbnail_url: curriculumSubject?.thumbnail_url || null,
       };
     });

      // Calculate overall progress
      if (mergedSubjects.length > 0) {
        const avgProgress = mergedSubjects.reduce((sum, item) => 
          sum + (Number(item.progress_percentage) || 0), 0
        ) / mergedSubjects.length;
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
        subjects: mergedSubjects,
        activities: activityData || [],
        achievements: achievementData || [],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    }
   }, [user, userProfile]);

   const loadSchoolData = useCallback(async () => {
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
   }, [userProfile?.school_id]);

   const updateLastDashboardVisit = useCallback(async () => {
     if (!user) return;
    try {
      await supabase
        .from('users')
        .update({ last_dashboard_visit: new Date().toISOString() })
        .eq('id', user!.id);
    } catch (error) {
      console.error('Error updating last visit:', error);
    }
   }, [user]);

  // Show loading state during initial data fetch (with timeout protection)
  // Only show loader briefly - don't block indefinitely
  if (authLoading) {
    return <FullPageLoader message="Loading your dashboard..." />;
  }

  // If subscription is loading, show content anyway (subscription will update when ready)
  // Don't block the entire page for subscription status

  // Handle edge case where profile might still be loading - show dashboard with defaults
  const displayProfile = userProfile || {
    full_name: 'Student',
    grade_level: null,
    profile_picture_url: null,
    total_study_hours: 0,
    study_streak_days: 0,
    school_id: null,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-6">
        {/* Welcome Banner */}
        <WelcomeBanner
          userName={displayProfile.full_name}
          gradeLevel={displayProfile.grade_level}
          schoolName={schoolData.school_name}
          province={schoolData.province}
          profilePicture={displayProfile.profile_picture_url}
          isPremium={isPremium}
          totalStudyHours={displayProfile.total_study_hours || 0}
          studyStreakDays={displayProfile.study_streak_days || 0}
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
            {/* Onboarding Reminder Card */}
            <OnboardingDashboardCard />

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
