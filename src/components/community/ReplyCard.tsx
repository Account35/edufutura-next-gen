import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ReplyForm } from './ReplyForm';
import { ThumbsUp, MessageSquare, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';

interface ReplyCardProps {
  reply: {
    id: string;
    reply_content: string;
    created_at: string;
    upvotes: number;
    is_solution: boolean;
    user_id: string;
    users: {
      full_name: string;
      profile_picture_url: string | null;
      grade_level: number | null;
    };
  };
  postId: string;
  postAuthorId: string;
  childReplies?: any[];
  onReplyAdded: () => void;
  depth?: number;
}

export function ReplyCard({ 
  reply, 
  postId, 
  postAuthorId, 
  childReplies = [], 
  onReplyAdded,
  depth = 0 
}: ReplyCardProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showChildren, setShowChildren] = useState(true);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(reply.upvotes);

  const authorInitials = reply.users.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  const sanitizedContent = DOMPurify.sanitize(reply.reply_content);
  const isPostAuthor = user?.id === postAuthorId;
  const maxDepth = 3;

  const handleUpvote = async () => {
    if (!user) {
      toast.error('Please login to upvote');
      return;
    }

    try {
      if (hasUpvoted) {
        await supabase
          .from('reply_upvotes')
          .delete()
          .eq('reply_id', reply.id)
          .eq('user_id', user.id);
        
        setUpvoteCount(prev => prev - 1);
        setHasUpvoted(false);
      } else {
        await supabase
          .from('reply_upvotes')
          .insert({ reply_id: reply.id, user_id: user.id });
        
        setUpvoteCount(prev => prev + 1);
        setHasUpvoted(true);
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
      toast.error('Failed to update vote');
    }
  };

  const handleMarkSolution = async () => {
    try {
      // First, unmark all other solutions
      await supabase
        .from('post_replies')
        .update({ is_solution: false })
        .eq('post_id', postId);

      // Mark this reply as solution
      await supabase
        .from('post_replies')
        .update({ is_solution: true })
        .eq('id', reply.id);

      toast.success('Marked as solution!');
      onReplyAdded();
    } catch (error) {
      console.error('Error marking solution:', error);
      toast.error('Failed to mark as solution');
    }
  };

  const borderClass = reply.is_solution 
    ? 'border-l-4 border-l-green-500 bg-green-50/50' 
    : depth > 0 
    ? 'border-l-2 border-l-border ml-8' 
    : '';

  if (depth >= maxDepth) {
    return null;
  }

  return (
    <>
      <Card className={`p-4 ${borderClass}`}>
        <div className="flex gap-4">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarImage src={reply.users.profile_picture_url || undefined} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {authorInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-primary">{reply.users.full_name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {reply.users.grade_level && (
                    <>
                      <span>Grade {reply.users.grade_level}</span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              {reply.is_solution && (
                <Badge className="bg-accent text-accent-foreground">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Solution
                </Badge>
              )}
            </div>

            <div 
              className="prose prose-sm max-w-none mb-4"
              dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            />

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpvote}
                className={hasUpvoted ? 'text-secondary' : ''}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                {upvoteCount}
              </Button>

              {depth < maxDepth - 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Reply
                </Button>
              )}

              {isPostAuthor && !reply.is_solution && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkSolution}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Mark as Solution
                </Button>
              )}

              {childReplies.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChildren(!showChildren)}
                >
                  {showChildren ? (
                    <ChevronUp className="w-4 h-4 mr-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-1" />
                  )}
                  {childReplies.length} {childReplies.length === 1 ? 'reply' : 'replies'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {showReplyForm && (
        <div className="ml-12 mt-2">
          <ReplyForm 
            postId={postId}
            parentReplyId={reply.id}
            onReplyAdded={() => {
              onReplyAdded();
              setShowReplyForm(false);
            }}
            placeholder={`Replying to ${reply.users.full_name}...`}
          />
        </div>
      )}

      {showChildren && childReplies.length > 0 && (
        <div className="space-y-2 mt-2">
          {childReplies.map((childReply) => (
            <ReplyCard
              key={childReply.id}
              reply={childReply}
              postId={postId}
              postAuthorId={postAuthorId}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}
