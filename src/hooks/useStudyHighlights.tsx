import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface StudyHighlight {
  id: string;
  chapter_id: string;
  highlighted_text: string;
  note: string | null;
  created_at: string;
}

/** Highlights for a single chapter (topic) - used inside the reading view. */
export const useStudyHighlights = (chapterId?: string) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<StudyHighlight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHighlights = useCallback(async () => {
    if (!user || !chapterId) {
      setHighlights([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('study_highlights')
      .select('id, chapter_id, highlighted_text, note, created_at')
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to load highlights:', error.message);
    }
    setHighlights((data as StudyHighlight[]) || []);
    setLoading(false);
  }, [user, chapterId]);

  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  const addHighlight = useCallback(
    async (highlighted_text: string, note?: string) => {
      if (!user || !chapterId) return null;
      const { data, error } = await supabase
        .from('study_highlights')
        .insert({
          user_id: user.id,
          chapter_id: chapterId,
          highlighted_text,
          note: note?.trim() ? note.trim() : null,
        })
        .select('id, chapter_id, highlighted_text, note, created_at')
        .maybeSingle();

      if (error) {
        toast.error('Could not save highlight', { description: error.message });
        return null;
      }
      if (data) setHighlights((prev) => [...prev, data as StudyHighlight]);
      toast.success('Highlight saved');
      return data as StudyHighlight | null;
    },
    [user, chapterId],
  );

  const updateNote = useCallback(async (id: string, note: string) => {
    const { error } = await supabase
      .from('study_highlights')
      .update({ note: note.trim() ? note.trim() : null })
      .eq('id', id);
    if (error) {
      toast.error('Could not update note', { description: error.message });
      return false;
    }
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, note: note.trim() || null } : h)));
    return true;
  }, []);

  const deleteHighlight = useCallback(async (id: string) => {
    const { error } = await supabase.from('study_highlights').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete highlight', { description: error.message });
      return false;
    }
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    return true;
  }, []);

  return { highlights, loading, addHighlight, updateNote, deleteHighlight, refetch: fetchHighlights };
};

export interface StudyNote extends StudyHighlight {
  chapter_title: string;
  chapter_number: number;
  subject_name: string;
}

/** All highlights for the signed-in student, joined with chapter + subject info. */
export const useAllStudyNotes = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('study_highlights')
      .select(
        'id, chapter_id, highlighted_text, note, created_at, curriculum_chapters(chapter_title, chapter_number, curriculum_subjects(subject_name))',
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load study notes:', error.message);
      setNotes([]);
    } else {
      setNotes(
        ((data as any[]) || []).map((row) => ({
          id: row.id,
          chapter_id: row.chapter_id,
          highlighted_text: row.highlighted_text,
          note: row.note,
          created_at: row.created_at,
          chapter_title: row.curriculum_chapters?.chapter_title || 'Unknown topic',
          chapter_number: row.curriculum_chapters?.chapter_number ?? 0,
          subject_name: row.curriculum_chapters?.curriculum_subjects?.subject_name || 'Other',
        })),
      );
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const updateNote = useCallback(async (id: string, note: string) => {
    const { error } = await supabase
      .from('study_highlights')
      .update({ note: note.trim() ? note.trim() : null })
      .eq('id', id);
    if (error) {
      toast.error('Could not update note', { description: error.message });
      return false;
    }
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, note: note.trim() || null } : n)));
    toast.success('Note updated');
    return true;
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from('study_highlights').delete().eq('id', id);
    if (error) {
      toast.error('Could not delete note', { description: error.message });
      return false;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success('Note deleted');
    return true;
  }, []);

  return { notes, loading, updateNote, deleteNote, refetch: fetchNotes };
};
