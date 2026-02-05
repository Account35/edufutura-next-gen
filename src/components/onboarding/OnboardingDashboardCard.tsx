 import { CheckCircle, Circle, ArrowRight, Sparkles } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Progress } from '@/components/ui/progress';
 import { useNavigate } from 'react-router-dom';
 import { useOnboardingReminder } from '@/hooks/useOnboardingReminder';
 import { useEffect } from 'react';
 import { cn } from '@/lib/utils';
 
 export const OnboardingDashboardCard = () => {
   const navigate = useNavigate();
   const {
     showDashboardCard,
     completionPercentage,
     stepsCompleted,
     logReminderInteraction,
     steps,
   } = useOnboardingReminder();
 
   useEffect(() => {
     if (showDashboardCard) {
       logReminderInteraction('dashboard_card', 'shown');
     }
   }, [showDashboardCard, logReminderInteraction]);
 
   if (!showDashboardCard) return null;
 
   const handleContinue = () => {
     logReminderInteraction('dashboard_card', 'clicked');
     navigate('/onboarding');
   };
 
   return (
     <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10 border-primary/20 overflow-hidden relative">
       <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
       
       <CardHeader className="relative pb-2">
         <div className="flex items-start justify-between">
           <div className="flex items-center gap-2">
             <div className="p-2 bg-primary/10 rounded-lg">
               <Sparkles className="w-5 h-5 text-primary" />
             </div>
             <div>
               <CardTitle className="text-lg">Complete Your Profile</CardTitle>
               <CardDescription>Unlock personalized learning</CardDescription>
             </div>
           </div>
         </div>
       </CardHeader>
 
       <CardContent className="space-y-4">
         {/* Progress Bar */}
         <div className="space-y-2">
           <div className="flex items-center justify-between text-sm">
             <span className="text-muted-foreground">Setup Progress</span>
             <span className="font-semibold text-primary">{completionPercentage}%</span>
           </div>
           <Progress value={completionPercentage} className="h-2" />
         </div>
 
         {/* Steps Checklist */}
         <div className="space-y-2">
           {steps.map((step) => {
             const isComplete = stepsCompleted.includes(step.id);
             return (
               <div
                 key={step.id}
                 className="flex items-center gap-2 text-sm py-1 text-foreground"
               >
                 {isComplete ? (
                   <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                 ) : (
                   <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                 )}
                 <span className={cn(isComplete && 'line-through text-muted-foreground')}>{step.name}</span>
               </div>
             );
           })}
         </div>
 
         {/* Benefits */}
         <div className="p-3 bg-muted/50 rounded-lg space-y-1">
           <p className="text-xs font-medium text-muted-foreground">Complete setup to unlock:</p>
           <ul className="text-xs text-muted-foreground space-y-0.5">
             <li>• Personalized AI study recommendations</li>
             <li>• Study buddy matching based on your subjects</li>
             <li>• Custom learning paths and goals</li>
           </ul>
         </div>
 
         {/* CTA Button */}
         <Button onClick={handleContinue} className="w-full gap-2">
           Continue Setup
           <ArrowRight className="w-4 h-4" />
         </Button>
       </CardContent>
     </Card>
   );
 };