import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailChangeFormProps {
  currentEmail: string;
  userId: string;
}

export const EmailChangeForm = ({ currentEmail, userId }: EmailChangeFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleEmailChange = async () => {
    if (!validateEmail(newEmail)) {
      return;
    }

    if (newEmail === currentEmail) {
      toast.error('New email is the same as your current email');
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) {
        if (error.message.includes('already registered')) {
          toast.error('This email is already registered to another account');
        } else {
          toast.error('Failed to update email');
        }
        throw error;
      }

      setVerificationSent(true);
      toast.success(`Verification email sent to ${newEmail}. Please check your inbox to confirm the change.`);
      
      // Log email change attempt
      await supabase.from('user_audit_log').insert({
        user_id: userId,
        action_type: 'email_change_initiated',
        action_details: {
          old_email: currentEmail,
          new_email: newEmail,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error('Error changing email:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Address
        </CardTitle>
        <CardDescription>Update your email address (requires verification)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentEmail">Current Email</Label>
          <Input
            id="currentEmail"
            value={currentEmail}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="newEmail">New Email</Label>
          <Input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              validateEmail(e.target.value);
              setVerificationSent(false);
            }}
            onBlur={() => validateEmail(newEmail)}
            placeholder="Enter new email address"
          />
          {emailError && (
            <p className="text-sm text-red-500">{emailError}</p>
          )}
        </div>

        {verificationSent && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              Email verification pending. Please check your inbox at <strong>{newEmail}</strong> to confirm the change.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleEmailChange}
          disabled={isLoading || !newEmail || !!emailError || newEmail === currentEmail}
          className="w-full lg:w-auto"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change Email
        </Button>
      </CardContent>
    </Card>
  );
};
