import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Subject {
  id: string;
  subject_name: string;
  subject_code: string | null;
  grade_level: number;
  description: string | null;
  learning_objectives: string[] | null;
  total_chapters: number;
  estimated_hours: number | null;
  icon_name: string | null;
  color_scheme: string | null;
  caps_aligned: boolean;
}

export interface Chapter {
  id: string;
  subject_id: string;
  chapter_number: number;
  chapter_title: string;
  chapter_description: string | null;
  content_markdown: string | null;
  thumbnail_url: string | null;
  estimated_duration_minutes: number | null;
  difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced' | null;
  caps_code: string | null;
  caps_description: string | null;
  learning_outcomes: string[] | null;
}

export interface ChapterProgress {
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percentage: number;
  completed_at: string | null;
  time_spent_minutes: number;
}

export const useCurriculumData = () => {
  const { toast } = useToast();

  const fetchSubject = async (subjectName: string) => {
    try {
      const { data, error } = await supabase
        .from('curriculum_subjects')
        .select('*')
        .eq('subject_name', subjectName)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      return data as Subject | null;
    } catch (error: any) {
      toast({
        title: "Error loading subject",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchSubjects = async (gradeLevel?: number) => {
    try {
      let query = supabase
        .from('curriculum_subjects')
        .select('*')
        .eq('is_published', true)
        .order('subject_name');

      if (gradeLevel) {
        query = query.eq('grade_level', gradeLevel);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Subject[];
    } catch (error: any) {
      toast({
        title: "Error loading subjects",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchChapters = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('curriculum_chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('is_published', true)
        .order('chapter_number');

      if (error) throw error;
      return data as Chapter[];
    } catch (error: any) {
      toast({
        title: "Error loading chapters",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const fetchChapter = async (subjectId: string, chapterNumber: number) => {
    try {
      const { data, error } = await supabase
        .from('curriculum_chapters')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('chapter_number', chapterNumber)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      return data as Chapter | null;
    } catch (error: any) {
      toast({
        title: "Error loading chapter",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const fetchChapterProgress = async (userId: string, chapterId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_chapter_progress')
        .select('status, progress_percentage, completed_at, time_spent_minutes')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .maybeSingle();

      if (error) throw error;
      return data as ChapterProgress | null;
    } catch (error: any) {
      return null;
    }
  };

  const fetchPrerequisites = async (chapterId: string) => {
    try {
      const { data, error } = await supabase
        .from('chapter_prerequisites')
        .select(`
          prerequisite_chapter_id,
          prerequisite:curriculum_chapters!chapter_prerequisites_prerequisite_chapter_id_fkey(
            id,
            chapter_title,
            chapter_number
          )
        `)
        .eq('chapter_id', chapterId);

      if (error) throw error;
      return data;
    } catch (error: any) {
      return [];
    }
  };

  return {
    fetchSubject,
    fetchSubjects,
    fetchChapters,
    fetchChapter,
    fetchChapterProgress,
    fetchPrerequisites,
  };
};
