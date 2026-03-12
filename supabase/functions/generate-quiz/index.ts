import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OPENROUTER_BASE_URL, getOpenRouterHeaders, mapModel } from "../_shared/openrouter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getQuizTemplateName(subjectName: string): string {
  const normalized = subjectName.toLowerCase();
  if (normalized.includes('math')) return 'quiz_generation_mathematics';
  if (normalized.includes('life science') || normalized.includes('biology')) return 'quiz_generation_life_sciences';
  if (normalized.includes('english')) return 'quiz_generation_english';
  if (normalized.includes('physical science') || normalized.includes('physics') || normalized.includes('chemistry')) return 'quiz_generation_physical_sciences';
  return 'quiz_generation_mathematics';
}

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

    const { data: chapter, error: chapterError } = await supabaseClient
      .from('curriculum_chapters')
      .select('chapter_title, content_markdown, key_concepts, learning_outcomes, difficulty_level, subject_id, curriculum_subjects(subject_name, grade_level)')
      .eq('id', chapter_id)
      .single();

    if (chapterError || !chapter) throw new Error('Chapter not found');

    const subjectData = Array.isArray(chapter.curriculum_subjects) ? chapter.curriculum_subjects[0] : chapter.curriculum_subjects;
    const subject = subjectData?.subject_name || 'Unknown';
    const grade = subjectData?.grade_level || 10;

    const templateName = getQuizTemplateName(subject);
    const { data: templateData } = await supabaseClient
      .rpc('get_active_template', { p_template_name: templateName });

    let template = templateData?.[0];
    if (!template) {
      const { data: fallbackData } = await supabaseClient
        .rpc('get_active_template', { p_template_name: 'quiz_generation_mathematics' });
      template = fallbackData?.[0];
    }

    const openRouterHeaders = getOpenRouterHeaders();

    const variables: Record<string, string> = {
      grade_level: String(grade),
      chapter_title: chapter.chapter_title,
      question_count: String(question_count),
      key_concepts: chapter.key_concepts?.join(', ') || 'chapter concepts',
      question_type_distribution: JSON.stringify(question_type_distribution),
      difficulty_level: difficulty_level || chapter.difficulty_level || 'intermediate',
    };

    let systemPrompt: string;
    let userPrompt: string;
    let temperature = 0.7;
    let maxTokens = 4000;

    if (template) {
      systemPrompt = template.system_context || '';
      userPrompt = template.prompt_text;
      temperature = Number(template.temperature) || 0.7;
      maxTokens = template.max_tokens || 4000;

      for (const [key, value] of Object.entries(variables)) {
        userPrompt = userPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        systemPrompt = systemPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      }

      userPrompt += `\n\nContent summary: ${chapter.content_markdown?.substring(0, 2000) || 'No content'}\nLearning outcomes: ${chapter.learning_outcomes?.join('. ') || 'General understanding'}\n\nReturn ONLY the JSON array, no markdown formatting.`;
    } else {
      systemPrompt = `You are an expert South African CAPS curriculum educator creating assessment questions for Grade ${grade} ${subject}. Generate high-quality quiz questions testing understanding of: ${chapter.key_concepts?.join(', ') || 'chapter concepts'}. Align with CAPS standards. Return ONLY valid JSON array with this structure: [{"question_text": "string", "question_type": "multiple_choice|true_false|short_answer", "options": ["A", "B", "C", "D"], "correct_answer": "string", "explanation": "string", "difficulty_level": "beginner|intermediate|advanced", "points": 1}]`;
      userPrompt = `Generate ${question_count} questions about: ${chapter.chapter_title}.\n\nContent summary: ${chapter.content_markdown?.substring(0, 2000) || 'No content'}\nLearning outcomes: ${chapter.learning_outcomes?.join('. ') || 'General understanding'}\n\nQuestion distribution: ${JSON.stringify(question_type_distribution)}\nDifficulty: ${difficulty_level}\n\nReturn ONLY the JSON array, no markdown formatting.`;
    }

    let attempts = 0;
    let aiData;
    const startTime = Date.now();

    while (attempts < 3) {
      try {
        const aiResponse = await fetch(OPENROUTER_BASE_URL, {
          method: 'POST',
          headers: openRouterHeaders,
          body: JSON.stringify({
            model: mapModel(template?.model_name || 'gpt-4o-mini'),
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          console.error('OpenRouter API error:', errorText);
          throw new Error('OpenRouter API failed');
        }

        aiData = await aiResponse.json();
        break;
      } catch (error) {
        attempts++;
        if (attempts >= 3) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }

    const responseTime = Date.now() - startTime;
    const aiResponse = aiData.choices[0].message.content;
    const tokensUsed = aiData.usage?.total_tokens || 0;
    
    let questions;
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(aiResponse);
      }
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      if (template) {
        await supabaseClient.from('failed_ai_responses').insert({
          template_name: templateName,
          template_version: template.template_version,
          model_name: template.model_name,
          input_data: { chapter_id, question_count, difficulty_level, variables },
          ai_response: aiResponse,
          failure_reason: 'Invalid JSON format in response',
        });
      }
      throw new Error('Invalid question format generated');
    }

    const validatedQuestions = questions.map((q: any, index: number) => ({
      question_number: index + 1,
      question_text: q.question_text || '',
      question_type: q.question_type || 'multiple_choice',
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || q.detailed_explanation || '',
      difficulty_level: q.difficulty_level || difficulty_level,
      points: q.points || 1,
    }));

    if (template) {
      await supabaseClient.rpc('update_template_metrics', {
        p_template_name: templateName,
        p_template_version: template.template_version,
        p_success: true,
        p_rating: null,
        p_cost: tokensUsed * 0.00001,
      });
    }

    const { data: quiz, error: quizError } = await supabaseClient
      .from('quizzes')
      .insert({
        chapter_id,
        subject_name: subject,
        quiz_title: `${chapter.chapter_title} - Assessment`,
        quiz_description: `AI-generated quiz covering ${chapter.chapter_title}`,
        difficulty_level,
        total_questions: question_count,
        created_by: 'ai',
        is_published: true,
      })
      .select()
      .single();

    if (quizError || !quiz) throw new Error('Failed to create quiz');

    const questionsToInsert = validatedQuestions.map((q: any) => ({
      ...q,
      quiz_id: quiz.id,
    }));

    const { error: questionsError } = await supabaseClient
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) throw new Error('Failed to insert questions');

    return new Response(
      JSON.stringify({
        success: true,
        quiz_id: quiz.id,
        generated_questions: validatedQuestions,
        generation_metadata: {
          tokens_used: tokensUsed,
          model: aiData.model || template?.model_name || 'gpt-4o-mini',
          template_used: templateName,
          template_version: template?.template_version || 0,
          response_time_ms: responseTime,
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
      JSON.stringify({ success: false, error: errorMessage }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});