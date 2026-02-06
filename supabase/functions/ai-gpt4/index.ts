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
    const { query, systemPrompt, userId, careerContext, messages, temperature, max_tokens } = requestBody;

    // Support two formats:
    // 1. Chat format: { messages: [...] } - used by quiz grading
    // 2. Simple format: { query, systemPrompt } - used by AI chat modal
    const isMessageFormat = Array.isArray(messages) && messages.length > 0;
    
    if (!isMessageFormat && !query) {
      throw new Error('Either "messages" array or "query" string is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    console.log(`[GPT-4] Processing request for user ${userId || 'anonymous'}, format: ${isMessageFormat ? 'messages' : 'query'}`);
    const startTime = Date.now();

    let finalMessages;

    if (isMessageFormat) {
      // Use messages array directly (for quiz grading, etc.)
      finalMessages = messages;
    } else {
      // Build messages from query/systemPrompt (for AI chat)
      let finalSystemPrompt = systemPrompt || 'You are a helpful AI assistant.';
      
      if (careerContext) {
        const { strongSubjects, careerRecommendations, gradeLevel, province, savedInstitutions } = careerContext;
        
        finalSystemPrompt = `You are an expert South African career counselor and educational assistant helping a Grade ${gradeLevel} student in ${province}. 

STUDENT CONTEXT:
- Strong subjects: ${strongSubjects?.join(', ') || 'Not yet determined'}
- Top career recommendations: ${careerRecommendations?.map((c: any) => c.name).join(', ') || 'None yet'}
- Saved institutions: ${savedInstitutions?.map((i: any) => i.name).join(', ') || 'None yet'}

GUIDANCE PRINCIPLES:
1. Provide thoughtful, age-appropriate career guidance grounded in South African context
2. Reference local universities, job market realities, and cultural considerations
3. Encourage exploration while being realistic about requirements and opportunities
4. Mention NSFAS and bursary opportunities when discussing tertiary education
5. Consider provincial context and local institution availability
6. Proactively suggest career paths aligned with strong subjects
7. Use South African Rand (ZAR) when discussing salaries
8. Reference CAPS curriculum subjects and APS scores

When students excel in certain subjects, proactively mention relevant career opportunities. Be encouraging but realistic about entry requirements and career prospects.`;
      }

      finalMessages = [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: query }
      ];
    }

    // Call OpenAI GPT-4 API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: finalMessages,
        temperature: temperature ?? 0.8,
        max_tokens: max_tokens ?? 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GPT-4] API Error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    console.log(`[GPT-4] Response generated in ${responseTime}ms`);

    // Return in format compatible with both use cases
    // For messages format: return full OpenAI response structure (for quiz grading)
    // For query format: return simplified response (for AI chat)
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
        model: 'gpt-4-turbo-preview',
        responseTime,
        tokensUsed: data.usage?.total_tokens || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[GPT-4] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});