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

    const { subject_name, chapter_title, draft_question, draft_title } = await req.json();

    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: 'forum_post_improvement' });

    const template = templateData?.[0];
    if (!template) throw new Error('Forum suggestion template not found');

    const variables = {
      subject_name: subject_name || 'General',
      chapter_title: chapter_title || 'General Discussion',
      draft_question_text: `Title: ${draft_title || 'No title'}\n\nQuestion: ${draft_question}`,
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
        temperature: Number(template.temperature) || 0.5,
        max_tokens: template.max_tokens || 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('OpenRouter API error:', errorText);
      throw new Error('AI suggestion service unavailable');
    }

    const aiData = await aiResponse.json();
    const responseTime = Date.now() - startTime;
    const aiContent = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;

    let suggestion;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        suggestion = JSON.parse(aiContent);
      }
    } catch (e) {
      console.error('Failed to parse suggestion:', aiContent);
      suggestion = { needs_improvement: false, suggestion: aiContent };
    }

    await supabaseClient.rpc('update_template_metrics', {
      p_template_name: 'forum_post_improvement',
      p_template_version: template.template_version,
      p_success: true,
      p_rating: null,
      p_cost: tokensUsed * 0.00001,
    });

    return new Response(
      JSON.stringify({
        success: true,
        needs_improvement: suggestion.needs_improvement || false,
        improved_title: suggestion.improved_title,
        improved_question: suggestion.improved_question,
        explanation: suggestion.explanation || suggestion.suggestion,
        metadata: { response_time_ms: responseTime, tokens_used: tokensUsed }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Forum suggestion error:', error);
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