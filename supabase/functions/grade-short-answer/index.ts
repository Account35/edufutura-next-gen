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

    const { question_id, student_answer, attempt_id } = await req.json();

    // Get question details
    const { data: question, error: questionError } = await supabaseClient
      .from('quiz_questions')
      .select('*, quizzes(subject_name)')
      .eq('id', question_id)
      .single();

    if (questionError || !question) {
      throw new Error('Question not found');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const gradingPrompt = `You are grading a South African CAPS curriculum assessment for ${question.quizzes?.subject_name || 'a subject'}.

Question: ${question.question_text}
Expected Answer: ${question.correct_answer}
Student Answer: ${student_answer}
Maximum Points: ${question.points || 1}

Evaluate the student's answer:
1. Award points (0 to ${question.points || 1}) with partial credit for partially correct answers
2. Identify concepts demonstrated correctly
3. Note missing or incorrect concepts
4. Provide constructive feedback

Return ONLY valid JSON in this format:
{
  "score": number,
  "feedback": "string",
  "concepts_demonstrated": ["concept1", "concept2"],
  "concepts_missing": ["concept3"],
  "is_correct": boolean,
  "confidence": number (0-1)
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert educator providing fair and consistent grading. Always respond with valid JSON.' },
          { role: 'user', content: gradingPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('AI grading service unavailable');
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0].message.content;
    
    let gradingResult;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        gradingResult = JSON.parse(jsonMatch[0]);
      } else {
        gradingResult = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse grading response:', aiResponse);
      throw new Error('Invalid grading format');
    }

    // Validate score within range
    const score = Math.max(0, Math.min(question.points || 1, gradingResult.score || 0));
    const confidence = gradingResult.confidence || 0.5;
    const needsReview = confidence < 0.6;

    // Update attempt with grading results
    if (attempt_id) {
      const { data: attempt } = await supabaseClient
        .from('quiz_attempts')
        .select('answers')
        .eq('id', attempt_id)
        .single();

      if (attempt) {
        const answers = attempt.answers || {};
        answers[question_id] = {
          ...(answers[question_id] || {}),
          student_answer,
          ai_score: score,
          ai_feedback: gradingResult.feedback,
          graded_at: new Date().toISOString(),
          needs_review: needsReview,
        };

        await supabaseClient
          .from('quiz_attempts')
          .update({ answers })
          .eq('id', attempt_id);
      }
    }

    // Log grading for audit
    await supabaseClient
      .from('ai_feedback')
      .insert({
        user_id: user.id,
        message_id: question_id, // Using question_id as reference
        rating: needsReview ? 3 : 5,
        feedback_text: `Auto-graded: ${score}/${question.points}. Confidence: ${confidence.toFixed(2)}`,
      })
      .then(() => {}, () => {}); // Ignore errors in audit logging

    return new Response(
      JSON.stringify({
        success: true,
        score,
        feedback: gradingResult.feedback,
        concepts_demonstrated: gradingResult.concepts_demonstrated || [],
        concepts_missing: gradingResult.concepts_missing || [],
        is_correct: gradingResult.is_correct || false,
        confidence,
        needs_review: needsReview,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Grading error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                   errorMessage.includes('not found') ? 404 :
                   errorMessage.includes('unavailable') ? 503 : 500;
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
