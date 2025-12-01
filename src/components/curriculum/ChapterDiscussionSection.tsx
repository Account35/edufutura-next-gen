import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ExternalLink, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChapterDiscussionSectionProps {
  chapterId: string;
  subjectName: string;
  chapterTitle: string;
}

interface ForumPost {
  id: string;
  post_title: string;
  created_at: string;
  reply_count: number;
  user_id: string;
}

interface SharedResource {
  id: string;
  resource_title: string;
  rating_average: number;
  download_count: number;
}

export const ChapterDiscussionSection = ({ 
  chapterId, 
  subjectName,
  chapterTitle 
}: ChapterDiscussionSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<ForumPost[]>([]);
  const [resources, setResources] = useState<SharedResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChapterCommunityContent();
  }, [chapterId]);

  const loadChapterCommunityContent = async () => {
    try {
      // Load discussions related to this chapter
      const { data: posts } = await supabase
        .from('forum_posts')
        .select('id, post_title, created_at, reply_count, user_id')
        .eq('chapter_id', chapterId)
        .eq('moderation_status', 'approved')
        .order('last_activity', { ascending: false })
        .limit(3);

      // Load community resources for this chapter
      const { data: chapterResources } = await supabase
        .from('shared_resources')
        .select('id, resource_title, rating_average, download_count')
        .eq('chapter_id', chapterId)
        .eq('moderation_status', 'approved')
        .order('rating_average', { ascending: false })
        .limit(3);

      setDiscussions(posts || []);
      setResources(chapterResources || []);
    } catch (error) {
      console.error('Error loading chapter community content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartDiscussion = () => {
    // Navigate to forum with chapter context
    navigate(`/community/forums/${encodeURIComponent(subjectName)}`, {
      state: { chapterId, chapterTitle }
    });
  };

  if (loading) return null;

  return (
    <div className="space-y-6 mt-8">
      {/* Discussions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Chapter Discussions
          </CardTitle>
          {discussions.length > 0 && (
            <Badge variant="secondary">{discussions.length} active</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {discussions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                No discussions yet for this chapter
              </p>
              <Button onClick={handleStartDiscussion}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Start a Discussion
              </Button>
            </div>
          ) : (
            <>
              {discussions.map((post) => (
                <div
                  key={post.id}
                  className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => navigate(`/community/forums/post/${post.id}`)}
                >
                  <p className="text-sm font-medium line-clamp-2">{post.post_title}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    <span>•</span>
                    <span>{post.reply_count} replies</span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleStartDiscussion}
                >
                  Ask a Question
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => navigate(`/community/forums/${encodeURIComponent(subjectName)}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Resources */}
      {resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Student-Shared Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resources.map((resource) => (
              <div
                key={resource.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => navigate(`/community/resources`)}
              >
                <p className="text-sm font-medium line-clamp-1">{resource.resource_title}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-secondary text-secondary" />
                    <span>{resource.rating_average.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{resource.download_count} downloads</span>
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/community/resources')}
            >
              See All Resources
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
