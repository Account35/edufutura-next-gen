import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Phone, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PhoneChangeFormProps {
  currentPhone: string;
  userId: string;
}

export const PhoneChangeForm = ({ currentPhone, userId }: PhoneChangeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`;
  };

  const validatePhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length !== 10) {
      setPhoneError('Phone number must be 10 digits');
      return false;
    }
    if (!numbers.startsWith('0')) {
      setPhoneError('Phone number must start with 0');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const handlePhoneInput = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setNewPhone(formatted);
    validatePhone(formatted);
  };

  const handleSendOTP = async () => {
    if (!validatePhone(newPhone)) {
      return;
    }

    const phoneNumber = '+27' + newPhone.replace(/\D/g, '').slice(1);

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        phone: phoneNumber
      });

      if (error) {
        toast.error('Failed to send verification code');
        throw error;
      }

      setShowOTP(true);
      toast.success('Verification code sent to your new phone number');
    } catch (error) {
      console.error('Error sending OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    const phoneNumber = '+27' + newPhone.replace(/\D/g, '').slice(1);

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: 'phone_change'
      });

      if (error) {
        toast.error('Invalid verification code');
        throw error;
      }

      // Update phone in users table
      await supabase
        .from('users')
        .update({ phone_number: newPhone })
        .eq('id', userId);

      // Log phone change
      await supabase.from('user_audit_log').insert({
        user_id: userId,
        action_type: 'phone_change',
        action_details: {
          old_phone: currentPhone,
          new_phone: newPhone,
          timestamp: new Date().toISOString(),
        }
      });

      toast.success('Phone number updated successfully!');
      setShowOTP(false);
      setNewPhone('');
      setOtpCode('');
      window.location.reload();
    } catch (error) {
      console.error('Error verifying OTP:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone Number
        </CardTitle>
        <CardDescription>Update your phone number (requires OTP verification)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPhone">Current Phone</Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border">
              <span className="text-lg">🇿🇦</span>
              <span className="text-sm font-medium">+27</span>
            </div>
            <Input
              id="currentPhone"
              value={currentPhone || 'Not set'}
              disabled
              className="bg-muted flex-1"
            />
          </div>
        </div>

        {!showOTP ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="newPhone">New Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md border">
                  <span className="text-lg">🇿🇦</span>
                  <span className="text-sm font-medium">+27</span>
                </div>
                <Input
                  id="newPhone"
                  value={newPhone}
                  onChange={(e) => handlePhoneInput(e.target.value)}
                  onBlur={() => validatePhone(newPhone)}
                  placeholder="082 123 4567"
                  maxLength={12}
                  className="flex-1"
                />
              </div>
              {phoneError && (
                <p className="text-sm text-red-500">{phoneError}</p>
              )}
            </div>

            <Button
              onClick={handleSendOTP}
              disabled={isLoading || !newPhone || !!phoneError}
              className="w-full lg:w-auto"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Verification Code
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Enter Verification Code</Label>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to {newPhone}
              </p>
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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

            <div className="flex gap-2">
              <Button
                onClick={handleVerifyOTP}
                disabled={isLoading || otpCode.length !== 6}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Code
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowOTP(false);
                  setOtpCode('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
