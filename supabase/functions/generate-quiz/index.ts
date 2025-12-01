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

    const { chapter_id, question_count, difficulty_level, question_type_distribution } = await req.json();

    // Get chapter content for context
    const { data: chapter, error: chapterError } = await supabaseClient
      .from('curriculum_chapters')
      .select('chapter_title, content_markdown, key_concepts, learning_outcomes, difficulty_level, subject_id, curriculum_subjects(subject_name, grade_level)')
      .eq('id', chapter_id)
      .single();

    if (chapterError || !chapter) {
      throw new Error('Chapter not found');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const subjectData = Array.isArray(chapter.curriculum_subjects) ? chapter.curriculum_subjects[0] : chapter.curriculum_subjects;
    const subject = subjectData?.subject_name || 'Unknown';
    const grade = subjectData?.grade_level || 10;

    // Retry logic with exponential backoff
    let attempts = 0;
    let openaiData;
    while (attempts < 3) {
      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an expert South African CAPS curriculum educator creating assessment questions for Grade ${grade} ${subject}. Generate high-quality quiz questions testing understanding of: ${chapter.key_concepts?.join(', ') || 'chapter concepts'}. Align with CAPS standards. Return ONLY valid JSON array with this structure: [{"question_text": "string", "question_type": "multiple_choice|true_false|short_answer", "options": ["A", "B", "C", "D"], "correct_answer": "string", "explanation": "string", "difficulty_level": "beginner|intermediate|advanced", "points": 1}]`
              },
              {
                role: 'user',
                content: `Generate ${question_count} questions about: ${chapter.chapter_title}. 
                
Content summary: ${chapter.content_markdown?.substring(0, 2000) || 'No content'}
Learning outcomes: ${chapter.learning_outcomes?.join('. ') || 'General understanding'}

Question distribution: ${JSON.stringify(question_type_distribution)}
Difficulty: ${difficulty_level}

Return ONLY the JSON array, no markdown formatting.`
              }
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error('OpenAI API error:', errorText);
          throw new Error('OpenAI API failed');
        }

        openaiData = await openaiResponse.json();
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        if (attempts >= 3) throw error;
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    const aiResponse = openaiData.choices[0].message.content;
    
    // Parse generated questions
    let questions;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Invalid question format generated');
    }

    // Validate question structure
    const validatedQuestions = questions.map((q: any, index: number) => ({
      question_number: index + 1,
      question_text: q.question_text || '',
      question_type: q.question_type || 'multiple_choice',
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      difficulty_level: q.difficulty_level || difficulty_level,
      points: q.points || 1,
    }));

    // Create quiz
    const { data: quiz, error: quizError } = await supabaseClient
      .from('quizzes')
      .insert({
        chapter_id,
        subject_name: subject,
        quiz_title: `${chapter.chapter_title} - Assessment`,
        quiz_description: `AI-generated quiz covering ${chapter.chapter_title}`,
        difficulty_level,
        total_questions: question_count,
        created_by: user.id,
        is_published: true,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      throw new Error('Failed to create quiz');
    }

    // Insert questions
    const questionsToInsert = validatedQuestions.map((q: any) => ({
      ...q,
      quiz_id: quiz.id,
    }));

    const { error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      throw new Error('Failed to insert questions');
    }

    return new Response(
      JSON.stringify({
        success: true,
        quiz_id: quiz.id,
        generated_questions: validatedQuestions,
        generation_metadata: {
          tokens_used: openaiData.usage?.total_tokens || 0,
          model: 'gpt-4o-mini',
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Quiz generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Unauthorized') ? 401 : 
                   errorMessage.includes('not found') ? 404 :
                   errorMessage.includes('not configured') ? 503 : 500;
    
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
