import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import * as LucideIcons from 'lucide-react';

interface ForumCardProps {
  forum: {
    id: string;
    subject_name: string;
    forum_title: string;
    forum_description: string | null;
    icon_name: string | null;
    color_theme: string | null;
    post_count: number;
    member_count: number;
    updated_at: string;
  };
}

export function ForumCard({ forum }: ForumCardProps) {
  const navigate = useNavigate();

  // Get icon component dynamically
  const IconComponent = forum.icon_name 
    ? (LucideIcons as any)[forum.icon_name] || LucideIcons.MessageSquare
    : LucideIcons.MessageSquare;

  const handleEnterForum = () => {
    navigate(`/community/forums/${encodeURIComponent(forum.subject_name)}`);
  };

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer"
      style={{ borderLeftColor: forum.color_theme || '#D4AF37', borderLeftWidth: '4px' }}
      onClick={handleEnterForum}
    >
      <div className="p-6">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: `${forum.color_theme || '#D4AF37'}20` }}
        >
          <IconComponent 
            className="w-8 h-8"
            style={{ color: forum.color_theme || '#D4AF37' }}
          />
        </div>

        <h3 className="font-display text-2xl text-primary mb-2 group-hover:text-secondary transition-colors">
          {forum.forum_title}
        </h3>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {forum.forum_description || `Discuss ${forum.subject_name} topics, share solutions, and ask questions`}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            <span>{forum.post_count.toLocaleString()} discussions</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{forum.member_count.toLocaleString()} members</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
          <Clock className="w-3 h-3" />
          <span>Active {formatDistanceToNow(new Date(forum.updated_at), { addSuffix: true })}</span>
        </div>

        <Button 
          className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          onClick={handleEnterForum}
        >
          Enter Forum
        </Button>
      </div>
    </Card>
  );
}
