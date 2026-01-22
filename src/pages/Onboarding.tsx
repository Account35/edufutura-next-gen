import { useState, useEffect } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/integrations/supabase/client';
import { FullPageLoader } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { ProfilePhotoStep } from '@/components/onboarding/ProfilePhotoStep';
import { SubjectsStep } from '@/components/onboarding/SubjectsStep';
import { PreferencesStep } from '@/components/onboarding/PreferencesStep';
import { TourStep } from '@/components/onboarding/TourStep';
import { CompletionStep } from '@/components/onboarding/CompletionStep';

type OnboardingStep = 'welcome' | 'profile' | 'subjects' | 'preferences' | 'tour' | 'completion';

interface OnboardingData {
  profilePicture?: string;
  bio?: string;
  province?: string;
  selectedSubjects: string[];
  learningStyle: string;
  studyPace: string;
  preferredStudyTimes: string[];
  studyGoals: string[];
  dailyGoalMinutes: number;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();
  const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({
    selectedSubjects: [],
    preferredStudyTimes: [],
    studyGoals: [],
    dailyGoalMinutes: 60
  });
  const [isCompleting, setIsCompleting] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Onboarding] State:', {
      loading,
      roleLoading,
      user: user?.id ?? null,
      userProfile: userProfile ? 'exists' : null,
      onboarding_completed: userProfile?.onboarding_completed,
      autoAttempted,
    });

    // Redirect if not authenticated
    if (!loading && !user) {
      console.log('[Onboarding] Not authenticated, redirecting to /');
      navigate('/');
      return;
    }

    // If onboarding already completed, redirect appropriately
    if (userProfile?.onboarding_completed && !roleLoading) {
      const dest = isAdmin || isEducator ? '/admin' : '/dashboard';
      console.log('[Onboarding] Already completed, redirecting to', dest);
      navigate(dest);
      return;
    }

    // Load saved progress from localStorage
    const saved = localStorage.getItem('edufutura_onboarding_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOnboardingData(prev => ({ ...prev, ...parsed }));
        if (parsed.step) {
          setCurrentStep(parsed.step);
        }
      } catch (error) {
        console.error('Error loading saved progress:', error);
      }
    }
  }, [user, userProfile, loading, roleLoading, isAdmin, isEducator, navigate]);

  const saveProgress = (step: OnboardingStep, data: Partial<OnboardingData>) => {
    const updatedData = { ...onboardingData, ...data, step };
    setOnboardingData(updatedData);
    localStorage.setItem('edufutura_onboarding_progress', JSON.stringify(updatedData));
  };

  const handleWelcomeNext = () => {
    setCurrentStep('profile');
  };

  const handleProfileNext = (data: { profilePicture?: string; bio?: string; province?: string }) => {
    saveProgress('profile', data);
    setCurrentStep('subjects');
  };

  const handleSubjectsNext = (selectedSubjects: string[]) => {
    saveProgress('subjects', { selectedSubjects });
    setCurrentStep('preferences');
  };

  const handlePreferencesNext = (preferences: {
    learningStyle: string;
    studyPace: string;
    preferredStudyTimes: string[];
    studyGoals: string[];
    dailyGoalMinutes: number;
  }) => {
    saveProgress('preferences', preferences);
    setCurrentStep('tour');
  };

  const handleTourNext = () => {
    setCurrentStep('completion');
  };

  const handleTourSkip = () => {
    setCurrentStep('completion');
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'profile':
        setCurrentStep('welcome');
        break;
      case 'subjects':
        setCurrentStep('profile');
        break;
      case 'preferences':
        setCurrentStep('subjects');
        break;
      case 'tour':
        setCurrentStep('preferences');
        break;
      case 'completion':
        setCurrentStep('tour');
        break;
    }
  };

  const handleComplete = async () => {
    if (!user || !userProfile) return;

    setIsCompleting(true);
    try {
      // Save all onboarding data to database
      const updates: any = {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        profile_picture_url: onboardingData.profilePicture,
        bio: onboardingData.bio,
        province: onboardingData.province,
        study_preferences: {
          learning_style: onboardingData.learningStyle,
          study_pace: onboardingData.studyPace,
          preferred_study_times: onboardingData.preferredStudyTimes,
          study_goals: onboardingData.studyGoals,
          daily_goal_minutes: onboardingData.dailyGoalMinutes
        }
      };

      const { error: userError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (userError) throw userError;

      // Save subjects studying
      if (onboardingData.selectedSubjects && onboardingData.selectedSubjects.length > 0) {
        const subjectInserts = onboardingData.selectedSubjects.map(subjectName => ({
          user_id: user.id,
          subject_name: subjectName
        }));

        const { error: subjectsError } = await supabase
          .from('subjects_studying')
          .upsert(subjectInserts, { onConflict: 'user_id,subject_name' });

        if (subjectsError) throw subjectsError;

        // Initialize progress for each subject
        const progressInserts = onboardingData.selectedSubjects.map(subjectName => ({
          user_id: user.id,
          subject_name: subjectName,
          progress_percentage: 0,
          chapters_completed: 0,
          average_quiz_score: null,
          last_accessed: new Date().toISOString()
        }));

        const { error: progressError } = await supabase
          .from('user_progress')
          .upsert(progressInserts, { onConflict: 'user_id,subject_name' });

        if (progressError) throw progressError;
      }

      // Clear saved progress
      localStorage.removeItem('edufutura_onboarding_progress');
    // Auto-complete onboarding for Phase 1 (temporary until Phase 3 onboarding wizard)
    // IMPORTANT: only attempt once automatically to avoid infinite spinner loops on failure.
    if (
      user &&
      userProfile &&
      !userProfile.onboarding_completed &&
      !roleLoading &&
      !autoAttempted
    ) {
      console.log('[Onboarding] Auto-completing onboarding...');
      setAutoAttempted(true);
      completeOnboarding();
    }
  }, [
    user,
    userProfile,
    loading,
    roleLoading,
    isAdmin,
    isEducator,
    navigate,
    autoAttempted,
  ]);

  const completeOnboarding = async () => {
    if (!user) return;

    try {
      setSetupError(null);

      const { error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      toast.success('Welcome to EduFutura! Your profile is all set up.');

      toast.success('Welcome to EduFutura!');

      // Redirect based on role
      if (isAdmin || isEducator) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save your profile. Please try again.');
    } finally {
      setIsCompleting(false);
      setSetupError('We couldn\'t finish setting up your account.');
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  if (loading || roleLoading || !userProfile) {
    return <FullPageLoader message="Setting up your account..." />;
  }

  if (isCompleting) {
    return <FullPageLoader message="Finalizing your profile..." />;
  }

  const userName = userProfile.full_name || userProfile.email?.split('@')[0] || 'Student';
  const gradeLevel = userProfile.grade_level || 12;

  switch (currentStep) {
    case 'welcome':
      return <WelcomeStep onNext={handleWelcomeNext} userName={userName} />;

    case 'profile':
      return (
        <ProfilePhotoStep
          onNext={handleProfileNext}
          onBack={handleBack}
          userName={userName}
          initialData={{
            profilePicture: onboardingData.profilePicture,
            bio: onboardingData.bio,
            province: onboardingData.province
          }}
        />
      );

    case 'subjects':
      return (
        <SubjectsStep
          onNext={handleSubjectsNext}
          onBack={handleBack}
          gradeLevel={gradeLevel}
          initialSelected={onboardingData.selectedSubjects}
        />
      );

    case 'preferences':
      return (
        <PreferencesStep
          onNext={handlePreferencesNext}
          onBack={handleBack}
          initialData={{
            learningStyle: onboardingData.learningStyle,
            studyPace: onboardingData.studyPace,
            preferredStudyTimes: onboardingData.preferredStudyTimes,
            studyGoals: onboardingData.studyGoals,
            dailyGoalMinutes: onboardingData.dailyGoalMinutes
          }}
        />
      );

    case 'tour':
      return (
        <TourStep
          onNext={handleTourNext}
          onBack={handleBack}
          onSkip={handleTourSkip}
        />
      );

    case 'completion':
      return (
        <CompletionStep
          onComplete={handleComplete}
          userData={{
            name: userName,
            selectedSubjects: onboardingData.selectedSubjects || [],
            learningStyle: onboardingData.learningStyle || 'visual',
            studyPace: onboardingData.studyPace || 'moderate'
          }}
        />
      );

    default:
      return <WelcomeStep onNext={handleWelcomeNext} userName={userName} />;
  }
  if (setupError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Setup needs a retry</h1>
            <p className="text-sm text-muted-foreground">{setupError} Tap Retry to try again.</p>
          </div>
          <Button className="w-full min-h-[48px]" onClick={completeOnboarding}>
            Retry setup
          </Button>
          <Button variant="outline" className="w-full min-h-[48px]" onClick={() => navigate('/')}
          >
            Go to home
          </Button>
        </div>
      </div>
    );
  }

  return <FullPageLoader message="Completing your profile..." />;
}
