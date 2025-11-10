import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Prerequisite {
  prerequisite_chapter_id: string;
  is_required: boolean;
  chapter: {
    chapter_title: string;
    chapter_number: number;
    id: string;
  };
  completed: boolean;
}

interface PrerequisiteCheck {
  isLocked: boolean;
  prerequisites: Prerequisite[];
  incompleteRequired: Prerequisite[];
}

export const usePrerequisites = (chapterId: string | null) => {
  const { user } = useAuth();
  const [check, setCheck] = useState<PrerequisiteCheck>({
    isLocked: false,
    prerequisites: [],
    incompleteRequired: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPrerequisites = async () => {
      if (!chapterId || !user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch prerequisites for this chapter
        const { data: prereqData, error: prereqError } = await supabase
          .from('chapter_prerequisites')
          .select(`
            prerequisite_chapter_id,
            is_required,
            curriculum_chapters!chapter_prerequisites_prerequisite_chapter_id_fkey (
              id,
              chapter_title,
              chapter_number
            )
          `)
          .eq('chapter_id', chapterId);

        if (prereqError) throw prereqError;

        if (!prereqData || prereqData.length === 0) {
          setCheck({ isLocked: false, prerequisites: [], incompleteRequired: [] });
          setLoading(false);
          return;
        }

        // Get prerequisite chapter IDs
        const prerequisiteIds = prereqData.map(p => p.prerequisite_chapter_id);

        // Check completion status for each prerequisite
        const { data: progressData, error: progressError } = await supabase
          .from('user_chapter_progress')
          .select('chapter_id, status')
          .eq('user_id', user.id)
          .in('chapter_id', prerequisiteIds);

        if (progressError) throw progressError;

        // Map prerequisites with completion status
        const prerequisites: Prerequisite[] = prereqData.map(prereq => {
          const chapterData = Array.isArray(prereq.curriculum_chapters) 
            ? prereq.curriculum_chapters[0] 
            : prereq.curriculum_chapters;
          
          const progress = progressData?.find(p => p.chapter_id === prereq.prerequisite_chapter_id);
          return {
            prerequisite_chapter_id: prereq.prerequisite_chapter_id,
            is_required: prereq.is_required,
            chapter: chapterData,
            completed: progress?.status === 'completed'
          };
        });

        // Find incomplete required prerequisites
        const incompleteRequired = prerequisites.filter(
          p => p.is_required && !p.completed
        );

        setCheck({
          isLocked: incompleteRequired.length > 0,
          prerequisites,
          incompleteRequired
        });
      } catch (error) {
        console.error('Error checking prerequisites:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPrerequisites();
  }, [chapterId, user]);

  return { ...check, loading };
};
