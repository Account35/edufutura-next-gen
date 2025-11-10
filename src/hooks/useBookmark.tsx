import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useBookmark = (chapterId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !chapterId) return;

    const checkBookmark = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      setIsBookmarked(!!data);
    };

    checkBookmark();
  }, [user, chapterId]);

  const toggleBookmark = async () => {
    if (!user || !chapterId || loading) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        await supabase
          .from('bookmarks')
          .delete()
          .match({ user_id: user.id, chapter_id: chapterId });
        
        setIsBookmarked(false);
        toast({
          title: "Bookmark removed",
          description: "Chapter removed from your bookmarks",
        });
      } else {
        await supabase
          .from('bookmarks')
          .upsert({
            user_id: user.id,
            chapter_id: chapterId,
            notes: '',
          }, {
            onConflict: 'user_id,chapter_id'
          });
        
        setIsBookmarked(true);
        toast({
          title: "Chapter bookmarked!",
          description: "Added to your bookmarks",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { isBookmarked, toggleBookmark, loading };
};
