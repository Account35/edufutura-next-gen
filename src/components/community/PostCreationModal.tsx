import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from './RichTextEditor';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PostCreationModalProps {
  open: boolean;
  onClose: () => void;
  forumId: string;
  forumSubject: string;
  onPostCreated: () => void;
}

export function PostCreationModal({ 
  open, 
  onClose, 
  forumId, 
  forumSubject,
  onPostCreated 
}: PostCreationModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 5) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to post');
      return;
    }

    if (title.length < 10) {
      toast.error('Title must be at least 10 characters');
      return;
    }

    if (content.length < 50) {
      toast.error('Content must be at least 50 characters');
      return;
    }

    if (tags.length === 0) {
      toast.error('Please add at least one tag');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .insert({
          forum_id: forumId,
          user_id: user.id,
          post_title: title,
          post_content: content,
          tags: tags,
          moderation_status: 'approved' // TODO: Integrate Phase 4 AI moderation
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Discussion created successfully!');
      onPostCreated();
      onClose();
      
      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create discussion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">
            Create Discussion
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            in {forumSubject} Forum
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title" className="text-primary">
              Discussion Title
            </Label>
            <Input
              id="title"
              placeholder="What do you want to discuss?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {title.length} / 200
            </p>
          </div>

          <div>
            <Label className="text-primary">Content</Label>
            <RichTextEditor 
              content={content}
              onChange={setContent}
              placeholder="Explain your question or topic in detail. Include any relevant information that helps others understand and assist you."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 50 characters
            </p>
          </div>

          <div>
            <Label htmlFor="tags" className="text-primary">
              Tags (up to 5)
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="tags"
                placeholder="Add tags (press Enter or comma)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={tags.length >= 5}
              />
              <Button 
                type="button"
                onClick={handleAddTag}
                disabled={tags.length >= 5}
                variant="secondary"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag, idx) => (
                  <Badge 
                    key={idx}
                    className="bg-secondary text-white hover:bg-secondary/90 cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-primary mb-2">
              Community Guidelines
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Be respectful and helpful</li>
              <li>• Stay on topic</li>
              <li>• No homework copying</li>
              <li>• Cite your sources</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={submitting || title.length < 10 || content.length < 50 || tags.length === 0}
            className="bg-secondary hover:bg-secondary/90 text-white"
          >
            {submitting ? 'Creating...' : 'Create Discussion'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
