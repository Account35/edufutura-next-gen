import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Subject {
  id: string;
  subject_name: string;
  description: string | null;
  icon_name: string | null;
  color_scheme: string | null;
  grade_level: number;
  total_chapters: number | null;
  estimated_hours: number | null;
  is_published: boolean | null;
  caps_aligned: boolean | null;
  learning_objectives: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Chapter {
  id: string;
  subject_id: string | null;
  chapter_number: number;
  chapter_title: string;
  chapter_description: string | null;
  content_markdown: string | null;
  content_type: string | null;
  content_url: string | null;
  difficulty_level: string | null;
  estimated_duration_minutes: number | null;
  is_published: boolean | null;
  caps_code: string | null;
  caps_description: string | null;
  key_concepts: string[] | null;
  learning_outcomes: string[] | null;
  glossary_terms: Record<string, string> | null;
  thumbnail_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface ChapterVersion {
  id: string;
  chapter_id: string;
  version_number: number;
  content_text: string;
  changed_by: string;
  changed_at: string;
  change_summary: string;
}

export const useAdminCurriculum = () => {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  // Fetch all subjects
  const { data: subjects = [], isLoading: subjectsLoading, refetch: refetchSubjects } = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .order('subject_name');
      
      if (error) throw error;
      return data as Subject[];
    },
  });

  // Fetch chapters for selected subject
  const { data: chapters = [], isLoading: chaptersLoading, refetch: refetchChapters } = useQuery({
    queryKey: ['admin-chapters', selectedSubject?.id],
    queryFn: async () => {
      if (!selectedSubject?.id) return [];
      
      const { data, error } = await supabase
        .from('curriculum_chapters')
        .select('*')
        .eq('subject_id', selectedSubject.id)
        .order('chapter_number');
      
      if (error) throw error;
      return data as Chapter[];
    },
    enabled: !!selectedSubject?.id,
  });

  // Create subject mutation
  const createSubjectMutation = useMutation({
    mutationFn: async (subjectData: Partial<Subject>) => {
      const insertData = {
        subject_name: subjectData.subject_name || '',
        grade_level: subjectData.grade_level || 10,
        description: subjectData.description,
        icon_name: subjectData.icon_name,
        color_scheme: subjectData.color_scheme,
        estimated_hours: subjectData.estimated_hours,
        is_published: subjectData.is_published,
        caps_aligned: subjectData.caps_aligned,
        learning_objectives: subjectData.learning_objectives,
      };
      
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create subject: ' + error.message);
    },
  });

  // Update subject mutation
  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subject> & { id: string }) => {
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Subject updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update subject: ' + error.message);
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curriculum_subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      setSelectedSubject(null);
      toast.success('Subject deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete subject: ' + error.message);
    },
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: Partial<Chapter>) => {
      const { data: user } = await supabase.auth.getUser();
      const insertData = {
        subject_id: chapterData.subject_id,
        chapter_number: chapterData.chapter_number || 1,
        chapter_title: chapterData.chapter_title || '',
        chapter_description: chapterData.chapter_description,
        content_markdown: chapterData.content_markdown,
        content_type: chapterData.content_type,
        difficulty_level: chapterData.difficulty_level,
        estimated_duration_minutes: chapterData.estimated_duration_minutes,
        is_published: chapterData.is_published,
        caps_code: chapterData.caps_code,
        caps_description: chapterData.caps_description,
        key_concepts: chapterData.key_concepts,
        learning_outcomes: chapterData.learning_outcomes,
        glossary_terms: chapterData.glossary_terms,
        created_by: user.user?.id,
        updated_by: user.user?.id,
      };
      
      const { data, error } = await supabase
        .from('curriculum_chapters')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] });
      toast.success('Chapter created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create chapter: ' + error.message);
    },
  });

  // Update chapter mutation
  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Chapter> & { id: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('curriculum_chapters')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user.user?.id,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] });
      toast.success('Chapter updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update chapter: ' + error.message);
    },
  });

  // Delete chapter mutation
  const deleteChapterMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('curriculum_chapters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] });
      setSelectedChapter(null);
      toast.success('Chapter deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete chapter: ' + error.message);
    },
  });

  // Reorder chapters
  const reorderChapters = useCallback(async (reorderedChapters: Chapter[]) => {
    try {
      const updates = reorderedChapters.map((chapter, index) => ({
        id: chapter.id,
        chapter_number: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('curriculum_chapters')
          .update({ chapter_number: update.chapter_number })
          .eq('id', update.id);
        
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-chapters'] });
      toast.success('Chapters reordered successfully');
    } catch (error: any) {
      toast.error('Failed to reorder chapters: ' + error.message);
    }
  }, [queryClient]);

  // Export subject as JSON
  const exportSubject = useCallback(async (subjectId: string) => {
    try {
      const { data: subject, error: subjectError } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;

      const { data: chapters, error: chaptersError } = await supabase
        .from('curriculum_chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .order('chapter_number');

      if (chaptersError) throw chaptersError;

      const exportData = {
        subject,
        chapters,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${subject.subject_name.replace(/\s+/g, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Subject exported successfully');
    } catch (error: any) {
      toast.error('Failed to export subject: ' + error.message);
    }
  }, []);

  // Import subject from JSON
  const importSubject = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const importData = JSON.parse(content);

      if (!importData.subject || !importData.chapters) {
        throw new Error('Invalid import file format');
      }

      // Create new subject (without id to auto-generate)
      const { id, created_at, updated_at, ...subjectData } = importData.subject;
      const { data: newSubject, error: subjectError } = await supabase
        .from('curriculum_subjects')
        .insert({
          ...subjectData,
          subject_name: `${subjectData.subject_name} (Imported)`,
        })
        .select()
        .single();

      if (subjectError) throw subjectError;

      // Create chapters
      for (const chapter of importData.chapters) {
        const { id: chapterId, created_at: chapterCreated, updated_at: chapterUpdated, subject_id, ...chapterData } = chapter;
        await supabase
          .from('curriculum_chapters')
          .insert({
            ...chapterData,
            subject_id: newSubject.id,
          });
      }

      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Subject imported successfully');
    } catch (error: any) {
      toast.error('Failed to import subject: ' + error.message);
    }
  }, [queryClient]);

  // Duplicate subject
  const duplicateSubject = useCallback(async (subjectId: string, newGradeLevel: number) => {
    try {
      const { data: subject, error: subjectError } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (subjectError) throw subjectError;

      const { data: chapters, error: chaptersError } = await supabase
        .from('curriculum_chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .order('chapter_number');

      if (chaptersError) throw chaptersError;

      // Create new subject
      const { id, created_at, updated_at, ...subjectData } = subject;
      const { data: newSubject, error: newSubjectError } = await supabase
        .from('curriculum_subjects')
        .insert({
          ...subjectData,
          subject_name: `${subjectData.subject_name} (Grade ${newGradeLevel})`,
          grade_level: newGradeLevel,
          is_published: false,
        })
        .select()
        .single();

      if (newSubjectError) throw newSubjectError;

      // Duplicate chapters
      for (const chapter of chapters) {
        const { id: chapterId, created_at: chapterCreated, updated_at: chapterUpdated, subject_id, ...chapterData } = chapter;
        await supabase
          .from('curriculum_chapters')
          .insert({
            ...chapterData,
            subject_id: newSubject.id,
            is_published: false,
          });
      }

      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      toast.success('Subject duplicated successfully');
    } catch (error: any) {
      toast.error('Failed to duplicate subject: ' + error.message);
    }
  }, [queryClient]);

  // Upload image to storage
  const uploadImage = useCallback(async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('curriculum-images')
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('curriculum-images')
      .getPublicUrl(data.path);

    return publicUrl;
  }, []);

  return {
    // State
    subjects,
    chapters,
    selectedSubject,
    selectedChapter,
    subjectsLoading,
    chaptersLoading,
    
    // Actions
    setSelectedSubject,
    setSelectedChapter,
    refetchSubjects,
    refetchChapters,
    
    // Mutations
    createSubject: createSubjectMutation.mutateAsync,
    updateSubject: updateSubjectMutation.mutateAsync,
    deleteSubject: deleteSubjectMutation.mutateAsync,
    createChapter: createChapterMutation.mutateAsync,
    updateChapter: updateChapterMutation.mutateAsync,
    deleteChapter: deleteChapterMutation.mutateAsync,
    
    // Bulk operations
    reorderChapters,
    exportSubject,
    importSubject,
    duplicateSubject,
    uploadImage,
    
    // Loading states
    isCreatingSubject: createSubjectMutation.isPending,
    isUpdatingSubject: updateSubjectMutation.isPending,
    isDeletingSubject: deleteSubjectMutation.isPending,
    isCreatingChapter: createChapterMutation.isPending,
    isUpdatingChapter: updateChapterMutation.isPending,
    isDeletingChapter: deleteChapterMutation.isPending,
  };
};
