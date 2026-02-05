 import { useState, useEffect, useCallback } from 'react';
 import { useAuth } from '@/hooks/useAuth';
 import { supabase } from '@/integrations/supabase/client';
 
 interface OnboardingReminderState {
   showBanner: boolean;
   showDashboardCard: boolean;
   completionPercentage: number;
   currentStep: string;
   stepsCompleted: string[];
   totalSteps: number;
   dismissedThisSession: boolean;
 }
 
 interface StudyPreferences {
   preferred_study_time?: string | null;
   learning_style?: string | null;
 }
 
 const ONBOARDING_STEPS = [
   { id: 'profile', name: 'Basic Profile', weight: 20 },
   { id: 'grade', name: 'Grade Level', weight: 20 },
   { id: 'subjects', name: 'Subjects', weight: 25 },
   { id: 'preferences', name: 'Study Preferences', weight: 20 },
   { id: 'tour', name: 'Platform Tour', weight: 15 },
 ];
 
 export const useOnboardingReminder = () => {
   const { user, userProfile, refreshProfile } = useAuth();
   const [state, setState] = useState<OnboardingReminderState>({
     showBanner: false,
     showDashboardCard: false,
     completionPercentage: 0,
     currentStep: '',
     stepsCompleted: [],
     totalSteps: ONBOARDING_STEPS.length,
     dismissedThisSession: false,
   });
   const [studyPrefs, setStudyPrefs] = useState<StudyPreferences | null>(null);
 
   // Fetch study preferences from separate table
   useEffect(() => {
     const fetchPrefs = async () => {
       if (!user) return;
       
       const { data } = await supabase
         .from('study_preferences')
         .select('preferred_study_time, learning_style')
         .eq('user_id', user.id)
         .maybeSingle();
       
       if (data) {
         setStudyPrefs(data);
       }
     };
     
     fetchPrefs();
   }, [user]);
 
   // Calculate completion percentage based on profile data
   const calculateCompletion = useCallback(() => {
     if (!userProfile) return { percentage: 0, completed: [] as string[], currentStep: 'profile' };
 
     const completed: string[] = [];
     let percentage = 0;
 
     // Check each step
     if (userProfile.full_name && userProfile.full_name.trim().length > 0) {
       completed.push('profile');
       percentage += 20;
     }
 
     if (userProfile.grade_level && userProfile.grade_level > 0) {
       completed.push('grade');
       percentage += 20;
     }
 
     // subjects_studying is JSONB - check if it's an array with items
     const subjects = userProfile.subjects_studying;
     if (subjects && Array.isArray(subjects) && subjects.length > 0) {
       completed.push('subjects');
       percentage += 25;
     }
 
     // Check study preferences from the separate table
     if (studyPrefs?.preferred_study_time || studyPrefs?.learning_style) {
       completed.push('preferences');
       percentage += 20;
     }
 
     // Tour is considered complete if they've visited dashboard
     if (userProfile.last_dashboard_visit) {
       completed.push('tour');
       percentage += 15;
     }
 
     // Find first incomplete step
     const currentStep = ONBOARDING_STEPS.find(s => !completed.includes(s.id))?.id || 'complete';
 
     return { percentage, completed, currentStep };
   }, [userProfile, studyPrefs]);
 
   // Update state when profile changes
   useEffect(() => {
     if (!user || !userProfile) {
       setState(prev => ({ ...prev, showBanner: false, showDashboardCard: false }));
       return;
     }
 
     // If onboarding is complete, don't show reminders
     if (userProfile.onboarding_completed) {
       setState(prev => ({ ...prev, showBanner: false, showDashboardCard: false }));
       return;
     }
 
     const { percentage, completed, currentStep } = calculateCompletion();
 
     setState(prev => ({
       ...prev,
       showBanner: !prev.dismissedThisSession && percentage < 100,
       showDashboardCard: percentage < 100,
       completionPercentage: percentage,
       currentStep,
       stepsCompleted: completed,
     }));
   }, [user, userProfile, calculateCompletion]);
 
   // Track onboarding started when user first accesses onboarding
   const trackOnboardingStarted = useCallback(async () => {
     if (!user || !userProfile) return;
 
     // Only set if not already set
     if (!userProfile.onboarding_started_at) {
       const { error } = await supabase
         .from('users')
         .update({ onboarding_started_at: new Date().toISOString() })
         .eq('id', user.id);
 
       if (error) {
         console.error('Failed to track onboarding start:', error);
       }
     }
   }, [user, userProfile]);
 
   // Dismiss banner for this session
   const dismissBanner = useCallback(() => {
     setState(prev => ({ ...prev, showBanner: false, dismissedThisSession: true }));
   }, []);
 
   // Log reminder interaction
   const logReminderInteraction = useCallback(async (
     reminderType: string,
     action: 'shown' | 'clicked' | 'dismissed'
   ) => {
     if (!user) return;
 
     try {
       if (action === 'shown') {
         await supabase.from('onboarding_reminder_log' as any).insert({
           user_id: user.id,
           reminder_type: reminderType,
           channel: 'in_app',
           success: true,
         });
       } else if (action === 'clicked') {
         // Update the most recent reminder log with clicked_at
         await supabase
           .from('onboarding_reminder_log' as any)
           .update({ clicked_at: new Date().toISOString() })
           .eq('user_id', user.id)
           .eq('reminder_type', reminderType)
           .is('clicked_at', null)
           .order('sent_at', { ascending: false })
           .limit(1);
       }
     } catch (error) {
       console.error('Failed to log reminder interaction:', error);
     }
   }, [user]);
 
   // Get step details for display
   const getStepDetails = useCallback((stepId: string) => {
     return ONBOARDING_STEPS.find(s => s.id === stepId);
   }, []);
 
   // Get remaining steps
   const getRemainingSteps = useCallback(() => {
     return ONBOARDING_STEPS.filter(s => !state.stepsCompleted.includes(s.id));
   }, [state.stepsCompleted]);
 
   return {
     ...state,
     trackOnboardingStarted,
     dismissBanner,
     logReminderInteraction,
     getStepDetails,
     getRemainingSteps,
     refreshProfile,
     steps: ONBOARDING_STEPS,
   };
 };