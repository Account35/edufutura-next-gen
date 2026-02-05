import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  checkAccountLockout, 
  trackFailedLogin, 
  clearFailedAttempts 
} from "@/services/security.service";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

export const LoginForm = ({ onSuccess, onSwitchToRegister }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<{ isLocked: boolean; unlockAt?: Date } | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      // Check if account is locked
      const lockStatus = await checkAccountLockout(data.email);
      if (lockStatus.isLocked) {
        setLockoutInfo(lockStatus);
        toast({
          variant: "destructive",
          title: "Account temporarily locked",
          description: `Too many failed attempts. Please try again later.`
        });
        return;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

      if (error) {
        // Track failed login attempt
        const { isLocked, remainingAttempts: remaining } = await trackFailedLogin(
          data.email, 
          error.message
        );
        
        setRemainingAttempts(remaining);
        
        if (isLocked) {
          setLockoutInfo({ isLocked: true, unlockAt: new Date(Date.now() + 60 * 60 * 1000) });
          toast({
            variant: "destructive",
            title: "Account locked",
            description: "Too many failed attempts. Your account is locked for 1 hour."
          });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: `Invalid email or password. ${remaining} attempts remaining.`
          });
        } else {
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error.message
          });
        }
        return;
      }

      // Clear failed attempts on successful login
      await clearFailedAttempts(data.email);
      setRemainingAttempts(null);
      setLockoutInfo(null);

      // Update last_login timestamp
      if (authData.user) {
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authData.user.id);
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in to EduFutura.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Account Lockout Warning */}
      {lockoutInfo?.isLocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Account temporarily locked. Try again {lockoutInfo.unlockAt 
              ? `at ${lockoutInfo.unlockAt.toLocaleTimeString()}` 
              : 'in 1 hour'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Remaining Attempts Warning */}
      {remainingAttempts !== null && remainingAttempts <= 2 && !lockoutInfo?.isLocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Warning: {remainingAttempts} login attempts remaining before account lockout.
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="login-email" className="text-foreground">Email Address</Label>
        <Input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="your.email@example.com"
          {...register("email")}
          className={errors.email ? "border-destructive min-h-[44px]" : "min-h-[44px]"}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password" className="text-foreground">Password</Label>
           <a
             href="/auth/forgot-password"
            className="text-sm text-secondary hover:text-secondary/80 transition-colors"
          >
            Forgot password?
           </a>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
            className={errors.password ? "border-destructive pr-10 min-h-[44px]" : "pr-10 min-h-[44px]"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full bg-secondary hover:bg-secondary/90 text-primary font-semibold min-h-[44px]"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Logging in...
          </>
        ) : (
          "Log In"
        )}
      </Button>

      {/* Switch to register */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
          >
            Sign up
          </button>
        </p>
      </div>
    </form>
  );
};
