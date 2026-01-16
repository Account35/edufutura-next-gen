import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const registrationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string()
    .min(2, "Full name must be at least 2 characters")
    .regex(/^[a-zA-Z\s]+$/, "Full name should only contain letters and spaces")
    .refine((val) => val.trim().split(/\s+/).length >= 2, {
      message: "Please enter your first and last name"
    }),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and conditions"
  }),
  marketingEmails: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface EmailRegistrationFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const EmailRegistrationForm = ({ onSuccess, onSwitchToLogin }: EmailRegistrationFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { refreshProfile } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors }
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      acceptTerms: false,
      marketingEmails: false
    }
  });

  const password = watch("password", "");

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: "", color: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: "Weak", color: "bg-red-500" };
    if (strength === 3) return { strength, label: "Medium", color: "bg-yellow-500" };
    return { strength, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength();

  const onSubmit = async (data: RegistrationFormData) => {
    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: data.fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            variant: "destructive",
            title: "Email already registered",
            description: "This email is already in use. Please try logging in instead."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Registration failed",
            description: error.message
          });
        }
        return;
      }

      // Create user profile in database
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: data.email,
            full_name: data.fullName,
            onboarding_completed: false,
            email_verified: false
          });

        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't fail registration if profile creation fails, but log it
        }
      }

      toast({
        title: "Account created successfully!",
        description: "Your account has been created and you're now logged in. Complete your profile in the onboarding wizard.",
      });

      // Refresh profile to ensure it's loaded with the new user data
      await refreshProfile();

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
      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground">Email Address</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="your.email@example.com"
          {...register("email")}
          className={errors.email ? "border-red-500 min-h-[44px]" : "min-h-[44px]"}
        />
        {errors.email && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Full name field */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-foreground">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="John Doe"
          {...register("fullName")}
          className={errors.fullName ? "border-red-500 min-h-[44px]" : "min-h-[44px]"}
        />
        {errors.fullName && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" />
            {errors.fullName.message}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("password")}
            className={errors.password ? "border-red-500 pr-10 min-h-[44px]" : "pr-10 min-h-[44px]"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {password && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${passwordStrength.color} transition-all duration-300`}
                  style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
            </div>
          </div>
        )}
        {errors.password && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm password field */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-foreground">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            className={errors.confirmPassword ? "border-red-500 pr-10 min-h-[44px]" : "pr-10 min-h-[44px]"}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <X className="w-3 h-3" />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Terms checkbox */}
      <div className="flex items-start space-x-2">
        <Controller
          name="acceptTerms"
          control={control}
          render={({ field }) => (
            <Checkbox 
              id="acceptTerms"
              checked={field.value}
              onCheckedChange={field.onChange}
              className={errors.acceptTerms ? "border-red-500" : ""}
            />
          )}
        />
        <label htmlFor="acceptTerms" className="text-sm text-muted-foreground leading-tight">
          I accept the <a href="#" className="text-secondary hover:underline">Terms of Service</a> and{" "}
          <a href="#" className="text-secondary hover:underline">Privacy Policy</a>
        </label>
      </div>
      {errors.acceptTerms && (
        <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
      )}

      {/* Marketing checkbox */}
      <div className="flex items-start space-x-2">
        <Controller
          name="marketingEmails"
          control={control}
          render={({ field }) => (
            <Checkbox 
              id="marketingEmails"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <label htmlFor="marketingEmails" className="text-sm text-muted-foreground leading-tight">
          Send me study tips, curriculum updates, and motivational content (optional)
        </label>
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
            Creating Account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      {/* Switch to login */}
      <div className="text-center pt-2">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
          >
            Log in
          </button>
        </p>
      </div>
    </form>
  );
};
