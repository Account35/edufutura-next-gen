import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
  const { refreshProfile } = useAuth();
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
    const uploadSteps: string[] = [];
    
    try {
      setUploading(true);
      uploadSteps.push('Starting upload process...');
      
      if (!event.target.files || event.target.files.length === 0) {
        toast.error('No file selected');
        return;
      }

      const file = event.target.files[0];
      uploadSteps.push(`File selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`Invalid file type: ${file.type}. Please select JPG, PNG, or WebP`);
        console.error('Upload validation failed:', { 
          fileName: file.name, 
          fileType: file.type, 
          steps: uploadSteps 
        });
        return;
      }
      uploadSteps.push(`✓ File type validated: ${file.type}`);

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum is 5MB`);
        console.error('Upload validation failed:', { 
          fileName: file.name, 
          fileSize: file.size, 
          steps: uploadSteps 
        });
        return;
      }
      uploadSteps.push(`✓ File size validated: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

      // Test storage bucket connection
      uploadSteps.push('Testing storage bucket connection...');
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          toast.error(`Storage connection failed: ${bucketError.message}`);
          console.error('Bucket connection test failed:', { error: bucketError, steps: uploadSteps });
          return;
        }
        
        const profileBucket = buckets?.find(b => b.name === 'profile-pictures');
        if (!profileBucket) {
          toast.error('Profile pictures bucket not found. Please contact support.');
          console.error('Bucket not found:', { availableBuckets: buckets?.map(b => b.name), steps: uploadSteps });
          return;
        }
        uploadSteps.push(`✓ Storage bucket connected: ${profileBucket.name}`);
      } catch (bucketTestError) {
        toast.error('Failed to connect to storage. Check your internet connection.');
        console.error('Storage connection error:', { error: bucketTestError, steps: uploadSteps });
        return;
      }

      uploadSteps.push('Processing image...');
      
      // Create a canvas to resize the image
      const img = new Image();
      const reader = new FileReader();

      reader.onerror = () => {
        toast.error('Failed to read image file');
        console.error('FileReader error:', { steps: uploadSteps });
        setUploading(false);
      };

      reader.onload = (e) => {
        img.src = e.target?.result as string;
        uploadSteps.push('✓ Image file read successfully');
      };

      img.onerror = () => {
        toast.error('Failed to process image. File may be corrupted.');
        console.error('Image processing error:', { steps: uploadSteps });
        setUploading(false);
      };

      img.onload = async () => {
        try {
          uploadSteps.push(`✓ Image loaded: ${img.width}x${img.height}px`);
          
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            toast.error('Canvas rendering failed. Browser may not support image processing.');
            console.error('Canvas context error:', { steps: uploadSteps });
            setUploading(false);
            return;
          }
          
          // Resize to 400x400 with center crop
          const size = 400;
          canvas.width = size;
          canvas.height = size;
          
          const scale = Math.max(size / img.width, size / img.height);
          const x = (size - img.width * scale) / 2;
          const y = (size - img.height * scale) / 2;
          
          ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          uploadSteps.push(`✓ Image resized to ${size}x${size}px`);
          
          canvas.toBlob(async (blob) => {
            if (!blob) {
              toast.error('Failed to convert image to upload format');
              console.error('Blob conversion error:', { steps: uploadSteps });
              setUploading(false);
              return;
            }
            
            uploadSteps.push(`✓ Image converted: ${(blob.size / 1024).toFixed(2)}KB`);
            
            try {
              const fileName = `${userProfile.id}-${Date.now()}.jpg`;
              uploadSteps.push(`Uploading to storage: ${fileName}...`);
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('profile-pictures')
                .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

              if (uploadError) {
                toast.error(`Upload failed: ${uploadError.message}`);
                console.error('Storage upload error:', { 
                  error: uploadError, 
                  fileName, 
                  blobSize: blob.size,
                  steps: uploadSteps 
                });
                setUploading(false);
                return;
              }
              
              uploadSteps.push(`✓ File uploaded: ${uploadData?.path}`);

              const { data: urlData } = supabase.storage
                .from('profile-pictures')
                .getPublicUrl(fileName);
              
              uploadSteps.push(`✓ Public URL generated: ${urlData.publicUrl}`);

              uploadSteps.push('Updating user profile...');
              const { error: updateError } = await supabase
                .from('users')
                .update({ profile_picture_url: urlData.publicUrl })
                .eq('id', userProfile.id);

              if (updateError) {
                toast.error(`Database update failed: ${updateError.message}`);
                console.error('Database update error:', { 
                  error: updateError, 
                  userId: userProfile.id,
                  publicUrl: urlData.publicUrl,
                  steps: uploadSteps 
                });
                setUploading(false);
                return;
              }

              uploadSteps.push('✓ Database updated successfully');
              console.log('Upload completed successfully:', { steps: uploadSteps });
              
              toast.success('Profile picture updated!');
              await refreshProfile();
            } catch (uploadProcessError) {
              toast.error('Upload process failed. Please try again.');
              console.error('Upload process error:', { 
                error: uploadProcessError, 
                steps: uploadSteps 
              });
            } finally {
              setUploading(false);
            }
          }, 'image/jpeg', 0.9);
        } catch (canvasError) {
          toast.error('Image processing failed');
          console.error('Canvas processing error:', { error: canvasError, steps: uploadSteps });
          setUploading(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Upload failed: ${errorMessage}`);
      console.error('Profile picture upload error:', { 
        error, 
        errorMessage,
        steps: uploadSteps,
        userId: userProfile.id
      });
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
      await refreshProfile();
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
