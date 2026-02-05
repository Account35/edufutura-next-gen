 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { useAuth } from '@/hooks/useAuth';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
 import { motion } from 'framer-motion';
 import {
   Calculator,
   Atom,
   Leaf,
   BookOpen,
   Globe2,
   Palette,
   DollarSign,
   Scale,
   Languages,
   Music,
   Heart,
   Cpu,
   Users,
 } from 'lucide-react';
 
 interface Subject {
   name: string;
   icon: React.ElementType;
   description: string;
   color: string;
 }
 
 const AVAILABLE_SUBJECTS: Subject[] = [
   { name: 'Mathematics', icon: Calculator, description: 'Algebra, Geometry, Calculus', color: 'bg-blue-500' },
   { name: 'Physical Sciences', icon: Atom, description: 'Physics & Chemistry', color: 'bg-purple-500' },
   { name: 'Life Sciences', icon: Leaf, description: 'Biology & Ecology', color: 'bg-green-500' },
   { name: 'English', icon: BookOpen, description: 'Language & Literature', color: 'bg-amber-500' },
   { name: 'Afrikaans', icon: Languages, description: 'Taal en Letterkunde', color: 'bg-orange-500' },
   { name: 'Geography', icon: Globe2, description: 'Physical & Human Geography', color: 'bg-cyan-500' },
   { name: 'History', icon: BookOpen, description: 'South African & World History', color: 'bg-rose-500' },
   { name: 'Accounting', icon: DollarSign, description: 'Financial Accounting', color: 'bg-emerald-500' },
   { name: 'Business Studies', icon: Users, description: 'Business Management', color: 'bg-indigo-500' },
   { name: 'Economics', icon: Scale, description: 'Micro & Macro Economics', color: 'bg-teal-500' },
   { name: 'Visual Arts', icon: Palette, description: 'Art & Design', color: 'bg-pink-500' },
   { name: 'Music', icon: Music, description: 'Theory & Performance', color: 'bg-violet-500' },
   { name: 'Life Orientation', icon: Heart, description: 'Life Skills & Career Guidance', color: 'bg-red-500' },
   { name: 'Information Technology', icon: Cpu, description: 'Programming & Systems', color: 'bg-slate-500' },
   { name: 'Mathematical Literacy', icon: Calculator, description: 'Applied Mathematics', color: 'bg-sky-500' },
 ];
 
 export default function OnboardingSubjects() {
   const navigate = useNavigate();
   const { user, userProfile, loading } = useAuth();
   const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);
 
   useEffect(() => {
     if (!loading && !user) {
       navigate('/');
       return;
     }
 
     if (userProfile?.onboarding_completed) {
       navigate('/dashboard');
       return;
     }
 
     // Pre-fill existing selections
     if (userProfile?.subjects_studying && Array.isArray(userProfile.subjects_studying)) {
       setSelectedSubjects(userProfile.subjects_studying as string[]);
     }
   }, [user, userProfile, loading, navigate]);
 
   const toggleSubject = (subjectName: string) => {
     setSelectedSubjects((prev) => {
       if (prev.includes(subjectName)) {
         return prev.filter((s) => s !== subjectName);
       }
       if (prev.length >= 8) {
         toast.error('Maximum 8 subjects allowed');
         return prev;
       }
       return [...prev, subjectName];
     });
   };
 
   const handleContinue = async () => {
     if (!user) return;
 
     if (selectedSubjects.length < 3) {
       toast.error('Please select at least 3 subjects');
       return;
     }
 
     setIsSaving(true);
     try {
       // Update user's subjects
       const { error } = await supabase
         .from('users')
         .update({
           subjects_studying: selectedSubjects,
           onboarding_step: 3,
         })
         .eq('id', user.id);
 
       if (error) throw error;
 
       // Initialize user_progress for each selected subject
       const progressInserts = selectedSubjects.map((subject) => ({
         user_id: user.id,
         subject_name: subject,
         progress_percentage: 0,
         chapters_completed: 0,
         current_chapter: null,
         average_quiz_score: null,
       }));
 
       // Upsert to handle existing records
       await supabase.from('user_progress').upsert(progressInserts, {
         onConflict: 'user_id,subject_name',
         ignoreDuplicates: true,
       });
 
       navigate('/onboarding/preferences');
     } catch (error) {
       console.error('Save error:', error);
       toast.error('Failed to save subjects');
     } finally {
       setIsSaving(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Progress bar */}
       <div className="w-full bg-muted h-1">
         <div className="bg-secondary h-1 w-2/4 transition-all" />
       </div>
 
       <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
         {/* Back button */}
         <button
           onClick={() => navigate('/onboarding/profile')}
           className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
         >
           <ArrowLeft className="w-4 h-4" />
           Back
         </button>
 
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-6"
         >
           <div>
             <h1 className="text-2xl font-serif text-primary">Select Your Subjects</h1>
             <p className="text-muted-foreground mt-1">
               Choose the subjects you're studying this year. You can change these later.
             </p>
           </div>
 
           {/* Selection counter */}
           <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
             <span className="text-sm text-muted-foreground">
               {selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected
             </span>
             <span className="text-xs text-muted-foreground">Min: 3 • Max: 8</span>
           </div>
 
           {/* Subjects grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {AVAILABLE_SUBJECTS.map((subject, index) => {
               const isSelected = selectedSubjects.includes(subject.name);
               const Icon = subject.icon;
 
               return (
                 <motion.button
                   key={subject.name}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: index * 0.03 }}
                   onClick={() => toggleSubject(subject.name)}
                   className={`relative flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                     isSelected
                       ? 'border-secondary bg-secondary/10'
                       : 'border-border hover:border-secondary/50 bg-card'
                   }`}
                 >
                   <div className={`w-10 h-10 rounded-lg ${subject.color} flex items-center justify-center flex-shrink-0`}>
                     <Icon className="w-5 h-5 text-white" />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="font-medium text-foreground truncate">{subject.name}</p>
                     <p className="text-xs text-muted-foreground truncate">{subject.description}</p>
                   </div>
                   {isSelected && (
                     <div className="absolute top-2 right-2 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                       <Check className="w-3 h-3 text-secondary-foreground" />
                     </div>
                   )}
                 </motion.button>
               );
             })}
           </div>
 
           {/* Actions */}
           <div className="flex gap-3 pt-4 sticky bottom-6">
             <Button
               onClick={handleContinue}
               disabled={isSaving || selectedSubjects.length < 3}
               className="w-full min-h-[48px] bg-secondary hover:bg-secondary/90"
             >
               {isSaving ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 <>
                   Continue
                   <ArrowRight className="w-4 h-4 ml-2" />
                 </>
               )}
             </Button>
           </div>
 
           <p className="text-xs text-muted-foreground text-center pb-4">
             Step 2 of 4 • Subject Selection
           </p>
         </motion.div>
       </div>
     </div>
   );
 }