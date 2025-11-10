import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ContentUploadFormProps {
  subjectId: string;
  onSuccess: () => void;
}

export const ContentUploadForm = ({ subjectId, onSuccess }: ContentUploadFormProps) => {
  const [loading, setLoading] = useState(false);
  const [contentType, setContentType] = useState<'rich_text' | 'pdf' | 'video' | 'mixed'>('rich_text');
  const [formData, setFormData] = useState({
    chapter_number: 1,
    chapter_title: '',
    chapter_description: '',
    content_markdown: '',
    difficulty_level: 'beginner',
    estimated_duration_minutes: 30,
    caps_code: '',
    key_concepts: '',
    videoUrl: ''
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let contentUrl = null;

      // Upload PDF if provided
      if (pdfFile && (contentType === 'pdf' || contentType === 'mixed')) {
        const fileExt = pdfFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${subjectId}/${formData.chapter_number}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('curriculum-pdfs')
          .upload(filePath, pdfFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('curriculum-pdfs')
          .getPublicUrl(filePath);

        contentUrl = urlData.publicUrl;
      }

      // Insert chapter
      const { error: insertError } = await supabase
        .from('curriculum_chapters')
        .insert({
          subject_id: subjectId,
          chapter_number: formData.chapter_number,
          chapter_title: formData.chapter_title,
          chapter_description: formData.chapter_description,
          content_markdown: formData.content_markdown,
          content_type: contentType,
          content_url: contentUrl || formData.videoUrl || null,
          difficulty_level: formData.difficulty_level,
          estimated_duration_minutes: formData.estimated_duration_minutes,
          caps_code: formData.caps_code,
          key_concepts: formData.key_concepts.split(',').map(k => k.trim()),
          created_by: user.id,
          updated_by: user.id,
          is_published: true
        });

      if (insertError) throw insertError;

      toast.success('Chapter created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error creating chapter:', error);
      toast.error(error.message || 'Failed to create chapter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="chapter_number">Chapter Number</Label>
          <Input
            id="chapter_number"
            type="number"
            min="1"
            value={formData.chapter_number}
            onChange={(e) => setFormData({ ...formData, chapter_number: parseInt(e.target.value) })}
            required
          />
        </div>

        <div>
          <Label htmlFor="content_type">Content Type</Label>
          <Select value={contentType} onValueChange={(v: any) => setContentType(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rich_text">Rich Text (Markdown)</SelectItem>
              <SelectItem value="pdf">PDF Only</SelectItem>
              <SelectItem value="video">Video Only</SelectItem>
              <SelectItem value="mixed">Mixed (Text + PDF + Video)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="chapter_title">Chapter Title</Label>
        <Input
          id="chapter_title"
          value={formData.chapter_title}
          onChange={(e) => setFormData({ ...formData, chapter_title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="chapter_description">Chapter Description</Label>
        <Textarea
          id="chapter_description"
          rows={3}
          value={formData.chapter_description}
          onChange={(e) => setFormData({ ...formData, chapter_description: e.target.value })}
        />
      </div>

      {(contentType === 'rich_text' || contentType === 'mixed') && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <Label htmlFor="content_markdown">Content (Markdown)</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
          </div>
          {previewMode ? (
            <div className="border rounded-lg p-4 prose max-w-none">
              <ReactMarkdown>{formData.content_markdown}</ReactMarkdown>
            </div>
          ) : (
            <Textarea
              id="content_markdown"
              rows={10}
              value={formData.content_markdown}
              onChange={(e) => setFormData({ ...formData, content_markdown: e.target.value })}
              placeholder="# Introduction&#10;&#10;Write your content in Markdown..."
            />
          )}
        </div>
      )}

      {(contentType === 'pdf' || contentType === 'mixed') && (
        <div>
          <Label htmlFor="pdf_file">PDF File (max 25MB)</Label>
          <Input
            id="pdf_file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      {(contentType === 'video' || contentType === 'mixed') && (
        <div>
          <Label htmlFor="video_url">Video URL (YouTube or Vimeo)</Label>
          <Input
            id="video_url"
            type="url"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="difficulty_level">Difficulty</Label>
          <Select
            value={formData.difficulty_level}
            onValueChange={(v) => setFormData({ ...formData, difficulty_level: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.estimated_duration_minutes}
            onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="caps_code">CAPS Code</Label>
          <Input
            id="caps_code"
            value={formData.caps_code}
            onChange={(e) => setFormData({ ...formData, caps_code: e.target.value })}
            placeholder="e.g., 4.2.1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="key_concepts">Key Concepts (comma separated)</Label>
        <Input
          id="key_concepts"
          value={formData.key_concepts}
          onChange={(e) => setFormData({ ...formData, key_concepts: e.target.value })}
          placeholder="algebra, equations, variables"
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        <Upload className="mr-2 h-4 w-4" />
        Create Chapter
      </Button>
    </form>
  );
};
