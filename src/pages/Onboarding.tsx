import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FullPageLoader } from '@/components/ui/loading';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BasicInfoStep } from '@/components/onboarding/BasicInfoStep';
import { GradeSchoolStep } from '@/components/onboarding/GradeSchoolStep';
import { SubjectsStep } from '@/components/onboarding/SubjectsStep';
import { LocationStep } from '@/components/onboarding/LocationStep';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';

const STEPS = [
  { id: 'basic', title: 'Basic Information', description: 'Tell us about yourself' },
  { id: 'grade-school', title: 'Grade & School', description: 'Select your grade and school' },
  { id: 'subjects', title: 'Subjects', description: 'Choose subjects to study' },
  { id: 'location', title: 'Location', description: 'Set your location' },
  { id: 'welcome', title: 'Welcome!', description: 'You\'re all set' }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({
    full_name: '',
    date_of_birth: '',
    grade_level: null as number | null,
    school_id: null as string | null,
    subjects_studying: [] as string[],
    province: '',
    district: '',
    city: ''
  });

  // Determine which steps are required based on existing data
  const getRequiredSteps = () => {
    const steps = [];
    
    // Basic info step - required if name or DOB is missing
    if (!onboardingData.full_name.trim() || !onboardingData.date_of_birth) {
      steps.push(0);
    }
    
    // Grade/School step - required if grade is missing
    if (!onboardingData.grade_level) {
      steps.push(1);
    }
    
    // Subjects step - required if no subjects selected
    if (!onboardingData.subjects_studying || onboardingData.subjects_studying.length === 0) {
      steps.push(2);
    }
    
    // Location step - required if location is missing
    if (!onboardingData.province || !onboardingData.city.trim()) {
      steps.push(3);
    }
    
    // Welcome step - always required
    steps.push(4);
    
    return steps;
  };

  const requiredSteps = getRequiredSteps();
  const currentRequiredStepIndex = requiredSteps.indexOf(currentStep);
  const totalRequiredSteps = requiredSteps.length;

  useEffect(() => {
    // Redirect if not authenticated
    if (!loading && !user) {
      navigate('/');
      return;
    }

    // If onboarding already completed, redirect to dashboard
    if (userProfile?.onboarding_completed) {
      navigate('/dashboard');
      return;
    }

    // Initialize onboarding data from existing profile
    if (userProfile) {
      setOnboardingData({
        full_name: userProfile.full_name || user?.user_metadata?.full_name || '',
        date_of_birth: userProfile.date_of_birth || '',
        grade_level: userProfile.grade_level || null,
        school_id: userProfile.school_id || null,
        subjects_studying: userProfile.subjects_studying || [],
        province: userProfile.province || '',
        district: userProfile.district || '',
        city: userProfile.city || ''
      });
    } else if (user && !userProfile) {
      // If we have user but no profile yet, try to get name from auth metadata
      setOnboardingData(prev => ({
        ...prev,
        full_name: user.user_metadata?.full_name || prev.full_name
      }));
    }
  }, [user, userProfile, loading, navigate]);

  const updateOnboardingData = (data: Partial<typeof onboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    const currentIndex = requiredSteps.indexOf(currentStep);
    if (currentIndex < requiredSteps.length - 1) {
      setCurrentStep(requiredSteps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = requiredSteps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(requiredSteps[currentIndex - 1]);
    }
  };

  const completeOnboarding = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...onboardingData,
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('id', user!.id);

      if (error) throw error;

      await refreshProfile();
      toast.success('Welcome to EduFutura!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to complete setup. Please try again.');
    }
  };

  if (loading || !userProfile) {
    return <FullPageLoader message="Setting up your account..." />;
  }

  const progress = totalRequiredSteps > 0 ? ((currentRequiredStepIndex + 1) / totalRequiredSteps) * 100 : 100;

  const getCurrentStepInfo = () => {
    const stepIndex = requiredSteps.indexOf(currentStep);
    if (stepIndex === -1) return STEPS[currentStep];
    return STEPS[currentStep];
  };

  const currentStepInfo = getCurrentStepInfo();

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
          />
        );
      case 1:
        return (
          <GradeSchoolStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
            userId={user?.id || ''}
          />
        );
      case 2:
        return (
          <SubjectsStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 3:
        return (
          <LocationStep
            data={onboardingData}
            onUpdate={updateOnboardingData}
            onNext={nextStep}
            onPrev={prevStep}
          />
        );
      case 4:
        return (
          <WelcomeStep
            data={onboardingData}
            onComplete={completeOnboarding}
            onPrev={prevStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Progress Header */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-serif">Welcome to EduFutura</CardTitle>
            <CardDescription>
              {currentStepInfo.description}
            </CardDescription>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentRequiredStepIndex + 1} of {totalRequiredSteps}</span>
                <span>{currentStepInfo.title}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardHeader>
        </Card>

        {/* Current Step Content */}
        <Card>
          <CardContent className="p-6">
            {renderCurrentStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
