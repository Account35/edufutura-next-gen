import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-client';

export type Institution = {
  id: string;
  institution_name: string;
  institution_type: string;
  province: string;
  city: string;
  courses_offered: any;
  institution_logo_url: string | null;
};

export type InstitutionRecommendation = {
  institution_id: string;
  program_name: string;
  match_score: number;
  match_factors: any;
  admission_probability: string;
  saved: boolean;
};

// Query for institutions
export const useInstitutions = () => {
  return useQuery({
    queryKey: queryKeys.institutions,
    queryFn: async (): Promise<Institution[]> => {
      const { data, error } = await supabase
        .from('tertiary_institutions')
        .select('*')
        .order('institution_name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

// Query for user recommendations
export const useInstitutionRecommendations = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.institutionRecommendations(userId || ''),
    queryFn: async (): Promise<Map<string, InstitutionRecommendation>> => {
      if (!userId) return new Map();

      const { data, error } = await supabase
        .from('institution_recommendations')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const recMap = new Map<string, InstitutionRecommendation>();
      (data || []).forEach((rec: any) => {
        recMap.set(rec.institution_id, rec);
      });
      return recMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId,
  });
};

// Mutation for toggling save state
export const useToggleInstitutionSave = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      institutionId,
      currentRec,
    }: {
      userId: string;
      institutionId: string;
      currentRec?: InstitutionRecommendation;
    }) => {
      const newSavedState = !currentRec?.saved;

      if (currentRec) {
        // Update existing recommendation
        const { error } = await supabase
          .from('institution_recommendations')
          .update({ saved: newSavedState })
          .eq('institution_id', institutionId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Create new recommendation
        const { error } = await supabase
          .from('institution_recommendations')
          .insert({
            user_id: userId,
            institution_id: institutionId,
            saved: true,
            match_score: 0,
          });

        if (error) throw error;
      }

      return { institutionId, saved: newSavedState };
    },
    onSuccess: (result, variables) => {
      // Update the recommendations cache
      queryClient.setQueryData(
        queryKeys.institutionRecommendations(variables.userId),
        (oldData: Map<string, InstitutionRecommendation> | undefined) => {
          if (!oldData) return oldData;

          const updatedRecs = new Map(oldData);
          const existingRec = oldData.get(variables.institutionId);

          updatedRecs.set(variables.institutionId, {
            ...existingRec,
            institution_id: variables.institutionId,
            program_name: existingRec?.program_name || '',
            match_score: existingRec?.match_score || 0,
            match_factors: existingRec?.match_factors || {},
            admission_probability: existingRec?.admission_probability || '',
            saved: result.saved,
          });

          return updatedRecs;
        }
      );
    },
  });
};