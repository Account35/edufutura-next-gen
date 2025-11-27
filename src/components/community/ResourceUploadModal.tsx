import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';

interface ResourceUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const SUBJECTS = [
  'Mathematics', 'Physical Sciences', 'Life Sciences', 'English',
  'Afrikaans', 'History', 'Geography', 'Business Studies',
  'Accounting', 'Economics'
];

const RESOURCE_TYPES = [
  { value: 'Notes', label: 'Notes', description: 'Detailed study notes' },
  { value: 'Summary', label: 'Summary', description: 'Condensed overviews' },
  { value: 'Diagram', label: 'Diagram', description: 'Visual explanations' },
  { value: 'Worksheet', label: 'Worksheet', description: 'Practice exercises' },
  { value: 'Cheat Sheet', label: 'Cheat Sheet', description: 'Quick reference guides' },
  { value: 'Flashcards', label: 'Flashcards', description: 'Memorization aids' }
];

export default function ResourceUploadModal({
  open,
  onOpenChange,
  onSuccess
}: ResourceUploadModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload PDF, JPG, PNG, or DOCX files only',
          variant: 'destructive'
        });
        return;
      }

      // Validate file size (25MB for PDFs/docs, 10MB for images)
      const maxSize = selectedFile.type.startsWith('image/') ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast({
          title: 'File too large',
          description: `Maximum size is ${maxSize / (1024 * 1024)}MB`,
          variant: 'destructive'
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!title || !description || !subject || !resourceType || !file || !agreedToTerms) {
      toast({
        title: 'Missing information',
        description: 'Please fill all required fields and agree to terms',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${subject}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('shared-resources')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('shared-resources')
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert resource record
      const { error: insertError } = await supabase
        .from('shared_resources')
        .insert({
          user_id: user.id,
          resource_title: title,
          resource_description: description,
          resource_type: resourceType,
          subject_name: subject,
          file_url: publicUrl,
          file_type: file.type,
          file_size_mb: file.size / (1024 * 1024),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          moderation_status: 'pending'
        });

      if (insertError) throw insertError;

      setUploadProgress(100);

      toast({
        title: 'Resource submitted!',
        description: 'It will appear in the library once approved'
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('');
    setResourceType('');
    setFile(null);
    setTags('');
    setAgreedToTerms(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Share a Resource</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label htmlFor="title">Resource Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Chapter 5 Algebra Summary with Practice Problems"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={150}
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/150 characters</p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Explain what this resource covers and how it can help other students..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/1000 characters</p>
          </div>

          {/* Subject and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resource Type */}
          <div>
            <Label>Resource Type *</Label>
            <RadioGroup value={resourceType} onValueChange={setResourceType} className="space-y-2 mt-2">
              {RESOURCE_TYPES.map(type => (
                <div key={type.value} className="flex items-start gap-2">
                  <RadioGroupItem value={type.value} id={type.value} className="mt-1" />
                  <Label htmlFor={type.value} className="cursor-pointer">
                    <span className="font-semibold">{type.label}</span>
                    <span className="block text-xs text-gray-500">{type.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="file">File Upload *</Label>
            <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                {file ? file.name : 'Drag and drop or click to upload'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                PDF (up to 25MB), Images (up to 10MB), DOCX (up to 25MB)
              </p>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file')?.click()}
              >
                Choose File
              </Button>
            </div>
            {uploading && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-secondary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Uploading... {uploadProgress}%</p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="algebra, equations, grade-10 (comma-separated)"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          {/* Terms */}
          <div className="flex items-start gap-2 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
            />
            <Label htmlFor="terms" className="text-sm cursor-pointer">
              I confirm that I created this resource or have permission to share it, and that it is for educational use only
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !agreedToTerms}
              className="bg-secondary hover:bg-secondary/90"
            >
              {uploading ? 'Uploading...' : 'Submit Resource'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
