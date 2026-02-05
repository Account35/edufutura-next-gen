 import { useState, useEffect } from 'react';
 import { useNavigate, Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { ArrowLeft, Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 export default function ResetPassword() {
   const navigate = useNavigate();
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [isSuccess, setIsSuccess] = useState(false);
   const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
 
   useEffect(() => {
     // Check if we have a valid session from the reset link
     const checkSession = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       // If there's a recovery session, the token is valid
       if (session) {
         setIsValidToken(true);
       } else {
         // Check URL for error
         const hash = window.location.hash;
         if (hash.includes('error=')) {
           setIsValidToken(false);
         } else {
           // Give Supabase a moment to process the token
           setTimeout(async () => {
             const { data: { session: retrySession } } = await supabase.auth.getSession();
             setIsValidToken(!!retrySession);
           }, 1000);
         }
       }
     };
 
     checkSession();
   }, []);
 
   const getPasswordStrength = () => {
     if (!password) return { strength: 0, label: '', color: '' };
 
     let strength = 0;
     if (password.length >= 10) strength++;
     if (/[A-Z]/.test(password)) strength++;
     if (/[a-z]/.test(password)) strength++;
     if (/[0-9]/.test(password)) strength++;
     if (/[^A-Za-z0-9]/.test(password)) strength++;
 
      if (strength <= 2) return { strength, label: 'Weak', color: 'bg-destructive' };
      if (strength === 3) return { strength, label: 'Medium', color: 'bg-secondary/70' };
      return { strength, label: 'Strong', color: 'bg-secondary' };
   };
 
   const passwordStrength = getPasswordStrength();
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (password.length < 10) {
       toast.error('Password must be at least 10 characters');
       return;
     }
 
     if (password !== confirmPassword) {
       toast.error('Passwords do not match');
       return;
     }
 
     setIsLoading(true);
     try {
       const { error } = await supabase.auth.updateUser({ password });
 
       if (error) throw error;
 
       // Sign out to force re-login with new password
       await supabase.auth.signOut();
 
       setIsSuccess(true);
       toast.success('Password reset successfully!');
     } catch (error: any) {
       toast.error(error.message || 'Failed to reset password');
     } finally {
       setIsLoading(false);
     }
   };
 
   // Invalid token state
   if (isValidToken === false) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center p-6">
         <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           className="w-full max-w-md text-center space-y-6"
         >
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
           </div>
 
           <div>
             <h1 className="text-2xl font-serif text-primary">Invalid or Expired Link</h1>
             <p className="text-muted-foreground mt-2">
               This password reset link is invalid or has expired. Please request a new one.
             </p>
           </div>
 
           <Link to="/auth/forgot-password">
             <Button className="w-full min-h-[48px] bg-secondary hover:bg-secondary/90">
               Request New Link
             </Button>
           </Link>
         </motion.div>
       </div>
     );
   }
 
   // Success state
   if (isSuccess) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center p-6">
         <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="w-full max-w-md text-center space-y-6"
         >
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-secondary" />
           </div>
 
           <div>
             <h1 className="text-2xl font-serif text-primary">Password Reset!</h1>
             <p className="text-muted-foreground mt-2">
               Your password has been successfully reset. You can now log in with your new password.
             </p>
           </div>
 
           <Button
             onClick={() => navigate('/')}
             className="w-full min-h-[48px] bg-secondary hover:bg-secondary/90"
           >
             Go to Login
           </Button>
         </motion.div>
       </div>
     );
   }
 
   // Loading/checking token state
   if (isValidToken === null) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center">
         <Loader2 className="w-8 h-8 animate-spin text-secondary" />
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-6">
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="w-full max-w-md space-y-6"
       >
         <div className="text-center space-y-2">
           <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
             <Lock className="w-8 h-8 text-secondary" />
           </div>
           <h1 className="text-2xl font-serif text-primary">Create New Password</h1>
           <p className="text-muted-foreground">
             Choose a strong password for your account
           </p>
         </div>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="password">New Password</Label>
             <div className="relative">
               <Input
                 id="password"
                 type={showPassword ? 'text' : 'password'}
                 autoComplete="new-password"
                 placeholder="••••••••••"
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="min-h-[48px] pr-10"
                 required
               />
               <button
                 type="button"
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
               >
                 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
               </button>
             </div>
             {password && (
               <div className="space-y-1">
                 <div className="flex items-center gap-2">
                   <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                     <div
                       className={`h-full ${passwordStrength.color} transition-all`}
                       style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                     />
                   </div>
                   <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                 </div>
               </div>
             )}
             <p className="text-xs text-muted-foreground">
               At least 10 characters, including uppercase, lowercase, and numbers
             </p>
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="confirmPassword">Confirm Password</Label>
             <Input
               id="confirmPassword"
               type="password"
               autoComplete="new-password"
               placeholder="••••••••••"
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
               className="min-h-[48px]"
               required
             />
             {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
             )}
           </div>
 
           <Button
             type="submit"
             disabled={isLoading || password.length < 10 || password !== confirmPassword}
             className="w-full min-h-[48px] bg-secondary hover:bg-secondary/90"
           >
             {isLoading ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Resetting...
               </>
             ) : (
               'Reset Password'
             )}
           </Button>
         </form>
       </motion.div>
     </div>
   );
 }