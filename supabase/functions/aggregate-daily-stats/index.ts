import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Daily stats aggregation job
 * Runs at 01:00 UTC to aggregate previous day's data
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`Aggregating stats for ${yesterdayStr}`);

    // Aggregate quiz performance
    await aggregateQuizPerformance(supabaseClient, yesterdayStr);

    // Aggregate content metrics
    await aggregateContentMetrics(supabaseClient, yesterdayStr);

    // Refresh materialized views
    await supabaseClient.rpc('refresh_materialized_views');

    console.log('✓ Daily aggregation complete');

    return new Response(JSON.stringify({ success: true, date: yesterdayStr }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Aggregation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function aggregateQuizPerformance(supabase: any, date: string): Promise<void> {
  // Get all quiz attempts from previous day
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('user_id, quiz_id, score_percentage, time_spent_seconds')
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`)
    .eq('is_completed', true);

  if (!attempts || attempts.length === 0) {
    console.log('No quiz attempts for aggregation');
    return;
  }

  // Group by user and subject
  const userStats = new Map<string, any>();
  
  for (const attempt of attempts) {
    // Get subject from quiz
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('subject_name')
      .eq('id', attempt.quiz_id)
      .single();

    if (!quiz) continue;

    const key = `${attempt.user_id}-${quiz.subject_name}`;
    
    if (!userStats.has(key)) {
      userStats.set(key, {
        user_id: attempt.user_id,
        subject_name: quiz.subject_name,
        scores: [],
        total_time: 0,
      });
    }

    const stats = userStats.get(key);
    stats.scores.push(attempt.score_percentage);
    stats.total_time += attempt.time_spent_seconds || 0;
  }

  // Insert aggregated stats
  const records = Array.from(userStats.values()).map((stats) => ({
    snapshot_date: date,
    user_id: stats.user_id,
    subject_name: stats.subject_name,
    average_score: stats.scores.reduce((a: number, b: number) => a + b, 0) / stats.scores.length,
    quizzes_completed: stats.scores.length,
    total_time_minutes: Math.round(stats.total_time / 60),
  }));

  await supabase.from('quiz_performance_history').insert(records);
  console.log(`✓ Aggregated ${records.length} quiz performance records`);
}

async function aggregateContentMetrics(supabase: any, date: string): Promise<void> {
  // Count forum posts created
  const { count: forumPosts } = await supabase
    .from('forum_posts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`);

  // Count resources shared
  const { count: resourcesShared } = await supabase
    .from('shared_resources')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`);

  // Count group messages
  const { count: groupMessages } = await supabase
    .from('group_chat_messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${date}T00:00:00Z`)
    .lt('created_at', `${date}T23:59:59Z`);

  // Calculate engagement rate (active users / total users)
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  const { data: activeUsers } = await supabase
    .from('user_actions')
    .select('user_id')
    .gte('timestamp', `${date}T00:00:00Z`)
    .lt('timestamp', `${date}T23:59:59Z`);

  const uniqueActiveUsers = new Set(activeUsers?.map((u: any) => u.user_id)).size;
  const engagementRate = totalUsers ? (uniqueActiveUsers / totalUsers) * 100 : 0;

  // Insert daily metrics
  await supabase.from('daily_content_metrics').insert({
    metric_date: date,
    forum_posts_created: forumPosts || 0,
    resources_shared: resourcesShared || 0,
    group_messages_sent: groupMessages || 0,
    engagement_rate: engagementRate,
  });

  console.log('✓ Aggregated content metrics');
}
