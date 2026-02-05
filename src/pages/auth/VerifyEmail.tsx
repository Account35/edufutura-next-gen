 import { useState, useEffect } from 'react';
 import { Link, useNavigate } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { supabase } from '@/integrations/supabase/client';
 import { useAuth } from '@/hooks/useAuth';
 import { toast } from 'sonner';
 import { Loader2, Mail, CheckCircle, RefreshCw } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 export default function VerifyEmail() {
   const navigate = useNavigate();
   const { user, userProfile } = useAuth();
   const [isResending, setIsResending] = useState(false);
   const [resendCooldown, setResendCooldown] = useState(0);
 
   useEffect(() => {
     // If user is verified, redirect
     if (user?.email_confirmed_at || userProfile?.email_verified) {
       if (userProfile?.onboarding_completed) {
         navigate('/dashboard');
       } else {
         navigate('/onboarding/welcome');
       }
     }
   }, [user, userProfile, navigate]);
 
   useEffect(() => {
     // Cooldown timer
     if (resendCooldown > 0) {
       const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
       return () => clearTimeout(timer);
     }
   }, [resendCooldown]);
 
   useEffect(() => {
     // Poll for verification status
     const interval = setInterval(async () => {
       const { data: { user: currentUser } } = await supabase.auth.getUser();
       if (currentUser?.email_confirmed_at) {
         toast.success('Email verified!');
         navigate('/onboarding/welcome');
       }
     }, 5000);
 
     return () => clearInterval(interval);
   }, [navigate]);
 
   const handleResend = async () => {
     if (!user?.email || resendCooldown > 0) return;
 
     setIsResending(true);
     try {
       const { error } = await supabase.auth.resend({
         type: 'signup',
         email: user.email,
       });
 
       if (error) throw error;
 
       toast.success('Verification email sent!');
       setResendCooldown(60);
     } catch (error: any) {
       toast.error(error.message || 'Failed to resend email');
     } finally {
       setIsResending(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-6">
       <motion.div
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="w-full max-w-md text-center space-y-6"
       >
         <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
           <Mail className="w-10 h-10 text-secondary" />
         </div>
 
         <div>
           <h1 className="text-2xl font-serif text-primary">Verify Your Email</h1>
           <p className="text-muted-foreground mt-2">
             We've sent a verification email to:
           </p>
           <p className="font-medium text-foreground mt-1">{user?.email}</p>
         </div>
 
         <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
           <p>Click the link in the email to verify your account.</p>
           <p className="mt-2">This page will automatically update once verified.</p>
         </div>
 
         <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
           <Loader2 className="w-4 h-4 animate-spin" />
           <span>Waiting for verification...</span>
         </div>
 
         <div className="space-y-3 pt-4">
           <Button
             variant="outline"
             onClick={handleResend}
             disabled={isResending || resendCooldown > 0}
             className="w-full min-h-[48px]"
           >
             {isResending ? (
               <Loader2 className="w-4 h-4 animate-spin" />
             ) : resendCooldown > 0 ? (
               `Resend in ${resendCooldown}s`
             ) : (
               <>
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Resend Verification Email
               </>
             )}
           </Button>
 
           <Link to="/">
             <Button variant="ghost" className="w-full min-h-[48px]">
               Back to Home
             </Button>
           </Link>
         </div>
 
         <p className="text-xs text-muted-foreground">
           Didn't receive the email? Check your spam folder.
         </p>
       </motion.div>
     </div>
   );
 }