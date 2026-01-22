import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-client';

export const useSubjects = (gradeLevel?: number) => {
  return useQuery({
    queryKey: queryKeys.subjects(),
    queryFn: async () => {
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
      return data || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

export const useUserProgress = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.userProgress(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};