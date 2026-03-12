import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OPENROUTER_BASE_URL, getOpenRouterHeaders, mapModel } from "../_shared/openrouter.ts";

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

    const { career_id, user_profile } = await req.json();

    const { data: career, error: careerError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .eq('id', career_id)
      .single();

    if (careerError || !career) throw new Error('Career not found');

    let profile = user_profile;
    if (!profile) {
      const { data: userData } = await supabaseClient
        .from('users')
        .select('grade_level, subjects_studying, province')
        .eq('id', user.id)
        .single();
      profile = userData || {};
    }

    const { data: quizPerformance } = await supabaseClient
      .from('quiz_performance')
      .select('subject_name, average_score')
      .eq('user_id', user.id);

    const performanceSummary = quizPerformance?.map(p => 
      `${p.subject_name}: ${p.average_score}%`
    ).join(', ') || 'No quiz data available';

    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: 'career_counseling_guidance' });

    const template = templateData?.[0];
    if (!template) throw new Error('Career counseling template not found');

    const variables = {
      grade_level: profile.grade_level || 10,
      subjects_list: Array.isArray(profile.subjects_studying) 
        ? profile.subjects_studying.join(', ') 
        : profile.subjects_studying || 'Not specified',
      performance_summary: performanceSummary,
      stated_interests: profile.interests || 'Not specified',
      province: profile.province || 'South Africa',
      career_name: career.career_name,
      career_description: career.career_description || '',
      required_subjects: career.subjects_alignment ? 
        Object.keys(career.subjects_alignment).join(', ') : 'Various',
      salary_range: career.average_salary_zar ? 
        `R${career.average_salary_zar.toLocaleString()} average` : 'Varies',
      job_outlook: career.job_outlook || 'Information not available',
      sa_demand: career.growth_rate ? 
        `${career.growth_rate > 0 ? 'Growing' : 'Stable'} market` : 'Varies by region',
    };

    let prompt = template.prompt_text;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    const openRouterHeaders = getOpenRouterHeaders();

    const startTime = Date.now();
    const aiResponse = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: openRouterHeaders,
      body: JSON.stringify({
        model: mapModel(template.model_name || 'gpt-4o-mini'),
        messages: [
          { role: 'system', content: template.system_context || '' },
          { role: 'user', content: prompt }
        ],
        temperature: Number(template.temperature) || 0.7,
        max_tokens: template.max_tokens || 1200,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error('AI counseling service unavailable');
    }

    const aiData = await aiResponse.json();
    const responseTime = Date.now() - startTime;
    const counselingAdvice = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    await supabaseClient.rpc('update_template_metrics', {
      p_template_name: 'career_counseling_guidance',
      p_template_version: template.template_version,
      p_success: true,
      p_rating: null,
      p_cost: tokensUsed * 0.00001,
    });

    const { data: conversation } = await supabaseClient
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        subject_name: 'Career Guidance',
        conversation_title: `Career Counseling: ${career.career_name}`,
      })
      .select()
      .single();

    if (conversation) {
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        message_text: counselingAdvice,
        ai_model: template.model_name,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        advice: counselingAdvice,
        career: { name: career.career_name, category: career.career_category },
        metadata: {
          response_time_ms: responseTime,
          tokens_used: tokensUsed,
          template_version: template.template_version,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Career counseling error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                   errorMessage.includes('not found') ? 404 :
                   errorMessage.includes('unavailable') ? 503 : 500;
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});