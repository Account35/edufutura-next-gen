 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Sparkles, X, ArrowRight } from 'lucide-react';
 import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { useOnboardingReminder } from '@/hooks/useOnboardingReminder';
 
 interface OnboardingPromptModalProps {
   trigger: 'ai_tutor' | 'study_buddy' | 'quiz' | 'forum';
   isOpen: boolean;
   onClose: () => void;
 }
 
 const TRIGGER_MESSAGES = {
   ai_tutor: {
     title: 'Get Better AI Responses',
     description: 'Complete your profile so the AI tutor can personalize responses to your learning style and subjects.',
     benefit: 'AI will adapt explanations to how you learn best',
   },
   study_buddy: {
     title: 'Unlock Study Buddy Matching',
     description: 'Complete setup to find study partners who share your subjects and learning goals.',
     benefit: 'Get matched with compatible study partners',
   },
   quiz: {
     title: 'Personalized Quiz Recommendations',
     description: 'Complete your profile to get quiz suggestions tailored to your subjects and skill level.',
     benefit: 'Quizzes adapted to your current knowledge',
   },
   forum: {
     title: 'Join the Community',
     description: 'Complete your profile to participate in forums and help other students.',
     benefit: 'Connect with students studying the same subjects',
   },
 };
 
 const SESSION_KEY = 'onboarding_modal_shown_today';
 
 export const OnboardingPromptModal = ({
   trigger,
   isOpen,
   onClose,
 }: OnboardingPromptModalProps) => {
   const navigate = useNavigate();
   const {
     completionPercentage,
     logReminderInteraction,
     showDashboardCard,
   } = useOnboardingReminder();
 
   const [shouldShow, setShouldShow] = useState(false);
 
   useEffect(() => {
     // Check if modal was already shown today
     const lastShown = sessionStorage.getItem(SESSION_KEY);
     const today = new Date().toDateString();
     
     if (lastShown !== today && showDashboardCard) {
       setShouldShow(true);
     }
   }, [showDashboardCard]);
 
   useEffect(() => {
     if (isOpen && shouldShow) {
       logReminderInteraction(`modal_${trigger}`, 'shown');
       // Mark as shown for today
       sessionStorage.setItem(SESSION_KEY, new Date().toDateString());
     }
   }, [isOpen, shouldShow, trigger, logReminderInteraction]);
 
   if (!shouldShow) {
     // Still call onClose to let the parent proceed
     if (isOpen) onClose();
     return null;
   }
 
   const message = TRIGGER_MESSAGES[trigger];
 
   const handleComplete = () => {
     logReminderInteraction(`modal_${trigger}`, 'clicked');
     navigate('/onboarding');
     onClose();
   };
 
   const handleMaybeLater = () => {
     onClose();
   };
 
   return (
     <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="sm:max-w-md">
         <DialogHeader>
           <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
             <Sparkles className="w-6 h-6 text-primary" />
           </div>
           <DialogTitle className="text-center">{message.title}</DialogTitle>
           <DialogDescription className="text-center">
             {message.description}
           </DialogDescription>
         </DialogHeader>
 
         <div className="space-y-4 py-4">
           {/* Progress indicator */}
           <div className="space-y-2">
             <div className="flex items-center justify-between text-sm">
               <span className="text-muted-foreground">Your progress</span>
               <span className="font-semibold">{completionPercentage}% complete</span>
             </div>
             <Progress value={completionPercentage} className="h-2" />
           </div>
 
           {/* Benefit highlight */}
           <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
             <p className="text-sm text-center">
               <span className="font-medium">✨ {message.benefit}</span>
             </p>
           </div>
         </div>
 
         <div className="flex flex-col sm:flex-row gap-2">
           <Button
             variant="outline"
             onClick={handleMaybeLater}
             className="flex-1"
           >
             Maybe Later
           </Button>
           <Button
             onClick={handleComplete}
             className="flex-1 gap-2"
           >
             Complete Setup
             <ArrowRight className="w-4 h-4" />
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 };