 import { useState, useEffect } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Textarea } from '@/components/ui/textarea';
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/select';
 import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
 import { useAuth } from '@/hooks/useAuth';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { ArrowLeft, ArrowRight, Camera, Loader2 } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 const SA_PROVINCES = [
   'Eastern Cape',
   'Free State',
   'Gauteng',
   'KwaZulu-Natal',
   'Limpopo',
   'Mpumalanga',
   'Northern Cape',
   'North West',
   'Western Cape',
 ];
 
 const GRADES = [
   { value: '6', label: 'Grade 6' },
   { value: '7', label: 'Grade 7' },
   { value: '8', label: 'Grade 8' },
   { value: '9', label: 'Grade 9' },
   { value: '10', label: 'Grade 10' },
   { value: '11', label: 'Grade 11' },
   { value: '12', label: 'Grade 12 (Matric)' },
 ];
 
 export default function OnboardingProfile() {
   const navigate = useNavigate();
   const { user, userProfile, loading, refreshProfile } = useAuth();
 
   const [profilePicture, setProfilePicture] = useState<string | null>(null);
   const [gradeLevel, setGradeLevel] = useState<string>('');
   const [province, setProvince] = useState<string>('');
   const [bio, setBio] = useState('');
   const [isUploading, setIsUploading] = useState(false);
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
 
     // Pre-fill existing data
     if (userProfile) {
       if (userProfile.grade_level) setGradeLevel(String(userProfile.grade_level));
       if (userProfile.province) setProvince(userProfile.province);
       if (userProfile.profile_picture_url) setProfilePicture(userProfile.profile_picture_url);
     }
   }, [user, userProfile, loading, navigate]);
 
   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !user) return;
 
     if (file.size > 5 * 1024 * 1024) {
       toast.error('Image must be less than 5MB');
       return;
     }
 
     if (!file.type.startsWith('image/')) {
       toast.error('Please upload an image file');
       return;
     }
 
     setIsUploading(true);
     try {
       const fileExt = file.name.split('.').pop();
       const filePath = `${user.id}/avatar.${fileExt}`;
 
       const { error: uploadError } = await supabase.storage
         .from('profile-pictures')
         .upload(filePath, file, { upsert: true });
 
       if (uploadError) throw uploadError;
 
       const { data: urlData } = supabase.storage
         .from('profile-pictures')
         .getPublicUrl(filePath);
 
       setProfilePicture(urlData.publicUrl);
       toast.success('Photo uploaded!');
     } catch (error) {
       console.error('Upload error:', error);
       toast.error('Failed to upload photo');
     } finally {
       setIsUploading(false);
     }
   };
 
   const handleContinue = async () => {
     if (!user) return;
 
     if (!gradeLevel) {
       toast.error('Please select your grade level');
       return;
     }
 
     setIsSaving(true);
     try {
       const { error } = await supabase
         .from('users')
         .update({
            grade_level: parseInt(gradeLevel),
            province: province || null,
            profile_picture_url: profilePicture,
            onboarding_step: 2,
         })
         .eq('id', user.id);
 
        if (error) throw error;

        await refreshProfile();
        navigate('/onboarding/subjects');
     } catch (error) {
       console.error('Save error:', error);
       toast.error('Failed to save profile');
     } finally {
       setIsSaving(false);
     }
   };
 
   const getInitials = () => {
     return userProfile?.full_name
       ?.split(' ')
       .map((n) => n[0])
       .join('')
       .toUpperCase()
       .slice(0, 2) || 'ST';
   };
 
   return (
     <div className="min-h-screen bg-background flex flex-col">
       {/* Progress bar */}
       <div className="w-full bg-muted h-1">
         <div className="bg-secondary h-1 w-1/4 transition-all" />
       </div>
 
       <div className="flex-1 p-6 max-w-lg mx-auto w-full">
         {/* Back button */}
         <button
           onClick={() => navigate('/onboarding/welcome')}
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
             <h1 className="text-2xl font-serif text-primary">Set Up Your Profile</h1>
             <p className="text-muted-foreground mt-1">
               Tell us about yourself so we can personalize your experience
             </p>
           </div>
 
           {/* Profile Photo */}
           <div className="flex flex-col items-center gap-4">
             <div className="relative">
               <Avatar className="w-24 h-24 border-2 border-secondary">
                 <AvatarImage src={profilePicture || undefined} />
                 <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                   {getInitials()}
                 </AvatarFallback>
               </Avatar>
               <label
                 htmlFor="photo-upload"
                 className="absolute -bottom-1 -right-1 w-8 h-8 bg-secondary rounded-full flex items-center justify-center cursor-pointer hover:bg-secondary/80"
               >
                 {isUploading ? (
                   <Loader2 className="w-4 h-4 animate-spin text-secondary-foreground" />
                 ) : (
                   <Camera className="w-4 h-4 text-secondary-foreground" />
                 )}
               </label>
               <input
                 id="photo-upload"
                 type="file"
                 accept="image/*"
                 className="hidden"
                 onChange={handleImageUpload}
                 disabled={isUploading}
               />
             </div>
             <p className="text-xs text-muted-foreground">Add a photo (optional)</p>
           </div>
 
           {/* Grade Level - Required */}
           <div className="space-y-2">
             <Label htmlFor="grade" className="text-foreground">
               What grade are you in? <span className="text-destructive">*</span>
             </Label>
             <Select value={gradeLevel} onValueChange={setGradeLevel}>
               <SelectTrigger className="min-h-[48px]">
                 <SelectValue placeholder="Select your grade" />
               </SelectTrigger>
               <SelectContent>
                 {GRADES.map((grade) => (
                   <SelectItem key={grade.value} value={grade.value}>
                     {grade.label}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Province - Optional */}
           <div className="space-y-2">
             <Label htmlFor="province" className="text-foreground">
               Which province are you from?
             </Label>
             <Select value={province} onValueChange={setProvince}>
               <SelectTrigger className="min-h-[48px]">
                 <SelectValue placeholder="Select your province (optional)" />
               </SelectTrigger>
               <SelectContent>
                 {SA_PROVINCES.map((prov) => (
                   <SelectItem key={prov} value={prov}>
                     {prov}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>
 
           {/* Bio - Optional */}
           <div className="space-y-2">
             <Label htmlFor="bio" className="text-foreground">
               Tell us about yourself
             </Label>
             <Textarea
               id="bio"
               placeholder="I'm passionate about science and want to become a doctor..."
               value={bio}
               onChange={(e) => setBio(e.target.value.slice(0, 500))}
               className="min-h-[100px] resize-none"
             />
             <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
           </div>
 
           {/* Actions */}
           <div className="flex gap-3 pt-4">
             <Button
               variant="outline"
               onClick={() => navigate('/onboarding/subjects')}
               className="flex-1 min-h-[48px]"
             >
               Skip for Now
             </Button>
             <Button
               onClick={handleContinue}
               disabled={isSaving || !gradeLevel}
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
 
            <p className="text-xs text-muted-foreground text-center">
              Step 1 of 4 • Profile
           </p>
         </motion.div>
       </div>
     </div>
   );
 }