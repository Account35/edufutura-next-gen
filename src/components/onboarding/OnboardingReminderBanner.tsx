 import { X, ArrowRight, CheckCircle } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Progress } from '@/components/ui/progress';
 import { useNavigate } from 'react-router-dom';
 import { useOnboardingReminder } from '@/hooks/useOnboardingReminder';
 import { useEffect } from 'react';
 
 export const OnboardingReminderBanner = () => {
   const navigate = useNavigate();
   const {
     showBanner,
     completionPercentage,
     dismissBanner,
     logReminderInteraction,
     getRemainingSteps,
   } = useOnboardingReminder();
 
   const remainingSteps = getRemainingSteps();
 
   useEffect(() => {
     if (showBanner) {
       logReminderInteraction('banner', 'shown');
     }
   }, [showBanner, logReminderInteraction]);
 
   if (!showBanner) return null;
 
   const handleContinue = () => {
     logReminderInteraction('banner', 'clicked');
     navigate('/onboarding');
   };
 
   return (
     <div className="bg-gradient-to-r from-accent/30 to-accent/50 dark:from-accent/10 dark:to-accent/20 border-b border-accent/30 px-4 py-3">
       <div className="container mx-auto flex items-center justify-between gap-4 flex-wrap">
         <div className="flex items-center gap-4 flex-1 min-w-0">
           <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-accent">
             <CheckCircle className="w-5 h-5 text-accent-foreground" />
           </div>
           
           <div className="flex-1 min-w-0">
             <p className="text-sm font-medium text-foreground">
               Complete your profile setup to get personalized study recommendations
             </p>
             <div className="flex items-center gap-2 mt-1">
               <Progress value={completionPercentage} className="h-2 flex-1 max-w-[200px]" />
               <span className="text-xs font-semibold text-muted-foreground">
                 {completionPercentage}% complete
               </span>
             </div>
           </div>
         </div>
 
         <div className="flex items-center gap-2">
           <Button
             variant="default"
             size="sm"
             onClick={handleContinue}
             className="gap-1"
           >
             Complete Setup
             <ArrowRight className="w-4 h-4" />
           </Button>
           
           <Button
             variant="ghost"
             size="icon"
             onClick={dismissBanner}
             className="text-muted-foreground hover:bg-accent"
             aria-label="Dismiss"
           >
             <X className="w-4 h-4" />
           </Button>
         </div>
       </div>
     </div>
   );
 };