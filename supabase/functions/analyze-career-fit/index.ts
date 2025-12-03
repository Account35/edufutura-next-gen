import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CareerMatch {
  career_id: string;
  career_name: string;
  career_category: string;
  fit_score: number;
  match_factors: {
    subject_alignment: number;
    academic_performance: number;
    interest_match: number;
  };
  explanation: string;
  average_salary_zar: number;
  education_level: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    console.log(`[analyze-career-fit] Analyzing career fit for user: ${user_id}`);

    // 1. Get user profile with subjects
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('subjects_studying, grade_level')
      .eq('id', user_id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    const userSubjects = userProfile.subjects_studying || [];

    // 2. Get user quiz performance by subject
    const { data: quizPerformance } = await supabaseClient
      .from('quiz_performance')
      .select('subject_name, average_score, total_attempts')
      .eq('user_id', user_id);

    const performanceMap: Record<string, number> = {};
    (quizPerformance || []).forEach(p => {
      performanceMap[p.subject_name] = p.average_score || 0;
    });

    // 3. Get career assessments (interests)
    const { data: assessments } = await supabaseClient
      .from('career_assessments')
      .select('results')
      .eq('user_id', user_id)
      .order('completed_at', { ascending: false })
      .limit(1);

    const userInterests = (assessments?.[0]?.results as any)?.interests || [];

    // 4. Get all career paths
    const { data: careers, error: careersError } = await supabaseClient
      .from('career_paths')
      .select('*');

    if (careersError || !careers) {
      throw new Error('Failed to fetch career paths');
    }

    // 5. Calculate fit scores for each career
    const careerMatches: CareerMatch[] = careers.map(career => {
      const subjectsAlignment = career.subjects_alignment as any || {};
      const requiredSubjects = Object.keys(subjectsAlignment);
      const relatedCareers = career.related_careers || [];
      
      // Subject alignment score (60% weight)
      let subjectScore = 0;
      if (requiredSubjects.length > 0) {
        const matchingSubjects = userSubjects.filter((s: string) => 
          requiredSubjects.some(rs => 
            s.toLowerCase().includes(rs.toLowerCase()) || 
            rs.toLowerCase().includes(s.toLowerCase())
          )
        );
        subjectScore = (matchingSubjects.length / requiredSubjects.length) * 100;
      } else {
        subjectScore = 50; // Neutral if no specific subjects required
      }

      // Academic performance score (30% weight)
      let performanceScore = 0;
      let relevantSubjectCount = 0;
      requiredSubjects.forEach(subject => {
        const subjectPerf = Object.entries(performanceMap).find(([key]) => 
          key.toLowerCase().includes(subject.toLowerCase())
        );
        if (subjectPerf) {
          performanceScore += subjectPerf[1];
          relevantSubjectCount++;
        }
      });
      performanceScore = relevantSubjectCount > 0 
        ? performanceScore / relevantSubjectCount 
        : 50;

      // Interest match score (10% weight)
      let interestScore = 0;
      if (userInterests.length > 0) {
        const categoryMatch = userInterests.some((i: string) => 
          career.career_category.toLowerCase().includes(i.toLowerCase()) ||
          i.toLowerCase().includes(career.career_category.toLowerCase())
        );
        interestScore = categoryMatch ? 100 : 30;
      } else {
        interestScore = 50;
      }

      // Calculate weighted fit score
      const fitScore = Math.round(
        (subjectScore * 0.6) + 
        (performanceScore * 0.3) + 
        (interestScore * 0.1)
      );

      // Generate explanation
      let explanation = '';
      if (fitScore >= 80) {
        explanation = `Excellent match! Your subjects and performance align well with ${career.career_name}.`;
      } else if (fitScore >= 60) {
        explanation = `Good potential! Focus on ${requiredSubjects.slice(0, 2).join(' and ')} to strengthen your profile.`;
      } else if (fitScore >= 40) {
        explanation = `Possible path with additional focus on key subjects.`;
      } else {
        explanation = `Consider exploring subjects related to this career if interested.`;
      }

      return {
        career_id: career.id,
        career_name: career.career_name,
        career_category: career.career_category,
        fit_score: fitScore,
        match_factors: {
          subject_alignment: Math.round(subjectScore),
          academic_performance: Math.round(performanceScore),
          interest_match: Math.round(interestScore),
        },
        explanation,
        average_salary_zar: career.average_salary_zar || 0,
        education_level: career.education_level || 'Unknown',
      };
    });

    // 6. Sort by fit score and return top matches
    const topMatches = careerMatches
      .sort((a, b) => b.fit_score - a.fit_score)
      .slice(0, 10);

    // 7. Store recommendations
    for (const match of topMatches.slice(0, 5)) {
      await supabaseClient
        .from('career_recommendations')
        .upsert({
          user_id,
          career_path_id: match.career_id,
          recommendation_score: match.fit_score,
          recommendation_reason: match.explanation,
          based_on: match.match_factors,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,career_path_id' });
    }

    console.log(`[analyze-career-fit] Generated ${topMatches.length} career matches for user: ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        matches: topMatches,
        user_subjects: userSubjects,
        total_careers_analyzed: careers.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Career fit analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});