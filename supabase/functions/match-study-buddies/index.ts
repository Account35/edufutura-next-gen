import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    );
    if (!user) throw new Error('Unauthorized');

    const { user_id, preferences } = await req.json();
    const requesterId = user_id || user.id;

    // Get requester's profile
    const { data: requester, error: requesterError } = await supabaseClient
      .from('users')
      .select('*, study_preferences(*), user_progress(*)')
      .eq('id', requesterId)
      .single();

    if (requesterError || !requester) {
      throw new Error('User profile not found');
    }

    // Get existing connections to exclude
    const { data: existingConnections } = await supabaseClient
      .from('study_buddies')
      .select('recipient_id, requester_id')
      .or(`requester_id.eq.${requesterId},recipient_id.eq.${requesterId}`)
      .in('status', ['accepted', 'pending']);

    const excludedIds = new Set([requesterId]);
    existingConnections?.forEach(conn => {
      excludedIds.add(conn.recipient_id);
      excludedIds.add(conn.requester_id);
    });

    // Get potential candidates
    let query = supabaseClient
      .from('users')
      .select('id, full_name, grade_level, province, subjects_studying, profile_picture_url, study_preferences(*), user_progress(*)')
      .eq('grade_level', requester.grade_level)
      .limit(200);

    if (preferences?.subjects_filter) {
      query = query.contains('subjects_studying', preferences.subjects_filter);
    }
    if (preferences?.location_filter) {
      query = query.eq('province', preferences.location_filter);
    }

    const { data: candidates, error: candidatesError } = await query;

    if (candidatesError) {
      throw new Error('Failed to fetch candidates');
    }

    // Filter out excluded users
    const filteredCandidates = candidates?.filter(c => !excludedIds.has(c.id)) || [];

    // Calculate match scores
    const matches = filteredCandidates.map(candidate => {
      const scores = {
        common_subjects: 0,
        location: 0,
        learning_style: 0,
        study_pace: 0,
        performance: 0,
      };

      // Common subjects (40% weight)
      const requesterSubjects = new Set(requester.subjects_studying || []);
      const candidateSubjects = new Set(candidate.subjects_studying || []);
      const commonSubjects = [...requesterSubjects].filter(s => candidateSubjects.has(s));
      const totalSubjects = new Set([...requesterSubjects, ...candidateSubjects]).size;
      scores.common_subjects = totalSubjects > 0 ? (commonSubjects.length / totalSubjects) * 40 : 0;

      // Same location (20% weight)
      if (requester.province === candidate.province) {
        scores.location = 20;
      }

      // Similar learning style (15% weight)
      const requesterStyle = requester.study_preferences?.[0]?.learning_style;
      const candidateStyle = candidate.study_preferences?.[0]?.learning_style;
      if (requesterStyle && candidateStyle && requesterStyle === candidateStyle) {
        scores.learning_style = 15;
      }

      // Compatible study pace (10% weight)
      const requesterGoal = requester.study_preferences?.[0]?.daily_goal_minutes || 60;
      const candidateGoal = candidate.study_preferences?.[0]?.daily_goal_minutes || 60;
      const goalDiff = Math.abs(requesterGoal - candidateGoal);
      scores.study_pace = goalDiff < 30 ? 10 : goalDiff < 60 ? 5 : 0;

      // Complementary performance (15% weight) - find subjects where one is strong and other is weak
      let complementaryCount = 0;
      const requesterProgress = requester.user_progress || [];
      const candidateProgress = candidate.user_progress || [];
      
      commonSubjects.forEach(subject => {
        const reqAvg = requesterProgress.find((p: any) => p.subject_name === subject)?.average_quiz_score || 0;
        const candAvg = candidateProgress.find((p: any) => p.subject_name === subject)?.average_quiz_score || 0;
        
        // Check if one is strong (>70%) and other needs help (<50%)
        if ((reqAvg > 70 && candAvg < 50) || (candAvg > 70 && reqAvg < 50)) {
          complementaryCount++;
        }
      });
      scores.performance = complementaryCount > 0 ? 15 : 0;

      const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

      // Generate match reasons
      const reasons = [];
      if (commonSubjects.length > 0) {
        reasons.push(`Common subjects: ${commonSubjects.join(', ')}`);
      }
      if (scores.location > 0) {
        reasons.push(`Both in ${requester.province}`);
      }
      if (scores.learning_style > 0) {
        reasons.push(`${requesterStyle} learners`);
      }
      if (scores.study_pace > 0) {
        reasons.push('Compatible study schedules');
      }
      if (scores.performance > 0) {
        reasons.push('Can help each other in different subjects');
      }

      return {
        user_id: candidate.id,
        full_name: candidate.full_name,
        grade_level: candidate.grade_level,
        province: candidate.province,
        profile_picture_url: candidate.profile_picture_url,
        match_score: Math.round(totalScore),
        common_subjects: commonSubjects,
        match_reasons: reasons.join('. '),
      };
    });

    // Sort by score and filter threshold
    const topMatches = matches
      .filter(m => m.match_score >= 40)
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 15);

    return new Response(
      JSON.stringify({
        success: true,
        matches: topMatches,
        total_candidates: filteredCandidates.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Buddy matching error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Unauthorized') ? 401 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
