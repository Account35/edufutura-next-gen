import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Eye, Pin, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: {
    id: string;
    post_title: string;
    post_content: string;
    created_at: string;
    reply_count: number;
    view_count: number;
    is_pinned: boolean;
    tags: string[];
    user_id: string;
    users: {
      full_name: string;
      profile_picture_url: string | null;
      grade_level: number | null;
    };
  };
  forumSubject: string;
}

export function PostCard({ post, forumSubject }: PostCardProps) {
  const navigate = useNavigate();

  const hasSolution = false; // TODO: Check if any reply has is_solution = true
  const excerpt = post.post_content.replace(/<[^>]*>/g, '').slice(0, 150) + '...';
  const authorInitials = post.users.full_name.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleClick = () => {
    navigate(`/community/forums/${encodeURIComponent(forumSubject)}/post/${post.id}`);
  };

  const borderColor = post.is_pinned 
    ? 'border-l-secondary' 
    : hasSolution 
    ? 'border-l-accent' 
    : 'border-l-border';

  return (
    <Card 
      className={`p-4 hover:bg-accent/5 transition-all duration-200 cursor-pointer border-l-4 ${borderColor}`}
      onClick={handleClick}
    >
      <div className="flex gap-4">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarImage src={post.users.profile_picture_url || undefined} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {authorInitials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            {post.is_pinned && (
              <Pin className="w-4 h-4 text-secondary flex-shrink-0 mt-1" />
            )}
            <h3 className="font-semibold text-lg text-primary hover:text-secondary transition-colors line-clamp-2">
              {post.post_title}
            </h3>
            {hasSolution && (
              <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="font-medium">{post.users.full_name}</span>
            {post.users.grade_level && (
              <>
                <span>•</span>
                <span>Grade {post.users.grade_level}</span>
              </>
            )}
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>

          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {excerpt}
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{post.reply_count} replies</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{post.view_count} views</span>
              </div>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {post.tags.slice(0, 3).map((tag, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className="text-xs bg-secondary/20 text-secondary hover:bg-secondary/30"
                  >
                    {tag}
                  </Badge>
                ))}
                {post.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{post.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
