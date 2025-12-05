import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const { career_id, user_profile } = await req.json();

    // Get career details
    const { data: career, error: careerError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .eq('id', career_id)
      .single();

    if (careerError || !career) {
      throw new Error('Career not found');
    }

    // Get user profile data if not provided
    let profile = user_profile;
    if (!profile) {
      const { data: userData } = await supabaseClient
        .from('users')
        .select('grade_level, subjects_studying, province')
        .eq('id', user.id)
        .single();
      
      profile = userData || {};
    }

    // Get user's quiz performance for performance summary
    const { data: quizPerformance } = await supabaseClient
      .from('quiz_performance')
      .select('subject_name, average_score')
      .eq('user_id', user.id);

    const performanceSummary = quizPerformance?.map(p => 
      `${p.subject_name}: ${p.average_score}%`
    ).join(', ') || 'No quiz data available';

    // Fetch the career counseling template
    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: 'career_counseling_guidance' });

    const template = templateData?.[0];
    if (!template) {
      throw new Error('Career counseling template not found');
    }

    // Prepare template variables
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

    // Interpolate template
    let prompt = template.prompt_text;
    for (const [key, value] of Object.entries(variables)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const startTime = Date.now();
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: template.model_name || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: template.system_context || '' },
          { role: 'user', content: prompt }
        ],
        temperature: Number(template.temperature) || 0.7,
        max_tokens: template.max_tokens || 1200,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('AI counseling service unavailable');
    }

    const openaiData = await openaiResponse.json();
    const responseTime = Date.now() - startTime;
    const counselingAdvice = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Update template metrics
    await supabaseClient.rpc('update_template_metrics', {
      p_template_name: 'career_counseling_guidance',
      p_template_version: template.template_version,
      p_success: true,
      p_rating: null,
      p_cost: tokensUsed * 0.00001, // Approximate cost
    });

    // Log to AI conversations
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
        career: {
          name: career.career_name,
          category: career.career_category,
        },
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
