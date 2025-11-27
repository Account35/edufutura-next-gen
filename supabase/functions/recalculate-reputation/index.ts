import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReputationRecalculation {
  user_id: string;
  helpful_posts: number;
  quality_resources: number;
  positive_ratings: number;
  solutions_marked: number;
  warnings_received: number;
  total_score: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('Starting reputation recalculation...');

    // Get all users with reputation records
    const { data: users, error: usersError } = await supabaseClient
      .from('user_reputation')
      .select('user_id');

    if (usersError) throw usersError;

    const recalculations: ReputationRecalculation[] = [];

    for (const user of users || []) {
      // Count helpful posts (replies with 5+ upvotes)
      const { data: helpfulPosts } = await supabaseClient
        .from('post_replies')
        .select('id')
        .eq('user_id', user.user_id);

      let helpfulCount = 0;
      for (const reply of helpfulPosts || []) {
        const { count } = await supabaseClient
          .from('reply_upvotes')
          .select('*', { count: 'exact', head: true })
          .eq('reply_id', reply.id);

        if (count && count >= 5) helpfulCount++;
      }

      // Count quality resources (4.0+ rating)
      const { count: qualityResourcesCount } = await supabaseClient
        .from('shared_resources')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .gte('rating_average', 4.0);

      // Count positive ratings (4-5 stars received)
      const { data: userResources } = await supabaseClient
        .from('shared_resources')
        .select('id')
        .eq('user_id', user.user_id);

      let positiveRatingsCount = 0;
      for (const resource of userResources || []) {
        const { count } = await supabaseClient
          .from('resource_ratings')
          .select('*', { count: 'exact', head: true })
          .eq('resource_id', resource.id)
          .gte('rating', 4);

        positiveRatingsCount += count || 0;
      }

      // Count solutions marked
      const { count: solutionsCount } = await supabaseClient
        .from('post_replies')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id)
        .eq('is_solution', true);

      // Count warnings
      const { count: warningsCount } = await supabaseClient
        .from('user_warnings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.user_id);

      // Calculate total score
      const totalScore = Math.max(
        0,
        (helpfulCount * 10) +
        (qualityResourcesCount || 0) * 25 +
        (positiveRatingsCount * 5) +
        (solutionsCount || 0) * 15 -
        (warningsCount || 0) * 50
      );

      // Calculate level
      let level = 'Newcomer';
      if (totalScore >= 1000) level = 'Leader';
      else if (totalScore >= 500) level = 'Trusted';
      else if (totalScore >= 100) level = 'Contributor';

      // Update reputation record
      const { error: updateError } = await supabaseClient
        .from('user_reputation')
        .update({
          reputation_score: totalScore,
          current_level: level,
          helpful_posts: helpfulCount,
          quality_resources: qualityResourcesCount || 0,
          positive_ratings: positiveRatingsCount,
          solutions_marked: solutionsCount || 0,
          warnings_received: warningsCount || 0,
          last_recalculated_at: new Date().toISOString(),
        })
        .eq('user_id', user.user_id);

      if (updateError) {
        console.error(`Error updating user ${user.user_id}:`, updateError);
        continue;
      }

      recalculations.push({
        user_id: user.user_id,
        helpful_posts: helpfulCount,
        quality_resources: qualityResourcesCount || 0,
        positive_ratings: positiveRatingsCount,
        solutions_marked: solutionsCount || 0,
        warnings_received: warningsCount || 0,
        total_score: totalScore,
      });
    }

    console.log(`Recalculated reputation for ${recalculations.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        recalculated: recalculations.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in recalculate-reputation:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
