 import { useState } from 'react';
 import { Link } from 'react-router-dom';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react';
 import { motion } from 'framer-motion';
 
 export default function ForgotPassword() {
   const [email, setEmail] = useState('');
   const [isLoading, setIsLoading] = useState(false);
   const [isSuccess, setIsSuccess] = useState(false);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
 
     if (!email.trim()) {
       toast.error('Please enter your email address');
       return;
     }
 
     setIsLoading(true);
     try {
       const { error } = await supabase.auth.resetPasswordForEmail(email, {
         redirectTo: `${window.location.origin}/auth/reset-password`,
       });
 
       if (error) throw error;
 
       setIsSuccess(true);
     } catch (error: any) {
       // Don't reveal if email exists for security
       setIsSuccess(true);
     } finally {
       setIsLoading(false);
     }
   };
 
   if (isSuccess) {
     return (
       <div className="min-h-screen bg-background flex items-center justify-center p-6">
         <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="w-full max-w-md text-center space-y-6"
         >
           <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
             <CheckCircle className="w-8 h-8 text-green-600" />
           </div>
 
           <div>
             <h1 className="text-2xl font-serif text-primary">Check Your Email</h1>
             <p className="text-muted-foreground mt-2">
               If an account exists with <strong>{email}</strong>, you'll receive a password reset link shortly.
             </p>
           </div>
 
           <div className="space-y-3">
             <Button
               variant="outline"
               onClick={() => setIsSuccess(false)}
               className="w-full min-h-[48px]"
             >
               Try another email
             </Button>
             <Link to="/">
               <Button variant="ghost" className="w-full min-h-[48px]">
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back to home
               </Button>
             </Link>
           </div>
 
           <p className="text-xs text-muted-foreground">
             Didn't receive an email? Check your spam folder or wait a few minutes before trying again.
           </p>
         </motion.div>
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
         <Link
           to="/"
           className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
         >
           <ArrowLeft className="w-4 h-4" />
           Back to home
         </Link>
 
         <div className="text-center space-y-2">
           <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
             <Mail className="w-8 h-8 text-secondary" />
           </div>
           <h1 className="text-2xl font-serif text-primary">Reset Your Password</h1>
           <p className="text-muted-foreground">
             Enter your email and we'll send you a reset link
           </p>
         </div>
 
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-2">
             <Label htmlFor="email">Email Address</Label>
             <Input
               id="email"
               type="email"
               inputMode="email"
               autoComplete="email"
               placeholder="your.email@example.com"
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               className="min-h-[48px]"
               required
             />
           </div>
 
           <Button
             type="submit"
             disabled={isLoading}
             className="w-full min-h-[48px] bg-secondary hover:bg-secondary/90"
           >
             {isLoading ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Sending...
               </>
             ) : (
               'Send Reset Link'
             )}
           </Button>
         </form>
 
         <p className="text-center text-sm text-muted-foreground">
           Remember your password?{' '}
           <Link to="/" className="text-secondary hover:underline font-medium">
             Log in
           </Link>
         </p>
       </motion.div>
     </div>
   );
 }