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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { content, contentType, contentId, userId } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          approved: true, 
          moderation_decision: 'flagged',
          message: 'Moderation service unavailable' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI with moderation prompt
    const moderationPrompt = `You are a content moderator for an educational platform serving South African high school students aged 11-18. Analyze the following content for:
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

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a content moderation AI. Always respond with valid JSON.' },
          { role: 'user', content: moderationPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      console.error('OpenAI API error:', await openaiResponse.text());
      throw new Error('OpenAI moderation failed');
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;
    
    let moderationResult;
    try {
      moderationResult = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      moderationResult = {
        approved: false,
        issues: ['Unable to parse moderation result'],
        confidence: 0.5,
        suggested_action: 'flag'
      };
    }

    // Determine moderation decision based on confidence and issues
    let moderationDecision = 'approved';
    if (moderationResult.confidence > 0.9 && moderationResult.issues.length > 0) {
      moderationDecision = 'removed';
    } else if (moderationResult.confidence >= 0.6 && moderationResult.issues.length > 0) {
      moderationDecision = 'flagged';
    }

    // Log moderation result
    const { error: logError } = await supabaseClient
      .from('content_moderation_log')
      .insert({
        content_type: contentType,
        content_id: contentId,
        user_id: userId,
        ai_confidence: moderationResult.confidence,
        issues_detected: moderationResult.issues,
        moderation_decision: moderationDecision,
        reviewed: false,
      });

    if (logError) {
      console.error('Error logging moderation:', logError);
    }

    return new Response(
      JSON.stringify({
        approved: moderationResult.approved && moderationDecision === 'approved',
        moderation_decision: moderationDecision,
        issues: moderationResult.issues,
        confidence: moderationResult.confidence,
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
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});