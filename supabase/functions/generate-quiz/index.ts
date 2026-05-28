import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free models on OpenRouter — tried in order until one succeeds
const FREE_MODELS = [
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
];

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Normalize difficulty to title case for DB (Beginner / Intermediate / Advanced)
function normalizeDifficulty(d: string): string {
  const map: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  return map[d?.toLowerCase()] || 'Intermediate';
}

async function callOpenRouter(apiKey: string, model: string, systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number): Promise<any> {
  const res = await fetch(OPENROUTER_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://edufutura.app',
      'X-Title': 'EduFutura',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${res.status}: ${errText.slice(0, 200)}`);
  }

  return await res.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Check API key
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      return ok({ success: false, error: 'OPENROUTER_API_KEY is not set in Supabase Edge Function secrets.' });
    }

    // 2. Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return ok({ success: false, error: 'Unauthorized' });

    // 3. Parse body
    const { chapter_id, question_count, difficulty_level, question_type_distribution } = await req.json();
    if (!chapter_id) return ok({ success: false, error: 'chapter_id is required' });

    // 4. Load chapter + subject
    const { data: chapter, error: chapterError } = await supabase
      .from('curriculum_chapters')
      .select('chapter_title, content_markdown, key_concepts, learning_outcomes, difficulty_level, subject_id, curriculum_subjects(subject_name, grade_level)')
      .eq('id', chapter_id)
      .single();

    if (chapterError || !chapter) {
      return ok({ success: false, error: `Chapter not found: ${chapterError?.message}` });
    }

    const subjectData = Array.isArray(chapter.curriculum_subjects)
      ? chapter.curriculum_subjects[0]
      : chapter.curriculum_subjects;
    const subject = subjectData?.subject_name || 'Unknown';
    const grade = subjectData?.grade_level || 10;

    // 5. Build prompts
    const dist = question_type_distribution || { multiple_choice: question_count, true_false: 0, short_answer: 0 };
    const difficulty = difficulty_level || 'intermediate';
    const difficultyDb = normalizeDifficulty(difficulty); // title case for DB
    const contentSnippet = chapter.content_markdown?.substring(0, 2000) || 'No content available';
    const concepts = chapter.key_concepts?.join(', ') || 'key chapter concepts';
    const outcomes = chapter.learning_outcomes?.join('. ') || 'General understanding';

    const systemPrompt = `You are an expert South African CAPS curriculum educator for Grade ${grade} ${subject}. Return ONLY a valid JSON array of quiz questions with no markdown, no code blocks, no extra text. Each item must have exactly: {"question_number":number,"question_text":"string","question_type":"multiple_choice|true_false|short_answer","options":["string","string","string","string"],"correct_answer":"string","explanation":"string","difficulty_level":"${difficultyDb}","points":1}. For true_false: options must be [] and correct_answer must be "true" or "false". For short_answer: options must be [].`;

    const userPrompt = `Generate exactly ${question_count} questions about "${chapter.chapter_title}" for Grade ${grade} ${subject}.\n\nDistribution: ${dist.multiple_choice} multiple choice, ${dist.true_false} true/false, ${dist.short_answer} short answer.\nDifficulty: ${difficultyDb}\nKey concepts: ${concepts}\nContent: ${contentSnippet}\nLearning outcomes: ${outcomes}\n\nReturn ONLY the JSON array. No markdown. No explanation outside the array.`;

    // 6. Try free models in order until one works
    let aiData: any = null;
    let usedModel = '';
    const modelErrors: string[] = [];
    const startTime = Date.now();

    for (const model of FREE_MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        aiData = await callOpenRouter(apiKey, model, systemPrompt, userPrompt, 0.7, 4000);
        usedModel = model;
        console.log(`Success with model: ${model}`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Model ${model} failed: ${msg}`);
        modelErrors.push(`${model}: ${msg}`);
      }
    }

    if (!aiData) {
      return ok({
        success: false,
        error: `All models failed. Errors: ${modelErrors.join(' | ')}`,
      });
    }

    const responseTime = Date.now() - startTime;
    const rawContent: string = aiData?.choices?.[0]?.message?.content || '';
    const tokensUsed = aiData?.usage?.total_tokens || 0;

    // 7. Parse questions
    let questions: any[];
    try {
      const match = rawContent.match(/\[[\s\S]*\]/);
      questions = JSON.parse(match ? match[0] : rawContent);
      if (!Array.isArray(questions)) throw new Error('Not an array');
    } catch {
      console.error('Failed to parse AI response:', rawContent.slice(0, 500));
      return ok({ success: false, error: `AI returned unexpected format. Raw: ${rawContent.slice(0, 200)}` });
    }

    const validated = questions.map((q: any, i: number) => ({
      question_number: i + 1,
      question_text: q.question_text || '',
      question_type: q.question_type || 'multiple_choice',
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      difficulty_level: normalizeDifficulty(q.difficulty_level || difficulty),
      points: q.points || 1,
    }));

    // 8. Save quiz as draft — use title-case difficulty for DB
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        chapter_id,
        subject_name: subject,
        quiz_title: `${chapter.chapter_title} — AI Quiz`,
        quiz_description: `AI-generated quiz for Grade ${grade} ${subject}: ${chapter.chapter_title}`,
        difficulty_level: difficultyDb,
        total_questions: validated.length,
        created_by: user.id,
        is_published: false,
        passing_score_percentage: 75,
        question_shuffle: true,
        option_shuffle: true,
        instant_feedback: false,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      console.error('Quiz insert error:', JSON.stringify(quizError));
      return ok({ success: false, error: `Failed to create quiz: ${quizError?.message} (code: ${quizError?.code})` });
    }

    // 9. Save questions
    const { error: qError } = await supabase
      .from('quiz_questions')
      .insert(validated.map((q: any) => ({ ...q, quiz_id: quiz.id })));

    if (qError) {
      console.error('Questions insert error:', JSON.stringify(qError));
      // Clean up the quiz if questions failed
      await supabase.from('quizzes').delete().eq('id', quiz.id);
      return ok({ success: false, error: `Failed to save questions: ${qError.message} (code: ${qError.code})` });
    }

    return ok({
      success: true,
      quiz_id: quiz.id,
      generated_questions: validated,
      generation_metadata: {
        tokens_used: tokensUsed,
        model: usedModel,
        response_time_ms: responseTime,
      },
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    return ok({
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected server error',
    });
  }
});
