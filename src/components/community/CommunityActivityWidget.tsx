import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users, UserPlus, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommunityActivity {
  unreadMessages: number;
  forumMentions: Array<{ id: string; post_title: string; created_at: string }>;
  buddyRequests: number;
  newResources: number;
}

export const CommunityActivityWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<CommunityActivity>({
    unreadMessages: 0,
    forumMentions: [],
    buddyRequests: 0,
    newResources: 0,
  });

  useEffect(() => {
    if (!user) return;
    loadCommunityActivity();
  }, [user]);

  const loadCommunityActivity = async () => {
    try {
      // Count unread group messages
      const { count: unreadCount } = await supabase
        .from('group_chat_messages')
        .select('*', { count: 'exact', head: true })
        .not('read_by', 'cs', `{${user!.id}}`);

      // Count buddy requests
      const { count: buddyCount } = await supabase
        .from('study_buddies')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user!.id)
        .eq('status', 'pending');

      // Count new resources (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: resourceCount } = await supabase
        .from('shared_resources')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'approved')
        .gte('created_at', weekAgo.toISOString());

      // Forum mentions (simplified - would need full-text search in production)
      const { data: mentions } = await supabase
        .from('forum_posts')
        .select('id, post_title, created_at')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(3);

      setActivity({
        unreadMessages: unreadCount || 0,
        forumMentions: mentions || [],
        buddyRequests: buddyCount || 0,
        newResources: resourceCount || 0,
      });
    } catch (error) {
      console.error('Error loading community activity:', error);
    }
  };

  const totalActivity = activity.unreadMessages + activity.buddyRequests + activity.forumMentions.length;

  if (totalActivity === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Community Activity</CardTitle>
        <Badge variant="secondary">{totalActivity}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {activity.unreadMessages > 0 && (
          <div 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => navigate('/community/groups')}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{activity.unreadMessages} unread messages</p>
                <p className="text-xs text-muted-foreground">In your study groups</p>
              </div>
            </div>
            <Badge className="bg-secondary text-white">{activity.unreadMessages}</Badge>
          </div>
        )}

        {activity.buddyRequests > 0 && (
          <div 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => navigate('/community/study-buddies')}
          >
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{activity.buddyRequests} study buddy requests</p>
                <p className="text-xs text-muted-foreground">Accept or decline</p>
              </div>
            </div>
            <Badge className="bg-secondary text-white">{activity.buddyRequests}</Badge>
          </div>
        )}

        {activity.newResources > 0 && (
          <div 
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
            onClick={() => navigate('/community/resources')}
          >
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{activity.newResources} new resources</p>
                <p className="text-xs text-muted-foreground">In your subjects</p>
              </div>
            </div>
          </div>
        )}

        {activity.forumMentions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Recent Forum Activity
            </p>
            {activity.forumMentions.map((mention) => (
              <div
                key={mention.id}
                className="p-2 rounded-lg bg-muted/30 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/community/forums/post/${mention.id}`)}
              >
                <p className="text-sm line-clamp-1">{mention.post_title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(mention.created_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        )}

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/community/forums')}
        >
          <Users className="h-4 w-4 mr-2" />
          Explore Community
        </Button>
      </CardContent>
    </Card>
  );
};
