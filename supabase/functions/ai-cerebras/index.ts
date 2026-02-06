import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { query, systemPrompt, userId, careerContext, messages } = requestBody;

    // Support two formats:
    // 1. Chat format: { messages: [...] } - for compatibility
    // 2. Simple format: { query, systemPrompt } - used by AI chat modal
    const isMessageFormat = Array.isArray(messages) && messages.length > 0;
    
    if (!isMessageFormat && !query) {
      throw new Error('Either "messages" array or "query" string is required');
    }

    const CEREBRAS_API_KEY = Deno.env.get('CEREBRAS_API_KEY');
    if (!CEREBRAS_API_KEY) {
      throw new Error('CEREBRAS_API_KEY is not configured');
    }

    console.log(`[Cerebras] Processing request for user ${userId || 'anonymous'}`);
    const startTime = Date.now();

    // Build final system prompt
    let finalSystemPrompt = systemPrompt || 'You are a helpful AI assistant.';
    if (careerContext && !isMessageFormat) {
      const { strongSubjects, gradeLevel } = careerContext;
      finalSystemPrompt = `You are an expert South African career counselor helping a Grade ${gradeLevel} student. Strong subjects: ${strongSubjects?.join(', ') || 'Not yet determined'}. Provide quick, helpful career guidance using South African context. Be concise but encouraging.`;
    }

    // Build messages array
    const finalMessages = isMessageFormat 
      ? messages 
      : [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: query }
        ];

    // Call Cerebras API
    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.1-70b',
        messages: finalMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Cerebras] API Error:', error);
      throw new Error(`Cerebras API error: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    console.log(`[Cerebras] Response generated in ${responseTime}ms`);

    // Return in format compatible with both use cases
    if (isMessageFormat) {
      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        response: data.choices[0].message.content,
        model: 'cerebras-llama3.1-70b',
        responseTime,
        tokensUsed: data.usage?.total_tokens || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[Cerebras] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        fallback: true 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});