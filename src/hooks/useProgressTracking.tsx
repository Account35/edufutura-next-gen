import { useEffect, useCallback } from 'react';
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

  const updateReadingProgress = useCallback(async (percentage: number) => {
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
  }, [user, chapterId]);

  const updateTimeSpent = useCallback(async (minutes: number) => {
    if (!user || !chapterId) return;

    try {
      // Get current time spent
      const { data: current } = await supabase
        .from('user_chapter_progress')
        .select('time_spent_minutes')
        .eq('user_id', user.id)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      const newTimeSpent = (current?.time_spent_minutes || 0) + minutes;

      await supabase
        .from('user_chapter_progress')
        .upsert({
          user_id: user.id,
          chapter_id: chapterId,
          time_spent_minutes: newTimeSpent,
          last_accessed: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,chapter_id',
          ignoreDuplicates: false 
        });

      // Update total study hours in users table
      if (subjectName) {
        const { data: allProgress } = await supabase
          .from('user_chapter_progress')
          .select('time_spent_minutes')
          .eq('user_id', user.id);

        if (allProgress) {
          const totalMinutes = allProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);
          const totalHours = totalMinutes / 60;

          await supabase
            .from('users')
            .update({ 
              total_study_hours: totalHours,
              last_study_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', user.id);
        }
      }
    } catch (error) {
      console.error('Error updating time spent:', error);
    }
  }, [user, chapterId, subjectName]);

  const syncSubjectProgress = useCallback(async () => {
    if (!user || !subjectName) return;

    try {
      // Get all chapters for this subject
      const { data: allChapters } = await supabase
        .from('curriculum_chapters')
        .select('id, chapter_number')
        .eq('subject_id', subjectName)
        .order('chapter_number');

      if (!allChapters) return;

      // Get progress for all chapters
      const chapterIds = allChapters.map(c => c.id);
      const { data: progressData } = await supabase
        .from('user_chapter_progress')
        .select('chapter_id, status, time_spent_minutes, last_accessed')
        .eq('user_id', user.id)
        .in('chapter_id', chapterIds);

      if (!progressData) return;

      const completedCount = progressData.filter(p => p.status === 'completed').length;
      const totalChapters = allChapters.length;
      const progressPercentage = (completedCount / totalChapters) * 100;

      // Find most recently accessed chapter
      const sortedProgress = progressData
        .filter(p => p.last_accessed)
        .sort((a, b) => new Date(b.last_accessed!).getTime() - new Date(a.last_accessed!).getTime());

      const mostRecentChapterId = sortedProgress[0]?.chapter_id;
      const currentChapter = allChapters.find(c => c.id === mostRecentChapterId);

      // Update user_progress table
      await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          subject_name: subjectName,
          chapters_completed: completedCount,
          total_chapters: totalChapters,
          progress_percentage: progressPercentage,
          current_chapter_number: currentChapter?.chapter_number,
          last_accessed: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { 
          onConflict: 'user_id,subject_name',
          ignoreDuplicates: false 
        });
    } catch (error) {
      console.error('Error syncing subject progress:', error);
    }
  }, [user, subjectName]);

  return { 
    markChapterComplete, 
    updateReadingProgress, 
    updateTimeSpent, 
    syncSubjectProgress 
  };
};
