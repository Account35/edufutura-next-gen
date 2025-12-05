import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCareerContext = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['career-context', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch student's subject performance
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('subject_name, average_quiz_score, progress_percentage')
        .eq('user_id', userId)
        .order('average_quiz_score', { ascending: false });

      // Fetch career recommendations
      const { data: careerRecs } = await supabase
        .from('career_recommendations')
        .select(`
          *,
          career_paths (
            career_name,
            career_category,
            average_salary_zar,
            education_level
          )
        `)
        .eq('user_id', userId)
        .order('recommendation_score', { ascending: false })
        .limit(5);

      // Fetch institution recommendations
      const { data: institutionRecs } = await supabase
        .from('institution_recommendations')
        .select(`
          *,
          tertiary_institutions (
            institution_name,
            institution_type,
            province
          )
        `)
        .eq('user_id', userId)
        .eq('saved', true);

      // Fetch latest career assessment
      const { data: assessmentData } = await supabase
        .from('career_assessments')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      // Get user grade level
      const { data: userData } = await supabase
        .from('users')
        .select('grade_level, province')
        .eq('id', userId)
        .single();

      return {
        strongSubjects: progressData
          ?.filter(p => (p.average_quiz_score || 0) >= 70)
          .map(p => p.subject_name)
          .slice(0, 3) || [],
        weakSubjects: progressData
          ?.filter(p => (p.average_quiz_score || 0) < 50)
          .map(p => p.subject_name)
          .slice(0, 3) || [],
        careerRecommendations: careerRecs?.map(rec => ({
          name: rec.career_paths?.career_name,
          category: rec.career_paths?.career_category,
          matchScore: rec.recommendation_score,
          reason: rec.recommendation_reason,
        })) || [],
        savedInstitutions: institutionRecs?.map(rec => ({
          name: rec.tertiary_institutions?.institution_name,
          type: rec.tertiary_institutions?.institution_type,
          province: rec.tertiary_institutions?.province,
        })) || [],
        assessmentResults: assessmentData?.results || null,
        gradeLevel: userData?.grade_level || 10,
        province: userData?.province || 'Gauteng',
      };
    },
    enabled: !!userId,
  });
};
