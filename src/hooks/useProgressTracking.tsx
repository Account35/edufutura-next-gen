import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useProgressTracking = (
  chapterId: string | null,
  subjectName: string | null,
  chapterNumber: number | null
) => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !chapterId) return;

    const updateLastAccessed = async () => {
      try {
        // Update user_chapter_progress
        await supabase
          .from('user_chapter_progress')
          .upsert({
            user_id: user.id,
            chapter_id: chapterId,
            last_accessed: new Date().toISOString(),
            status: 'in_progress',
          }, { 
            onConflict: 'user_id,chapter_id',
            ignoreDuplicates: false 
          });

        // Update user_progress for subject tracking
        if (subjectName && chapterNumber) {
          await supabase
            .from('user_progress')
            .upsert({
              user_id: user.id,
              subject_name: subjectName,
              current_chapter_number: chapterNumber,
              last_accessed: new Date().toISOString(),
            }, { 
              onConflict: 'user_id,subject_name',
              ignoreDuplicates: false 
            });
        }
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    };

    updateLastAccessed();
  }, [user, chapterId, subjectName, chapterNumber]);

  const markChapterComplete = async () => {
    if (!user || !chapterId || !subjectName) return;

    try {
      // Mark chapter as completed
      await supabase
        .from('user_chapter_progress')
        .update({
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId);

      // Update subject progress
      const { data: current } = await supabase
        .from('user_progress')
        .select('chapters_completed, total_chapters')
        .eq('user_id', user.id)
        .eq('subject_name', subjectName)
        .maybeSingle();

      const newCompleted = (current?.chapters_completed || 0) + 1;
      const totalChapters = current?.total_chapters || 1;
      const progress = (newCompleted / totalChapters) * 100;

      await supabase
        .from('user_progress')
        .update({
          chapters_completed: newCompleted,
          progress_percentage: progress,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('subject_name', subjectName);

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user.id,
        activity_type: 'chapter_completed',
        subject_name: subjectName,
        activity_description: `Completed Chapter ${chapterNumber}`,
        metadata: { chapterNumber, progress }
      });

      toast({
        title: "Chapter completed!",
        description: "Great work! Your progress has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving progress",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateReadingProgress = async (percentage: number) => {
    if (!user || !chapterId) return;

    try {
      await supabase
        .from('user_chapter_progress')
        .upsert({
          user_id: user.id,
          chapter_id: chapterId,
          progress_percentage: percentage,
          last_accessed: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,chapter_id',
          ignoreDuplicates: false 
        });
    } catch (error) {
      console.error('Error updating reading progress:', error);
    }
  };

  return { markChapterComplete, updateReadingProgress };
};
