import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { OPENROUTER_BASE_URL, getOpenRouterHeaders } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { query, systemPrompt, userId, careerContext, messages } = requestBody;

    const isMessageFormat = Array.isArray(messages) && messages.length > 0;
    
    if (!isMessageFormat && !query) {
      throw new Error('Either "messages" array or "query" string is required');
    }

    const openRouterHeaders = getOpenRouterHeaders();

    console.log(`[Cerebras/OpenRouter] Processing request for user ${userId || 'anonymous'}`);
    const startTime = Date.now();

    let finalSystemPrompt = systemPrompt || 'You are a helpful AI assistant.';
    if (careerContext && !isMessageFormat) {
      const { strongSubjects, gradeLevel } = careerContext;
      finalSystemPrompt = `You are an expert South African career counselor helping a Grade ${gradeLevel} student. Strong subjects: ${strongSubjects?.join(', ') || 'Not yet determined'}. Provide quick, helpful career guidance using South African context. Be concise but encouraging.`;
    }

    const finalMessages = isMessageFormat 
      ? messages 
      : [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: query }
        ];

    // Use a fast, cheap model via OpenRouter for quick responses
    const response = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: openRouterHeaders,
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-70b-instruct',
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[OpenRouter] API Error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    console.log(`[OpenRouter] Response generated in ${responseTime}ms`);

    if (isMessageFormat) {
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        response: data.choices[0].message.content,
        model: data.model || 'llama-3.1-70b',
        responseTime,
        tokensUsed: data.usage?.total_tokens || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OpenRouter] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});