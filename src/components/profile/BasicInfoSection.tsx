import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Loader2, Eye, EyeOff } from 'lucide-react';
import { DateOfBirthPicker } from './DateOfBirthPicker';
import { PasswordChangeForm } from './PasswordChangeForm';
import { EmailChangeForm } from './EmailChangeForm';
import { PhoneChangeForm } from './PhoneChangeForm';

interface BasicInfoSectionProps {
  userProfile: any;
}

export const BasicInfoSection = ({ userProfile }: BasicInfoSectionProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState(userProfile.full_name || '');
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

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file (JPG, PNG, or WebP)');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Create a canvas to resize the image
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Resize to 400x400 with center crop
        const size = 400;
        canvas.width = size;
        canvas.height = size;
        
        const scale = Math.max(size / img.width, size / img.height);
        const x = (size - img.width * scale) / 2;
        const y = (size - img.height * scale) / 2;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        canvas.toBlob(async (blob) => {
          if (!blob) return;
          
          const fileName = `${userProfile.id}-${Date.now()}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('profile-pictures')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(fileName);

          const { error: updateError } = await supabase
            .from('users')
            .update({ profile_picture_url: urlData.publicUrl })
            .eq('id', userProfile.id);

          if (updateError) throw updateError;

          toast.success('Profile picture updated!');
          window.location.reload();
        }, 'image/jpeg', 0.9);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading picture:', error);
      toast.error('Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!validateFullName(fullName)) {
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', userProfile.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload a photo to personalize your profile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32 lg:h-40 lg:w-40 border-4 border-border shadow-lg">
                <AvatarImage src={userProfile.profile_picture_url} />
                <AvatarFallback className="text-4xl">
                  {fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="picture"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 cursor-pointer"
              >
                <div className="bg-background/90 backdrop-blur-sm text-primary font-semibold py-2 px-4 rounded-full border border-border hover:bg-background transition-colors flex items-center gap-2">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  Change Photo
                </div>
              </Label>
              <Input
                id="picture"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleProfilePictureUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              JPG, PNG or WebP. Max 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-primary font-medium">
              Full Name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                validateFullName(e.target.value);
              }}
              onBlur={() => validateFullName(fullName)}
              placeholder="Enter your full name"
              className="border-border focus:border-secondary focus:ring-secondary/20"
            />
            {fullNameError && (
              <p className="text-sm text-red-500">{fullNameError}</p>
            )}
          </div>

          <DateOfBirthPicker 
            userId={userProfile.id}
            initialValue={userProfile.date_of_birth}
          />

          <Button 
            onClick={handleSaveProfile} 
            disabled={isLoading || !!fullNameError}
            className="w-full lg:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Password Change */}
      <PasswordChangeForm />

      {/* Email Change */}
      <EmailChangeForm currentEmail={userProfile.email} userId={userProfile.id} />

      {/* Phone Change */}
      <PhoneChangeForm currentPhone={userProfile.phone_number} userId={userProfile.id} />
    </div>
  );
};
