import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReplyFormProps {
  postId: string;
  parentReplyId?: string | null;
  onReplyAdded: () => void;
  placeholder?: string;
}

export function ReplyForm({ 
  postId, 
  parentReplyId = null, 
  onReplyAdded,
  placeholder = "Write your reply..." 
}: ReplyFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please login to reply');
      return;
    }

    if (content.trim().length < 10) {
      toast.error('Reply must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('post_replies')
        .insert({
          post_id: postId,
          parent_reply_id: parentReplyId,
          user_id: user.id,
          reply_content: content,
          moderation_status: 'approved', // TODO: Integrate Phase 4 AI moderation
          depth_level: parentReplyId ? 1 : 0
        });

      if (error) throw error;

      toast.success('Reply posted successfully!');
      setContent('');
      onReplyAdded();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={4}
        maxLength={2000}
        className="resize-none"
      />
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {content.length} / 2000 characters
        </p>
        <Button 
          onClick={handleSubmit}
          disabled={submitting || content.trim().length < 10}
          className="bg-secondary hover:bg-secondary/90 text-white"
        >
          {submitting ? 'Posting...' : 'Post Reply'}
        </Button>
      </div>
    </div>
  );
}
