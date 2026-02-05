 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { useAuth } from '@/hooks/useAuth';
 import { useAdminRole } from '@/hooks/useAdminRole';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import {
   GraduationCap,
   BookOpen,
   MessageSquare,
   Users,
   Check,
   Loader2,
   Sparkles,
 } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 export default function OnboardingComplete() {
   const navigate = useNavigate();
   const { user, userProfile, loading } = useAuth();
   const { isAdmin, isEducator, loading: roleLoading } = useAdminRole();
   const [isCompleting, setIsCompleting] = useState(false);
 
   useEffect(() => {
     if (!loading && !user) {
       navigate('/');
     }
   }, [user, loading, navigate]);
 
   const handleComplete = async () => {
     if (!user) return;
 
     setIsCompleting(true);
     try {
       const { error } = await supabase
         .from('users')
         .update({
           onboarding_completed: true,
           onboarding_completed_at: new Date().toISOString(),
         })
         .eq('id', user.id);
 
       if (error) throw error;
 
       toast.success('Welcome to EduFutura! 🎉');
 
       // Redirect based on role
       if (isAdmin || isEducator) {
         navigate('/admin');
       } else {
         navigate('/dashboard');
       }
     } catch (error) {
       console.error('Complete error:', error);
       toast.error('Something went wrong. Please try again.');
     } finally {
       setIsCompleting(false);
     }
   };
 
   const selectedSubjects = (userProfile?.subjects_studying as string[]) || [];
 
   const nextSteps = [
     {
       icon: BookOpen,
       title: `Browse ${selectedSubjects[0] || 'your first subject'}`,
       description: 'Explore CAPS-aligned curriculum content',
     },
     {
       icon: GraduationCap,
       title: 'Take a practice quiz',
       description: 'Test your knowledge and track progress',
     },
     {
       icon: MessageSquare,
       title: 'Ask the AI tutor a question',
       description: 'Get instant help with any topic',
     },
     {
       icon: Users,
       title: 'Find a study buddy',
       description: 'Connect with students in your subjects',
     },
   ];
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Progress bar - complete */}
       <div className="w-full bg-muted h-1">
         <div className="bg-secondary h-1 w-full transition-all" />
       </div>
 
       <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
         <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="text-center space-y-6"
         >
           {/* Success animation */}
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: 'spring', delay: 0.2 }}
             className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto"
           >
             <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ type: 'spring', delay: 0.4 }}
               className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center"
             >
               <Check className="w-8 h-8 text-secondary-foreground" />
             </motion.div>
           </motion.div>
 
           {/* Celebration */}
           <div className="space-y-2">
             <h1 className="text-3xl font-serif text-primary flex items-center justify-center gap-2">
               You're All Set! <span className="text-2xl">🎓</span>
             </h1>
             <p className="text-muted-foreground">
               Your personalized learning journey begins now
             </p>
           </div>
 
           {/* Summary */}
           {selectedSubjects.length > 0 && (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.3 }}
               className="bg-muted/50 rounded-lg p-4 text-left"
             >
               <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-secondary" />
                 Here's what we've set up for you:
               </p>
               <ul className="text-sm text-muted-foreground space-y-1">
                 <li className="flex items-center gap-2">
                   <Check className="w-3 h-3 text-green-500" />
                   {selectedSubjects.length} subjects selected
                 </li>
                 <li className="flex items-center gap-2">
                   <Check className="w-3 h-3 text-green-500" />
                   Personalized learning preferences saved
                 </li>
                 <li className="flex items-center gap-2">
                   <Check className="w-3 h-3 text-green-500" />
                   AI tutor ready to help
                 </li>
               </ul>
             </motion.div>
           )}
 
           {/* Next steps */}
           <div className="space-y-3 text-left">
             <p className="text-sm font-medium text-foreground">Recommended first actions:</p>
             {nextSteps.map((step, i) => (
               <motion.div
                 key={i}
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.4 + i * 0.1 }}
                 className="flex items-start gap-3 text-sm"
               >
                 <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                   <span className="text-xs font-medium text-secondary">{i + 1}</span>
                 </div>
                 <div>
                   <p className="font-medium text-foreground">{step.title}</p>
                   <p className="text-xs text-muted-foreground">{step.description}</p>
                 </div>
               </motion.div>
             ))}
           </div>
 
           {/* CTA */}
           <Button
             onClick={handleComplete}
             disabled={isCompleting || roleLoading}
             className="w-full min-h-[52px] bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold text-lg"
             size="lg"
           >
             {isCompleting ? (
               <Loader2 className="w-5 h-5 animate-spin" />
             ) : (
               'Go to Dashboard'
             )}
           </Button>
 
           <p className="text-xs text-muted-foreground">
             Step 4 of 4 • Complete!
           </p>
         </motion.div>
       </div>
     </div>
   );
 }