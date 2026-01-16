import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Phone } from "lucide-react";

interface PhoneRegistrationFormProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onBack: () => void;
}

export const PhoneRegistrationForm = ({
  onSuccess,
  onSwitchToLogin,
  onBack
}: PhoneRegistrationFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");

  const validatePhone = (phone: string): boolean => {
    // South African phone number validation
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      toast.error('Please enter a valid 10-digit South African phone number');
      return false;
    }
    if (!cleaned.startsWith('0')) {
      toast.error('Phone number must start with 0');
      return false;
    }
    return true;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!validatePhone(phoneNumber)) {
      return;
    }

    if (!acceptTerms) {
      toast.error("Please accept the terms and conditions");
      return;
    }

    const formattedPhone = '+27' + phoneNumber.replace(/\D/g, '').slice(1);

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This phone number is already registered. Please log in instead.');
        } else {
          toast.error(error.message || 'Failed to send verification code');
        }
        throw error;
      }

      setStep("otp");
      toast.success('Verification code sent to your phone number');
    } catch (error) {
      console.error('Error sending OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    const formattedPhone = '+27' + phoneNumber.replace(/\D/g, '').slice(1);

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otpCode,
        type: 'sms'
      });

      if (error) {
        toast.error('Invalid verification code. Please try again.');
        throw error;
      }

      toast.success('Account created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error verifying OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const formattedPhone = '+27' + phoneNumber.replace(/\D/g, '').slice(1);

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        toast.error('Failed to resend code');
        throw error;
      }

      toast.success('New verification code sent');
    } catch (error) {
      console.error('Error resending OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setStep("phone")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto">
            <Phone className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Verify Your Phone</h3>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to +27{phoneNumber.slice(1)}
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            disabled={isLoading || otpCode.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Create Account"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{" "}
            <button
              type="button"
              onClick={handleResendOTP}
              className="text-secondary hover:text-secondary/80 font-semibold"
              disabled={isLoading}
            >
              Resend
            </button>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to options
      </button>

      <form onSubmit={handleSendOTP} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="flex gap-2">
            <div className="flex items-center justify-center px-3 bg-muted rounded-md border border-input text-sm">
              +27
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="0XX XXX XXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="flex-1"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter your South African mobile number
          </p>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="terms"
            checked={acceptTerms}
            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
          />
          <label
            htmlFor="terms"
            className="text-sm text-muted-foreground leading-tight"
          >
            I agree to the Terms of Service and Privacy Policy
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending Code...
            </>
          ) : (
            "Send Verification Code"
          )}
        </Button>
      </form>

      <div className="text-center pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="text-secondary hover:text-secondary/80 font-semibold transition-colors"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};
