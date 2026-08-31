import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Redeploy: ensure latest error-handling logic is live
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

// Models tried in order until one succeeds. Reliable instruction-followers first.
const FREE_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.5-flash",
  "google/gemma-2-9b-it:free",
];

// Roughly sized per question (options + explanation), with a floor/ceiling.
function tokensForQuestions(count: number): number {
  return Math.min(8000, Math.max(2500, (Number(count) || 10) * 320 + 800));
}
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
  maxTokens: number,
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
      // Ask for machine-readable JSON. Models that don't support this field ignore it.
      response_format: { type: "json_object" },
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
  maxTokens: number,
): Promise<any> {
  try {
    return await tryModel(apiKey, model, systemPrompt, userPrompt, maxTokens);
  } catch (err) {
    const e = err as Error & { status?: number; body?: string };
    if (e.status !== 402) throw err;
    const match = e.body?.match(/can only afford (\d+)/i);
    const affordable = match ? Math.max(MIN_MAX_TOKENS, parseInt(match[1], 10) - 100) : MIN_MAX_TOKENS;
    console.log(`Retrying ${model} with reduced max_tokens=${affordable}`);
    return await tryModel(apiKey, model, systemPrompt, userPrompt, affordable);
  }
}

function stringifyContent(content: any): string {
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

function getMessageContent(aiData: any): string {
  const message = aiData?.choices?.[0]?.message;
  // Reasoning models often leave `content` empty and put the answer in
  // `reasoning` / `reasoning_content`, so fall back to those.
  return (
    stringifyContent(message?.content) ||
    stringifyContent(message?.reasoning_content) ||
    stringifyContent(message?.reasoning) ||
    ""
  );
}

function extractJsonCandidate(rawContent: string): string {
  const fenced = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const content = (fenced?.[1] ?? rawContent).trim();

  const objectStart = content.indexOf("{");
  const arrayStart = content.indexOf("[");

  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    const arrayEnd = content.lastIndexOf("]");
    if (arrayEnd > arrayStart) return content.slice(arrayStart, arrayEnd + 1);
    return content.slice(arrayStart);
  }

  if (objectStart !== -1) {
    const objectEnd = content.lastIndexOf("}");
    if (objectEnd > objectStart) return content.slice(objectStart, objectEnd + 1);
    return content.slice(objectStart);
  }

  return content;
}

// Repair a JSON array that was cut off mid-object by a token limit:
// keep everything up to the last complete `}` and close the array.
function repairTruncatedArray(candidate: string): string | null {
  const start = candidate.indexOf("[");
  if (start === -1) return null;
  const lastClose = candidate.lastIndexOf("}");
  if (lastClose <= start) return null;
  return `${candidate.slice(start, lastClose + 1)}]`;
}

function pickQuestions(parsed: any): any[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.questions)) return parsed.questions;
  if (parsed && typeof parsed === "object") {
    const firstArray = Object.values(parsed).find((v) => Array.isArray(v));
    if (Array.isArray(firstArray)) return firstArray as any[];
  }
  return null;
}

function parseQuestions(rawContent: string): ParsedQuestionsResult {
  if (!rawContent.trim()) return { error: "Response content was empty" };

  const candidate = extractJsonCandidate(rawContent);
  let parsed: any;
  let parseMessage = "";

  try {
    parsed = JSON.parse(candidate);
  } catch (err) {
    parseMessage = err instanceof Error ? err.message : String(err);
    const repaired = repairTruncatedArray(candidate);
    if (repaired) {
      try {
        parsed = JSON.parse(repaired);
        parseMessage = "";
      } catch {
        // fall through to the error below
      }
    }
  }

  if (parsed === undefined) {
    return { error: `Could not parse JSON (response may have been truncated): ${parseMessage}` };
  }

  const questions = pickQuestions(parsed);
  if (!questions) return { error: "JSON did not contain a questions array" };
  if (questions.length === 0) return { error: "Questions array was empty" };

  return { questions };
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
      `Return ONLY a valid JSON object of the form {"questions":[ ... ]}. No markdown, no code fences, no explanation outside the JSON. ` +
      `Each element of "questions": {"question_number":number,"question_text":"string","question_type":"multiple_choice|true_false|short_answer","options":["string","string","string","string"],"correct_answer":"string","explanation":"string","difficulty_level":"${difficultyDb}","points":1}. ` +
      `For true_false: options=[] and correct_answer="true" or "false". For short_answer: options=[]. ` +
      `Keep explanations to one short sentence so the JSON stays complete.`;

    const userPrompt =
      `Generate exactly ${question_count} questions about "${chapter.chapter_title}" for Grade ${grade} ${subject}.\n` +
      `Distribution: ${dist.multiple_choice} multiple choice, ${dist.true_false} true/false, ${dist.short_answer} short answer.\n` +
      `Difficulty: ${difficultyDb}\n` +
      `Key concepts: ${concepts}\n` +
      `Content: ${contentSnippet}\n` +
      `Learning outcomes: ${outcomes}\n\n` +
      `Return ONLY the JSON object {"questions":[...]}.`;

    const maxTokens = tokensForQuestions(question_count);

    // 6. Try models in order
    let usedModel = "";
    let questions: any[] | null = null;
    let tokensUsed = 0;
    const modelErrors: string[] = [];
    const startTime = Date.now();

    for (const model of FREE_MODELS) {
      try {
        console.log(`Trying model: ${model} (max_tokens=${maxTokens})`);
        const aiData = await tryModelWithCreditRetry(apiKey, model, systemPrompt, userPrompt, maxTokens);

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
