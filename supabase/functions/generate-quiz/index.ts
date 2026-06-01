import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Redeploy: ensure latest error-handling logic is live
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Models tried in order until one succeeds. Free models first, paid as fallback.
const FREE_MODELS = [
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-2-9b-it:free",
  "google/gemini-2.5-flash",
];

const DEFAULT_MAX_TOKENS = 2000;
const MIN_MAX_TOKENS = 600;

type ParsedQuestionsResult =
  | { questions: any[]; error?: never }
  | { questions?: never; error: string };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeDifficulty(d: string): string {
  const map: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  };
  return map[d?.toLowerCase()] ?? "Intermediate";
}

async function tryModel(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = DEFAULT_MAX_TOKENS,
): Promise<any> {
  const res = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "https://edufutura.app",
      "X-Title": "EduFutura",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`${res.status}: ${text.slice(0, 300)}`) as Error & {
      status?: number;
      body?: string;
    };
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return res.json();
}

// Try a model; if it returns 402 ("can only afford N tokens"), retry once with
// a reduced max_tokens — this is the "loop again when limit reached" behavior.
async function tryModelWithCreditRetry(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<any> {
  try {
    return await tryModel(apiKey, model, systemPrompt, userPrompt, DEFAULT_MAX_TOKENS);
  } catch (err) {
    const e = err as Error & { status?: number; body?: string };
    if (e.status !== 402) throw err;
    const match = e.body?.match(/can only afford (\d+)/i);
    const affordable = match ? Math.max(MIN_MAX_TOKENS, parseInt(match[1], 10) - 100) : MIN_MAX_TOKENS;
    console.log(`Retrying ${model} with reduced max_tokens=${affordable}`);
    return await tryModel(apiKey, model, systemPrompt, userPrompt, affordable);
  }
}

function getMessageContent(aiData: any): string {
  const content = aiData?.choices?.[0]?.message?.content;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function extractJsonCandidate(rawContent: string): string {
  const fenced = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const content = (fenced?.[1] ?? rawContent).trim();

  const objectStart = content.indexOf("{");
  const arrayStart = content.indexOf("[");

  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    const arrayEnd = content.lastIndexOf("]");
    if (arrayEnd > arrayStart) return content.slice(arrayStart, arrayEnd + 1);
  }

  if (objectStart !== -1) {
    const objectEnd = content.lastIndexOf("}");
    if (objectEnd > objectStart) return content.slice(objectStart, objectEnd + 1);
  }

  return content;
}

function parseQuestions(rawContent: string): ParsedQuestionsResult {
  if (!rawContent.trim()) return { error: "Response content was empty" };

  try {
    const parsed = JSON.parse(extractJsonCandidate(rawContent));
    const questions = Array.isArray(parsed) ? parsed : parsed?.questions;

    if (!Array.isArray(questions)) {
      return { error: "JSON did not contain a questions array" };
    }

    if (questions.length === 0) {
      return { error: "Questions array was empty" };
    }

    return { questions };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `Could not parse JSON: ${message}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. API key check
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: "OPENROUTER_API_KEY is not set in Supabase Edge Function secrets.",
      });
    }

    // 2. Auth
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return jsonResponse({ success: false, error: "Unauthorized" });

    // 3. Parse body
    const { chapter_id, question_count, difficulty_level, question_type_distribution } =
      await req.json();

    if (!chapter_id) return jsonResponse({ success: false, error: "chapter_id is required" });

    // 4. Load chapter + subject
    const { data: chapter, error: chapterError } = await supabase
      .from("curriculum_chapters")
      .select(
        "chapter_title, content_markdown, key_concepts, learning_outcomes, difficulty_level, subject_id, curriculum_subjects(subject_name, grade_level)",
      )
      .eq("id", chapter_id)
      .single();

    if (chapterError || !chapter) {
      return jsonResponse({ success: false, error: `Chapter not found: ${chapterError?.message}` });
    }

    const subjectData = Array.isArray(chapter.curriculum_subjects)
      ? chapter.curriculum_subjects[0]
      : chapter.curriculum_subjects;
    const subject: string = subjectData?.subject_name ?? "Unknown";
    const grade: number = subjectData?.grade_level ?? 10;

    // 5. Build prompts
    const dist = question_type_distribution ?? {
      multiple_choice: question_count,
      true_false: 0,
      short_answer: 0,
    };
    const difficultyDb = normalizeDifficulty(difficulty_level ?? "intermediate");
    const contentSnippet = chapter.content_markdown?.substring(0, 2000) ?? "No content available";
    const concepts = chapter.key_concepts?.join(", ") ?? "key chapter concepts";
    const outcomes = chapter.learning_outcomes?.join(". ") ?? "General understanding";

    const systemPrompt =
      `You are an expert South African CAPS curriculum educator for Grade ${grade} ${subject}. ` +
      `Return ONLY a valid JSON array. No markdown, no code fences, no explanation outside the array. ` +
      `Each element: {"question_number":number,"question_text":"string","question_type":"multiple_choice|true_false|short_answer","options":["string","string","string","string"],"correct_answer":"string","explanation":"string","difficulty_level":"${difficultyDb}","points":1}. ` +
      `For true_false: options=[] and correct_answer="true" or "false". For short_answer: options=[].`;

    const userPrompt =
      `Generate exactly ${question_count} questions about "${chapter.chapter_title}" for Grade ${grade} ${subject}.\n` +
      `Distribution: ${dist.multiple_choice} multiple choice, ${dist.true_false} true/false, ${dist.short_answer} short answer.\n` +
      `Difficulty: ${difficultyDb}\n` +
      `Key concepts: ${concepts}\n` +
      `Content: ${contentSnippet}\n` +
      `Learning outcomes: ${outcomes}\n\n` +
      `Return ONLY the JSON array.`;

    // 6. Try free models in order
    let usedModel = "";
    let questions: any[] | null = null;
    let tokensUsed = 0;
    const modelErrors: string[] = [];
    const startTime = Date.now();

    for (const model of FREE_MODELS) {
      try {
        console.log(`Trying model: ${model}`);
        const aiData = await tryModelWithCreditRetry(apiKey, model, systemPrompt, userPrompt);
        const rawContent = getMessageContent(aiData);
        const parsed = parseQuestions(rawContent);

        if (parsed.error) {
          const preview = rawContent.slice(0, 200) || "[empty response]";
          throw new Error(`AI returned unexpected format: ${parsed.error}. Preview: ${preview}`);
        }

        questions = parsed.questions;
        tokensUsed = aiData?.usage?.total_tokens ?? 0;
        usedModel = model;
        console.log(`Success with model: ${model}`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Model ${model} failed: ${msg}`);
        modelErrors.push(`${model}: ${msg}`);
      }
    }

    if (!questions) {
      return jsonResponse({
        success: false,
        error: `All models failed. ${modelErrors.join(" | ")}`,
      });
    }

    const responseTime = Date.now() - startTime;

    const validated = questions.map((q: any, i: number) => ({
      question_number: i + 1,
      question_text: q.question_text ?? "",
      question_type: q.question_type ?? "multiple_choice",
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer ?? "",
      explanation: q.explanation ?? "",
      difficulty_level: normalizeDifficulty(q.difficulty_level ?? difficulty_level),
      points: q.points ?? 1,
    }));

    // 8. Save quiz as draft
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
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
      console.error("Quiz insert error:", JSON.stringify(quizError));
      return jsonResponse({
        success: false,
        error: `Failed to create quiz: ${quizError?.message} (code: ${quizError?.code})`,
      });
    }

    // 9. Save questions
    const { error: qError } = await supabase
      .from("quiz_questions")
      .insert(validated.map((q: any) => ({ ...q, quiz_id: quiz.id })));

    if (qError) {
      console.error("Questions insert error:", JSON.stringify(qError));
      await supabase.from("quizzes").delete().eq("id", quiz.id);
      return jsonResponse({
        success: false,
        error: `Failed to save questions: ${qError.message} (code: ${qError.code})`,
      });
    }

    return jsonResponse({
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
    console.error("Unhandled error:", err);
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : "Unexpected server error",
    });
  }
});
