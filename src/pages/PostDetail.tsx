import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ReplyCard } from '@/components/community/ReplyCard';
import { ReplyForm } from '@/components/community/ReplyForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Eye, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import DOMPurify from 'dompurify';

interface Post {
  id: string;
  post_title: string;
  post_content: string;
  created_at: string;
  view_count: number;
  reply_count: number;
  tags: string[];
  is_edited: boolean;
  user_id: string;
  users: {
    full_name: string;
    profile_picture_url: string | null;
    grade_level: number | null;
  };
}

interface Reply {
  id: string;
  reply_content: string;
  created_at: string;
  upvotes: number;
  is_solution: boolean;
  parent_reply_id: string | null;
  user_id: string;
  users: {
    full_name: string;
    profile_picture_url: string | null;
    grade_level: number | null;
  };
}

export default function PostDetail() {
  const { subject, postId } = useParams<{ subject: string; postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      loadPost();
      loadReplies();
      incrementViewCount();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          users(full_name, profile_picture_url, grade_level)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data as any);
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load discussion');
    } finally {
      setLoading(false);
    }
  };

  const loadReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('post_replies')
        .select(`
          *,
          users(full_name, profile_picture_url, grade_level)
        `)
        .eq('post_id', postId)
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setReplies(data as any || []);
    } catch (error) {
      console.error('Error loading replies:', error);
      toast.error('Failed to load replies');
    }
  };

  const incrementViewCount = async () => {
    try {
      // Increment view count
      const { data: currentPost } = await supabase
        .from('forum_posts')
        .select('view_count')
        .eq('id', postId)
        .single();

      if (currentPost) {
        await supabase
          .from('forum_posts')
          .update({ view_count: currentPost.view_count + 1 })
          .eq('id', postId);
      }
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!post) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
          <p className="text-muted-foreground">Discussion not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const authorInitials = post.users.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
  const sanitizedContent = DOMPurify.sanitize(post.post_content);

  // Organize replies into threads
  const topLevelReplies = replies.filter(r => !r.parent_reply_id);
  const childReplies = replies.filter(r => r.parent_reply_id);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(`/community/forums/${subject}`)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forum
        </Button>

        <div className="bg-card rounded-lg p-6 mb-6">
          <h1 className="font-display text-3xl text-primary mb-4">
            {post.post_title}
          </h1>

          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-12 h-12">
              <AvatarImage src={post.users.profile_picture_url || undefined} />
              <AvatarFallback className="bg-secondary text-white">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-primary">{post.users.full_name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {post.users.grade_level && (
                  <>
                    <span>Grade {post.users.grade_level}</span>
                    <span>•</span>
                  </>
                )}
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                {post.is_edited && (
                  <>
                    <span>•</span>
                    <span>Edited</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{post.view_count} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{post.reply_count} replies</span>
            </div>
          </div>

          <div 
            className="prose prose-sm max-w-none mb-6"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />

          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {post.tags.map((tag, idx) => (
                <Badge 
                  key={idx}
                  variant="secondary"
                  className="bg-secondary/20 text-secondary hover:bg-secondary/30"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="font-display text-2xl text-primary mb-4">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </h2>

          <div className="space-y-4">
            {topLevelReplies.map((reply) => (
              <ReplyCard
                key={reply.id}
                reply={reply}
                postId={post.id}
                postAuthorId={post.user_id}
                childReplies={childReplies.filter(r => r.parent_reply_id === reply.id)}
                onReplyAdded={loadReplies}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-primary mb-4">Add Your Reply</h3>
          <ReplyForm 
            postId={post.id}
            onReplyAdded={loadReplies}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
