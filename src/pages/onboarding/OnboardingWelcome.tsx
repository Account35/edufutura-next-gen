 import { useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { useAuth } from '@/hooks/useAuth';
 import { supabase } from '@/integrations/supabase/client';
 import { GraduationCap, Sparkles, Users, Brain } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 export default function OnboardingWelcome() {
   const navigate = useNavigate();
   const { user, userProfile, loading } = useAuth();
 
   useEffect(() => {
     if (!loading && !user) {
       navigate('/');
       return;
     }
 
     if (userProfile?.onboarding_completed) {
       navigate('/dashboard');
       return;
     }
 
     // Mark onboarding as started
     if (user && !userProfile?.onboarding_started_at) {
       supabase
         .from('users')
         .update({
           onboarding_started_at: new Date().toISOString(),
           onboarding_step: 1,
         })
         .eq('id', user.id)
         .then(() => console.log('[Onboarding] Started tracking'));
     }
   }, [user, userProfile, loading, navigate]);
 
   const features = [
     { icon: GraduationCap, text: 'CAPS-aligned curriculum for all subjects' },
     { icon: Brain, text: 'AI tutor to help you study smarter' },
     { icon: Users, text: 'Study groups and buddy matching' },
     { icon: Sparkles, text: 'Personalized learning paths' },
   ];
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Progress indicator */}
       <div className="w-full bg-muted h-1">
         <div className="bg-secondary h-1 w-0 transition-all" />
       </div>
 
       <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center space-y-6"
         >
           {/* Celebration emoji */}
           <div className="text-6xl mb-4">🎉</div>
 
           {/* Welcome message */}
           <h1 className="text-3xl font-serif text-primary">
             Welcome to EduFutura, {userProfile?.full_name?.split(' ')[0] || 'Student'}!
           </h1>
 
           <p className="text-muted-foreground text-lg">
             Let's personalize your learning experience.
             <br />
             <span className="text-sm">This will take about 2 minutes.</span>
           </p>
 
           {/* Features preview */}
           <div className="space-y-3 text-left bg-muted/50 rounded-lg p-4 mt-6">
             <p className="text-sm font-medium text-foreground">What you'll unlock:</p>
             {features.map((feature, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.1 * i }}
                 className="flex items-center gap-3 text-sm text-muted-foreground"
               >
                 <feature.icon className="w-4 h-4 text-secondary flex-shrink-0" />
                 <span>{feature.text}</span>
               </motion.div>
             ))}
           </div>
 
           {/* CTA */}
           <Button
             onClick={() => navigate('/onboarding/profile')}
             className="w-full min-h-[48px] bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg mt-4"
             size="lg"
           >
             Let's Get Started
           </Button>
 
            {/* Step indicator - Welcome is step 0 (intro) */}
            <p className="text-xs text-muted-foreground">
              Welcome • 4 steps to complete
           </p>
         </motion.div>
       </div>
     </div>
   );
 }