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

    const { subject_name, study_time_available } = await req.json();

    // Get user profile and study preferences
    const { data: userData } = await supabaseClient
      .from('users')
      .select('grade_level')
      .eq('id', user.id)
      .single();

    const { data: studyPrefs } = await supabaseClient
      .from('study_preferences')
      .select('learning_style, study_pace, daily_goal_minutes')
      .eq('user_id', user.id)
      .single();

    // Get user's quiz performance for the subject
    const { data: quizPerformance } = await supabaseClient
      .from('quiz_performance')
      .select('average_score, weak_topics, strong_topics')
      .eq('user_id', user.id)
      .eq('subject_name', subject_name)
      .single();

    // Fetch the study tips template
    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: 'study_tips_personalized' });

    const template = templateData?.[0];
    if (!template) {
      throw new Error('Study tips template not found');
    }

    // Prepare template variables
    const variables = {
      grade_level: userData?.grade_level || 10,
      subject_name: subject_name,
      current_average: quizPerformance?.average_score || 'N/A',
      learning_style: studyPrefs?.learning_style || 'visual',
      study_pace: studyPrefs?.study_pace || 'moderate',
      weak_topics: quizPerformance?.weak_topics?.join(', ') || 'Not yet identified',
      study_time_available: study_time_available || studyPrefs?.daily_goal_minutes || 60,
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
        temperature: Number(template.temperature) || 0.6,
        max_tokens: template.max_tokens || 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('AI study tips service unavailable');
    }

    const openaiData = await openaiResponse.json();
    const responseTime = Date.now() - startTime;
    const studyTips = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Update template metrics
    await supabaseClient.rpc('update_template_metrics', {
      p_template_name: 'study_tips_personalized',
      p_template_version: template.template_version,
      p_success: true,
      p_rating: null,
      p_cost: tokensUsed * 0.00001,
    });

    // Log to AI conversations
    const { data: conversation } = await supabaseClient
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        subject_name: subject_name,
        conversation_title: `Study Tips: ${subject_name}`,
      })
      .select()
      .single();

    if (conversation) {
      await supabaseClient.from('ai_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        message_text: studyTips,
        ai_model: template.model_name,
        tokens_used: tokensUsed,
        response_time_ms: responseTime,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        tips: studyTips,
        subject: subject_name,
        personalization: {
          learning_style: variables.learning_style,
          study_pace: variables.study_pace,
          current_average: variables.current_average,
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
    console.error('Study tips error:', error);
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
