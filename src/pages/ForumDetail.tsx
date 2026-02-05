import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PostCard } from '@/components/community/PostCard';
import { PostCreationModal } from '@/components/community/PostCreationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, MessageSquare, Users, MessageSquarePlus } from 'lucide-react';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface Post {
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
}

export default function ForumDetail() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const [forum, setForum] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (subject) {
      loadForum();
    }
  }, [subject]);

  useEffect(() => {
    if (forum) {
      loadPosts();
    }
  }, [forum]);

  const loadForum = async () => {
    try {
      const { data, error } = await supabase
        .from('forums')
        .select('*')
        .eq('subject_name', decodeURIComponent(subject!))
        .single();

      if (error) throw error;
      setForum(data);
    } catch (error) {
      console.error('Error loading forum:', error);
      toast.error('Failed to load forum');
    }
  };

  const loadPosts = async () => {
    if (!forum?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('forum_posts')
        .select(`
          *,
          users(full_name, profile_picture_url, grade_level)
        `)
        .eq('forum_id', forum.id)
        .eq('moderation_status', 'approved')
        .order('is_pinned', { ascending: false })
        .order('last_activity', { ascending: false })
        .range(0, 19);

      if (error) throw error;
      setPosts(data as any || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = forum?.icon_name 
    ? (LucideIcons as any)[forum.icon_name] || LucideIcons.MessageSquare
    : LucideIcons.MessageSquare;

  const filteredPosts = posts.filter(post =>
    post.post_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.post_content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/community/forums')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Forums
        </Button>

        {forum && (
          <div className="mb-8">
            <div className="flex items-start gap-4 mb-4">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${forum.color_theme || '#D4AF37'}20` }}
              >
                <IconComponent 
                  className="w-10 h-10"
                  style={{ color: forum.color_theme || '#D4AF37' }}
                />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-4xl text-primary mb-2">
                  {forum.forum_title}
                </h1>
                <p className="text-muted-foreground mb-4">
                  {forum.forum_description || `Discuss ${forum.subject_name} topics and collaborate`}
                </p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{forum.post_count.toLocaleString()} discussions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{forum.member_count.toLocaleString()} members</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-secondary hover:bg-secondary/90 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Discussion
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No discussions match your search' : 'No discussions yet'}
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-secondary hover:bg-secondary/90 text-white"
            >
              Start the First Discussion
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} forumSubject={subject!} />
            ))}
          </div>
        )}

        {forum && (
          <PostCreationModal
            open={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            forumId={forum.id}
            forumSubject={forum.subject_name}
            onPostCreated={loadPosts}
          />
        )}

        {/* Mobile FAB for new discussion - positioned to left of AI button */}
        <Button
          onClick={() => setShowCreateModal(true)}
          className={cn(
            "fixed bottom-20 right-20 z-40 shadow-lg lg:hidden",
            "bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-14 w-14 p-0"
          )}
        >
          <MessageSquarePlus className="h-6 w-6" />
        </Button>
      </div>
    </DashboardLayout>
  );
}
