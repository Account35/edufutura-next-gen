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

    const { subject_name, chapter_title, draft_question, draft_title } = await req.json();

    // Fetch the forum suggestion template
    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: 'forum_post_improvement' });

    const template = templateData?.[0];
    if (!template) {
      throw new Error('Forum suggestion template not found');
    }

    // Prepare template variables
    const variables = {
      subject_name: subject_name || 'General',
      chapter_title: chapter_title || 'General Discussion',
      draft_question_text: `Title: ${draft_title || 'No title'}\n\nQuestion: ${draft_question}`,
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
        temperature: Number(template.temperature) || 0.5,
        max_tokens: template.max_tokens || 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('AI suggestion service unavailable');
    }

    const openaiData = await openaiResponse.json();
    const responseTime = Date.now() - startTime;
    const aiResponse = openaiData.choices[0].message.content;
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Parse the response
    let suggestion;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        suggestion = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse suggestion:', aiResponse);
      suggestion = {
        needs_improvement: false,
        suggestion: aiResponse,
      };
    }

    // Update template metrics
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
        metadata: {
          response_time_ms: responseTime,
          tokens_used: tokensUsed,
        }
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
