import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type ChapterProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface ChapterProgressState {
  status: ChapterProgressStatus;
  progressPercentage: number;
}

/**
 * Read-only progress lookup for every chapter of a subject.
 * Uses the existing user_chapter_progress rows; chapters without a row
 * are simply reported as not started. No writes happen here.
 */
export const useSubjectChapterProgress = (chapterIds: string[]) => {
  const { user } = useAuth();
  const [progressMap, setProgressMap] = useState<Record<string, ChapterProgressState>>({});
  const [loading, setLoading] = useState(false);

  const key = chapterIds.join(',');

  const load = useCallback(async () => {
    if (!user || chapterIds.length === 0) {
      setProgressMap({});
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_chapter_progress')
        .select('chapter_id, status, progress_percentage')
        .eq('user_id', user.id)
        .in('chapter_id', chapterIds);

      if (error) throw error;

      const map: Record<string, ChapterProgressState> = {};
      (data || []).forEach((row: { chapter_id: string; status: string | null; progress_percentage: number | null }) => {
        const pct = Number(row.progress_percentage) || 0;
        const status: ChapterProgressStatus =
          row.status === 'completed' || pct >= 100
            ? 'completed'
            : pct > 0 || row.status === 'in_progress'
              ? 'in_progress'
              : 'not_started';
        map[row.chapter_id] = { status, progressPercentage: pct };
      });
      setProgressMap(map);
    } catch (err) {
      console.error('[useSubjectChapterProgress] Failed to load chapter progress', err);
      setProgressMap({});
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, key]);

  useEffect(() => {
    load();
  }, [load]);

  return { progressMap, loading, refresh: load };
};
