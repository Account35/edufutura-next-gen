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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { content, contentType, contentId, userId, contextMetadata } = await req.json();

    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: 'content_moderation_community' });

    const template = templateData?.[0];
    
    let openRouterHeaders;
    try {
      openRouterHeaders = getOpenRouterHeaders();
    } catch {
      console.error('OPENROUTER_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          approved: true, 
          moderation_decision: 'flagged',
          message: 'Moderation service unavailable' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let systemPrompt: string;
    let moderationPrompt: string;
    let temperature = 0.1;
    let maxTokens = 600;

    if (template) {
      systemPrompt = template.system_context || '';
      moderationPrompt = template.prompt_text;
      temperature = Number(template.temperature) || 0.1;
      maxTokens = template.max_tokens || 600;

      const variables: Record<string, string> = {
        content_type: contentType || 'unknown',
        content_text: content,
        context_metadata: JSON.stringify(contextMetadata || {}),
      };

      for (const [key, value] of Object.entries(variables)) {
        moderationPrompt = moderationPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }
    } else {
      systemPrompt = 'You are a content moderation AI. Always respond with valid JSON.';
      moderationPrompt = `You are a content moderator for an educational platform serving South African high school students aged 11-18. Analyze the following content for:
1) Profanity and inappropriate language
2) Personal information (emails, phone numbers, physical addresses)
3) Bullying, harassment, or threats
4) Academic dishonesty (homework selling, test answers)
5) Sexual content
6) Violence or self-harm
7) Spam or promotional content

Content: ${content}

Respond ONLY with valid JSON in this exact format:
{"approved": boolean, "issues": ["issue1", "issue2"], "confidence": 0.95, "suggested_action": "approve|flag|remove"}`;
    }

    const startTime = Date.now();
    const aiResponse = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: openRouterHeaders,
      body: JSON.stringify({
        model: mapModel(template?.model_name || 'gpt-4o-mini'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: moderationPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!aiResponse.ok) {
      console.error('OpenRouter API error:', await aiResponse.text());
      throw new Error('OpenRouter moderation failed');
    }

    const aiData = await aiResponse.json();
    const responseTime = Date.now() - startTime;
    const aiContent = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;
    
    let moderationResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        moderationResult = JSON.parse(jsonMatch[0]);
      } else {
        moderationResult = JSON.parse(aiContent);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiContent);
      moderationResult = {
        approved: false,
        issues: ['Unable to parse moderation result'],
        confidence: 0.5,
        suggested_action: 'flag'
      };
    }

    const issues = moderationResult.issues || 
                   moderationResult.issues_found?.map((i: any) => i.specific_issue || i) || 
                   [];
    const confidence = moderationResult.confidence || moderationResult.confidence_score || 0.5;

    let moderationDecision = 'approved';
    if (confidence > 0.9 && issues.length > 0) {
      moderationDecision = 'removed';
    } else if (confidence >= 0.6 && issues.length > 0) {
      moderationDecision = 'flagged';
    }

    if (template) {
      await supabaseClient.rpc('update_template_metrics', {
        p_template_name: 'content_moderation_community',
        p_template_version: template.template_version,
        p_success: true,
        p_rating: null,
        p_cost: tokensUsed * 0.00001,
      });
    }

    const { error: logError } = await supabaseClient
      .from('content_moderation_log')
      .insert({
        content_type: contentType,
        content_id: contentId,
        user_id: userId,
        ai_confidence: confidence,
        issues_detected: issues,
        moderation_decision: moderationDecision,
        reviewed: false,
      });

    if (logError) console.error('Error logging moderation:', logError);

    return new Response(
      JSON.stringify({
        approved: moderationResult.approved && moderationDecision === 'approved',
        moderation_decision: moderationDecision,
        issues: issues,
        confidence: confidence,
        severity: moderationResult.overall_severity || (issues.length > 0 ? 'medium' : 'low'),
        metadata: {
          response_time_ms: responseTime,
          tokens_used: tokensUsed,
          template_version: template?.template_version || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Moderation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        approved: false, 
        moderation_decision: 'flagged',
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});