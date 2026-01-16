import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DateOfBirthPicker } from '@/components/profile/DateOfBirthPicker';

interface BasicInfoStepProps {
  data: {
    full_name: string;
    date_of_birth: string;
  };
  onUpdate: (data: Partial<BasicInfoStepProps['data']>) => void;
  onNext: () => void;
}

export function BasicInfoStep({ data, onUpdate, onNext }: BasicInfoStepProps) {
  const [fullNameError, setFullNameError] = useState('');

  const validateFullName = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length < 2) {
      setFullNameError('Please enter your full name (first and last name)');
      return false;
    }
    if (!/^[a-zA-Z\s'-]+$/.test(name)) {
      setFullNameError('Name can only contain letters, spaces, hyphens, and apostrophes');
      return false;
    }
    setFullNameError('');
    return true;
  };

  const handleNext = () => {
    if (!validateFullName(data.full_name)) return;
    // Date of birth is optional for now
    onNext();
  };

  const isValid = data.full_name.trim() && !fullNameError;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Tell us about yourself</h2>
        <p className="text-muted-foreground">
          We'll use this information to personalize your learning experience
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            value={data.full_name}
            onChange={(e) => {
              onUpdate({ full_name: e.target.value });
              validateFullName(e.target.value);
            }}
            placeholder="Enter your full name"
            className={fullNameError ? 'border-destructive' : ''}
          />
          {fullNameError && (
            <p className="text-sm text-destructive">{fullNameError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <DateOfBirthPicker
            value={data.date_of_birth}
            onChange={(date) => onUpdate({ date_of_birth: date })}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!isValid}>
          Next
        </Button>
      </div>
    </div>
  );
}