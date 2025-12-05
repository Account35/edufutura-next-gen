import "https://deno.land/x/xhr@0.3.0/mod.ts";
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get popular queries from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get top queries by hit count that need refresh
    const { data: popularQueries, error: queryError } = await supabase
      .from('ai_response_cache')
      .select('query_text, template_name, grade_level, subject_name, hit_count, ttl_seconds, created_at')
      .gte('hit_count', 5)
      .order('hit_count', { ascending: false })
      .limit(50);

    if (queryError) throw queryError;

    const warmedCount = { success: 0, skipped: 0, failed: 0 };
    const results: { query: string; status: string }[] = [];

    for (const entry of popularQueries || []) {
      // Check if cache entry is about to expire (within 10% of TTL)
      const createdAt = new Date(entry.created_at).getTime();
      const ttlMs = entry.ttl_seconds * 1000;
      const timeElapsed = Date.now() - createdAt;
      const expiryThreshold = ttlMs * 0.9;

      if (timeElapsed < expiryThreshold) {
        warmedCount.skipped++;
        results.push({ query: entry.query_text.slice(0, 50), status: 'skipped_not_expired' });
        continue;
      }

      try {
        // Re-generate the response based on template type
        if (entry.template_name === 'quiz_generation') {
          // Warm quiz generation cache
          const { error: quizError } = await supabase.functions.invoke('generate-quiz', {
            body: {
              chapter_content: entry.query_text,
              difficulty: 'intermediate',
              question_count: 5,
              warm_cache: true,
            }
          });

          if (quizError) throw quizError;
          warmedCount.success++;
          results.push({ query: entry.query_text.slice(0, 50), status: 'warmed' });
        } else if (entry.template_name?.includes('study_tips')) {
          // Warm study tips cache
          const { error: tipsError } = await supabase.functions.invoke('ai-study-tips', {
            body: {
              subject_name: entry.subject_name,
              study_time_available: 60,
              warm_cache: true,
            }
          });

          if (tipsError) throw tipsError;
          warmedCount.success++;
          results.push({ query: entry.query_text.slice(0, 50), status: 'warmed' });
        } else {
          warmedCount.skipped++;
          results.push({ query: entry.query_text.slice(0, 50), status: 'skipped_unknown_template' });
        }
      } catch (warmError) {
        console.error('Failed to warm cache entry:', warmError);
        warmedCount.failed++;
        results.push({ query: entry.query_text.slice(0, 50), status: 'failed' });
      }

      // Rate limit to prevent overwhelming AI services
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Clean up expired entries
    const { data: cleanedCount } = await supabase.rpc('cleanup_expired_cache');

    // Evict LRU entries if cache is getting full
    const { data: evictedCount } = await supabase.rpc('evict_lru_cache', { max_entries: 100000 });

    return new Response(JSON.stringify({
      success: true,
      warmed: warmedCount,
      cleaned: cleanedCount || 0,
      evicted: evictedCount || 0,
      details: results.slice(0, 10), // Return first 10 for brevity
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Cache warming error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
