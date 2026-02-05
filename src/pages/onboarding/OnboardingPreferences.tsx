 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Label } from '@/components/ui/label';
 import { Slider } from '@/components/ui/slider';
 import { Checkbox } from '@/components/ui/checkbox';
 import { useAuth } from '@/hooks/useAuth';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { ArrowLeft, ArrowRight, Loader2, Eye, Headphones, BookOpen, Hand } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 interface LearningStyle {
   value: string;
   label: string;
   description: string;
   icon: React.ElementType;
 }
 
 const LEARNING_STYLES: LearningStyle[] = [
   { value: 'visual', label: 'Visual', description: 'I learn best with diagrams, images, and videos', icon: Eye },
   { value: 'auditory', label: 'Auditory', description: 'I prefer listening and discussions', icon: Headphones },
   { value: 'reading', label: 'Reading/Writing', description: 'I like detailed notes and written explanations', icon: BookOpen },
   { value: 'kinesthetic', label: 'Kinesthetic', description: 'I learn by doing and hands-on practice', icon: Hand },
 ];
 
 const STUDY_PACES = [
   { value: 'relaxed', label: 'Relaxed', description: 'I like to take my time - 30 minutes per day' },
   { value: 'moderate', label: 'Moderate', description: 'Balanced approach - 1 hour per day' },
   { value: 'intensive', label: 'Intensive', description: 'I\'m preparing for exams - 2+ hours per day' },
 ];
 
 const STUDY_GOALS = [
   { value: 'pass_matric', label: 'Pass matric exams with 50%+ average' },
   { value: 'distinctions', label: 'Achieve distinctions (80%+)' },
   { value: 'university', label: 'Get into university' },
   { value: 'improve_subject', label: 'Improve in specific subjects' },
   { value: 'own_pace', label: 'Learn at my own pace' },
 ];
 
 export default function OnboardingPreferences() {
   const navigate = useNavigate();
   const { user, userProfile, loading } = useAuth();
 
   const [learningStyle, setLearningStyle] = useState<string>('');
   const [studyPace, setStudyPace] = useState<string>('moderate');
   const [dailyMinutes, setDailyMinutes] = useState<number>(60);
   const [studyGoals, setStudyGoals] = useState<string[]>([]);
   const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
   const [isSaving, setIsSaving] = useState(false);
 
   useEffect(() => {
     if (!loading && !user) {
       navigate('/');
       return;
     }
 
     if (userProfile?.onboarding_completed) {
       navigate('/dashboard');
     }
   }, [user, userProfile, loading, navigate]);
 
   const toggleGoal = (goal: string) => {
     setStudyGoals((prev) =>
       prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
     );
   };
 
   const toggleTime = (time: string) => {
     setPreferredTimes((prev) =>
       prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time]
     );
   };
 
   const handleContinue = async () => {
     if (!user) return;
 
     if (!learningStyle) {
       toast.error('Please select your learning style');
       return;
     }
 
     setIsSaving(true);
     try {
       // Upsert study preferences
       const { error: prefError } = await supabase
         .from('study_preferences')
         .upsert(
           {
             user_id: user.id,
             learning_style: learningStyle,
             study_pace: studyPace,
             daily_goal_minutes: dailyMinutes,
             preferred_study_time: preferredTimes.length > 0 ? preferredTimes.join(',') : null,
             study_reminders_enabled: true,
           },
           { onConflict: 'user_id' }
         );
 
       if (prefError) throw prefError;
 
       // Update user onboarding step
       const { error: userError } = await supabase
         .from('users')
         .update({ onboarding_step: 4 })
         .eq('id', user.id);
 
       if (userError) throw userError;
 
       navigate('/onboarding/complete');
     } catch (error) {
       console.error('Save error:', error);
       toast.error('Failed to save preferences');
     } finally {
       setIsSaving(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Progress bar */}
       <div className="w-full bg-muted h-1">
         <div className="bg-secondary h-1 w-3/4 transition-all" />
       </div>
 
       <div className="flex-1 p-6 max-w-lg mx-auto w-full overflow-y-auto">
         {/* Back button */}
         <button
           onClick={() => navigate('/onboarding/subjects')}
           className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
         >
           <ArrowLeft className="w-4 h-4" />
           Back
         </button>
 
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="space-y-8"
         >
           <div>
             <h1 className="text-2xl font-serif text-primary">How Do You Learn Best?</h1>
             <p className="text-muted-foreground mt-1">
               Help us personalize your learning experience
             </p>
           </div>
 
           {/* Learning Style */}
           <div className="space-y-3">
             <Label className="text-foreground font-medium">
               Learning Style <span className="text-destructive">*</span>
             </Label>
             <div className="grid grid-cols-1 gap-3">
               {LEARNING_STYLES.map((style) => {
                 const isSelected = learningStyle === style.value;
                 const Icon = style.icon;
 
                 return (
                   <button
                     key={style.value}
                     onClick={() => setLearningStyle(style.value)}
                     className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                       isSelected
                         ? 'border-secondary bg-secondary/10'
                         : 'border-border hover:border-secondary/50'
                     }`}
                   >
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                       isSelected ? 'bg-secondary' : 'bg-muted'
                     }`}>
                       <Icon className={`w-5 h-5 ${isSelected ? 'text-secondary-foreground' : 'text-muted-foreground'}`} />
                     </div>
                     <div>
                       <p className="font-medium text-foreground">{style.label}</p>
                       <p className="text-xs text-muted-foreground">{style.description}</p>
                     </div>
                   </button>
                 );
               })}
             </div>
           </div>
 
           {/* Study Pace */}
           <div className="space-y-3">
             <Label className="text-foreground font-medium">Study Pace</Label>
             <div className="space-y-2">
               {STUDY_PACES.map((pace) => (
                 <button
                   key={pace.value}
                   onClick={() => setStudyPace(pace.value)}
                   className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                     studyPace === pace.value
                       ? 'border-secondary bg-secondary/10'
                       : 'border-border hover:border-secondary/50'
                   }`}
                 >
                   <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                     studyPace === pace.value ? 'border-secondary' : 'border-muted-foreground'
                   }`}>
                     {studyPace === pace.value && (
                       <div className="w-2 h-2 rounded-full bg-secondary" />
                     )}
                   </div>
                   <div>
                     <p className="font-medium text-foreground text-sm">{pace.label}</p>
                     <p className="text-xs text-muted-foreground">{pace.description}</p>
                   </div>
                 </button>
               ))}
             </div>
           </div>
 
           {/* Daily Time Commitment */}
           <div className="space-y-3">
             <Label className="text-foreground font-medium">Daily Study Time</Label>
             <div className="px-2">
               <Slider
                 value={[dailyMinutes]}
                 onValueChange={(v) => setDailyMinutes(v[0])}
                 min={15}
                 max={180}
                 step={15}
                 className="w-full"
               />
               <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                 <span>15 min</span>
                 <span className="font-medium text-foreground">
                   {dailyMinutes >= 60
                     ? `${Math.floor(dailyMinutes / 60)}h ${dailyMinutes % 60 ? `${dailyMinutes % 60}m` : ''}`
                     : `${dailyMinutes} min`}
                 </span>
                 <span>3 hours</span>
               </div>
             </div>
           </div>
 
           {/* Study Goals */}
           <div className="space-y-3">
             <Label className="text-foreground font-medium">What are your goals?</Label>
             <div className="space-y-2">
               {STUDY_GOALS.map((goal) => (
                 <label
                   key={goal.value}
                   className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-secondary/50 cursor-pointer transition-all"
                 >
                   <Checkbox
                     checked={studyGoals.includes(goal.value)}
                     onCheckedChange={() => toggleGoal(goal.value)}
                   />
                   <span className="text-sm text-foreground">{goal.label}</span>
                 </label>
               ))}
             </div>
           </div>
 
           {/* Preferred Study Times */}
           <div className="space-y-3">
             <Label className="text-foreground font-medium">When do you prefer to study?</Label>
             <div className="flex flex-wrap gap-2">
               {['morning', 'afternoon', 'evening'].map((time) => (
                 <button
                   key={time}
                   onClick={() => toggleTime(time)}
                   className={`px-4 py-2 rounded-full text-sm border-2 transition-all capitalize ${
                     preferredTimes.includes(time)
                       ? 'border-secondary bg-secondary text-secondary-foreground'
                       : 'border-border hover:border-secondary/50 text-foreground'
                   }`}
                 >
                   {time}
                 </button>
               ))}
             </div>
           </div>
 
           {/* Actions */}
           <div className="flex gap-3 pt-4">
             <Button
               variant="outline"
               onClick={() => navigate('/onboarding/complete')}
               className="flex-1 min-h-[48px]"
             >
               Skip
             </Button>
             <Button
               onClick={handleContinue}
               disabled={isSaving || !learningStyle}
               className="flex-1 min-h-[48px] bg-secondary hover:bg-secondary/90"
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
 
            <p className="text-xs text-muted-foreground text-center pb-6">
              Step 3 of 4 • Preferences
           </p>
         </motion.div>
       </div>
     </div>
   );
 }