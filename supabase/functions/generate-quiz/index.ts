import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getQuizTemplateName(subjectName: string): string {
  const n = subjectName.toLowerCase();
  if (n.includes('math')) return 'quiz_generation_mathematics';
  if (n.includes('life science') || n.includes('biology')) return 'quiz_generation_life_sciences';
  if (n.includes('english')) return 'quiz_generation_english';
  if (n.includes('physical science') || n.includes('physics') || n.includes('chemistry')) return 'quiz_generation_physical_sciences';
  return 'quiz_generation_mathematics';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Check API key first
    const apiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (!apiKey) {
      return ok({
        success: false,
        error: 'OPENROUTER_API_KEY is not set. Go to Supabase Dashboard → Settings → Edge Functions → Secrets and add OPENROUTER_API_KEY.',
      });
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

    // 5. Try to load a prompt template (optional — fall back to hardcoded prompt)
    const templateName = getQuizTemplateName(subject);
    const { data: templateRows } = await supabase.rpc('get_active_template', { p_template_name: templateName });
    let template = templateRows?.[0];
    if (!template) {
      const { data: fallback } = await supabase.rpc('get_active_template', { p_template_name: 'quiz_generation_mathematics' });
      template = fallback?.[0];
    }

    // 6. Build prompts
    const dist = question_type_distribution || { multiple_choice: question_count, true_false: 0, short_answer: 0 };
    const difficulty = difficulty_level || 'intermediate';
    const contentSnippet = chapter.content_markdown?.substring(0, 2000) || 'No content available';
    const concepts = chapter.key_concepts?.join(', ') || 'key chapter concepts';
    const outcomes = chapter.learning_outcomes?.join('. ') || 'General understanding';

    let systemPrompt: string;
    let userPrompt: string;
    let temperature = 0.7;
    let maxTokens = 4000;
    let model = 'google/gemini-2.5-flash';

    if (template) {
      systemPrompt = template.system_context || '';
      userPrompt = template.prompt_text;
      temperature = Number(template.temperature) || 0.7;
      maxTokens = template.max_tokens || 4000;
      model = template.model_name || model;

      const vars: Record<string, string> = {
        grade_level: String(grade),
        chapter_title: chapter.chapter_title,
        question_count: String(question_count),
        key_concepts: concepts,
        question_type_distribution: JSON.stringify(dist),
        difficulty_level: difficulty,
      };
      for (const [k, v] of Object.entries(vars)) {
        userPrompt = userPrompt.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        systemPrompt = systemPrompt.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
      userPrompt += `\n\nContent: ${contentSnippet}\nLearning outcomes: ${outcomes}\n\nReturn ONLY a valid JSON array, no markdown.`;
    } else {
      systemPrompt = `You are an expert South African CAPS curriculum educator for Grade ${grade} ${subject}. Return ONLY a valid JSON array of quiz questions. Each item: {"question_number":number,"question_text":"string","question_type":"multiple_choice|true_false|short_answer","options":["A","B","C","D"],"correct_answer":"string","explanation":"string","difficulty_level":"${difficulty}","points":1}. For true_false use options:[] and correct_answer "true" or "false". For short_answer use options:[].`;
      userPrompt = `Generate exactly ${question_count} questions about "${chapter.chapter_title}" with this distribution: ${dist.multiple_choice} multiple choice, ${dist.true_false} true/false, ${dist.short_answer} short answer.\n\nKey concepts: ${concepts}\nContent: ${contentSnippet}\nLearning outcomes: ${outcomes}\n\nReturn ONLY the JSON array.`;
    }

    // Map model name to OpenRouter format
    const modelMap: Record<string, string> = {
      'gpt-4o-mini': 'openai/gpt-4o-mini',
      'gpt-4o': 'openai/gpt-4o',
      'gpt-4': 'openai/gpt-4',
      'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
    };
    // Use the same model confirmed working in extract-curriculum-content
    const resolvedModel = modelMap[model] || (model.includes('/') ? model : 'google/gemini-2.5-flash');

    // 7. Call OpenRouter with retry
    let aiData: any;
    const startTime = Date.now();

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(OPENROUTER_BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://edufutura.app',
          'X-Title': 'EduFutura',
        },
        body: JSON.stringify({
          model: resolvedModel,
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
        console.error(`OpenRouter attempt ${attempt + 1} failed:`, res.status, errText);
        if (attempt === 2) {
          return ok({ success: false, error: `OpenRouter API error ${res.status}: ${errText.slice(0, 300)}` });
        }
        await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
        continue;
      }

      aiData = await res.json();
      break;
    }

    const responseTime = Date.now() - startTime;
    const rawContent: string = aiData?.choices?.[0]?.message?.content || '';
    const tokensUsed = aiData?.usage?.total_tokens || 0;

    // 8. Parse questions
    let questions: any[];
    try {
      const match = rawContent.match(/\[[\s\S]*\]/);
      questions = JSON.parse(match ? match[0] : rawContent);
      if (!Array.isArray(questions)) throw new Error('Not an array');
    } catch {
      console.error('Failed to parse AI response:', rawContent);
      return ok({ success: false, error: 'AI returned an unexpected format. Please try again.' });
    }

    const validated = questions.map((q: any, i: number) => ({
      question_number: i + 1,
      question_text: q.question_text || '',
      question_type: q.question_type || 'multiple_choice',
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || q.detailed_explanation || '',
      difficulty_level: q.difficulty_level || difficulty,
      points: q.points || 1,
    }));

    // 9. Save quiz as draft
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        chapter_id,
        subject_name: subject,
        quiz_title: `${chapter.chapter_title} — AI Quiz`,
        quiz_description: `AI-generated quiz for Grade ${grade} ${subject}: ${chapter.chapter_title}`,
        difficulty_level: difficulty,
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
      console.error('Quiz insert error:', quizError);
      return ok({ success: false, error: `Failed to save quiz: ${quizError?.message}` });
    }

    const { error: qError } = await supabase
      .from('quiz_questions')
      .insert(validated.map((q: any) => ({ ...q, quiz_id: quiz.id })));

    if (qError) {
      console.error('Questions insert error:', qError);
      return ok({ success: false, error: `Failed to save questions: ${qError.message}` });
    }

    // 10. Update template metrics (best-effort)
    if (template) {
      await supabase.rpc('update_template_metrics', {
        p_template_name: templateName,
        p_template_version: template.template_version,
        p_success: true,
        p_rating: null,
        p_cost: tokensUsed * 0.00001,
      }).catch(() => {});
    }

    return ok({
      success: true,
      quiz_id: quiz.id,
      generated_questions: validated,
      generation_metadata: {
        tokens_used: tokensUsed,
        model: resolvedModel,
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
