import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ForumCard } from '@/components/community/ForumCard';
import { CareerForumCard } from '@/components/community/CareerForumCard';
import { MobileForumActions } from '@/components/community/MobileForumActions';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Forum {
  id: string;
  subject_name: string;
  forum_title: string;
  forum_description: string | null;
  icon_name: string | null;
  color_theme: string | null;
  post_count: number;
  member_count: number;
  updated_at: string;
}

export default function Forums() {
  const navigate = useNavigate();
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadForums();
  }, []);

  const loadForums = async () => {
    try {
      const { data, error } = await supabase
        .from('forums')
        .select('*')
        .eq('is_active', true)
        .order('subject_name', { ascending: true });

      if (error) throw error;
      setForums(data || []);
    } catch (error) {
      console.error('Error loading forums:', error);
      toast.error('Failed to load forums');
    } finally {
      setLoading(false);
    }
  };

  const filteredForums = forums.filter(forum =>
    forum.forum_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    forum.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    forum.forum_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">
            Community Forums
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Join discussions, ask questions, and learn together with fellow students
          </p>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search forums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredForums.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No forums match your search' : 'No forums available'}
            </p>
          </div>
        ) : (
          <>
            {/* Featured Career Forum */}
            <div className="mb-6">
              <CareerForumCard />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredForums.map((forum) => (
                <ForumCard key={forum.id} forum={forum} />
              ))}
            </div>
          </>
        )}

        {/* Mobile FAB for new discussion */}
        <MobileForumActions onNewDiscussion={() => navigate('/community/forums')} />
      </div>
    </DashboardLayout>
  );
}
