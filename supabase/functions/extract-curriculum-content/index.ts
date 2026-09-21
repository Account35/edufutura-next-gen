// Extract curriculum content from uploaded files (PDF, CSV, XLSX, MD, TXT)
// AI provider routing: OpenRouter primary -> Lovable AI Gateway fallback
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { extractText, getDocumentProxy } from 'https://esm.sh/unpdf@0.12.1';
import { structureChapters } from './structuring.ts';
import { attachVideosToChapters } from './videoMatching.ts';
import { aggregateItems, normalizeItems, type ExtractedItem, type GradeGroup } from './multiGrade.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_TEXT_CHARS_FOR_MODEL = 18000;
const TEXT_CHUNK_CHARS = 9000;
const MAX_CHUNKS = 8;
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const MAX_SPREADSHEET_BYTES = 6 * 1024 * 1024;
const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;
const MAX_PDF_PAGES = 80;

// Page-level extraction: small batches keep each grade visible to the model.
const PAGES_PER_BATCH = 4;
const PAGE_CHUNK_CHARS = 12000;
const MAX_PAGE_BATCHES = 24;
// Per-AI-call ceiling. Must stay well under the platform's 150s idle limit.
const BATCH_TIMEOUT_MS = 40000;
const BATCH_SPACING_MS = 250;
// Batches run in small parallel waves so a long document still finishes.
const BATCH_CONCURRENCY = 3;
// Hard wall-clock budget for the AI phase; whatever is not done by then is
// reported as skipped instead of letting the request idle out (504).
const AI_PHASE_BUDGET_MS = 95000;
// Remaining budget required before the optional video-matching phase runs.
const VIDEO_PHASE_BUDGET_MS = 20000;

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeExtractedText(rawText: string): string {
  return rawText
    .split('\0').join(' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') {
      return status;
    }
  }
  return null;
}

function isAllowedRole(role: unknown): boolean {
  return role === 'admin' || role === 'educator';
}

function buildModelExcerpt(rawText: string, maxChars = MAX_TEXT_CHARS_FOR_MODEL): string {
  const normalized = normalizeExtractedText(rawText);
  if (normalized.length <= maxChars) {
    return normalized;
  }

  const sectionSize = Math.floor(maxChars / 3);
  const head = normalized.slice(0, sectionSize);
  const middleStart = Math.max(0, Math.floor(normalized.length / 2) - Math.floor(sectionSize / 2));
  const middle = normalized.slice(middleStart, middleStart + sectionSize);
  const tail = normalized.slice(-sectionSize);

  return [
    head,
    '[... middle of document omitted for size ...]',
    middle,
    '[... end of document excerpt ...]',
    tail,
  ].join('\n\n');
}

function splitTextIntoChunks(rawText: string, chunkChars = TEXT_CHUNK_CHARS, maxChunks = MAX_CHUNKS): string[] {
  const text = normalizeExtractedText(rawText);
  if (text.length <= chunkChars) return [text];

  const chunks: string[] = [];
  let i = 0;
  while (i < text.length && chunks.length < maxChunks) {
    let end = Math.min(text.length, i + chunkChars);
    if (end < text.length) {
      // Try to break at a paragraph or sentence boundary near `end`.
      const slice = text.slice(i, end);
      const lastPara = slice.lastIndexOf('\n\n');
      const lastSentence = slice.lastIndexOf('. ');
      const boundary = Math.max(lastPara, lastSentence);
      if (boundary > chunkChars * 0.5) {
        end = i + boundary + 1;
      }
    }
    chunks.push(text.slice(i, end).trim());
    i = end;
  }
  return chunks.filter(Boolean);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function detectGrade(rawText: string, fileName: string): number {
  const haystack = `${fileName}\n${rawText}`.toLowerCase();
  const gradeMatch = haystack.match(/\bgrade\s*(\d{1,2})\b/);
  if (gradeMatch) {
    const grade = Number(gradeMatch[1]);
    if (grade >= 4 && grade <= 12) return grade;
  }

  const numericMatch = fileName.match(/\b(?:gr|g)(\d{1,2})\b/i);
  if (numericMatch) {
    const grade = Number(numericMatch[1]);
    if (grade >= 4 && grade <= 12) return grade;
  }

  return 10;
}

function detectSubject(rawText: string, fileName: string): string {
  const haystack = `${fileName}\n${rawText}`.toLowerCase();
  const candidates = [
    'Mathematics',
    'Physical Sciences',
    'Life Sciences',
    'English',
    'Geography',
    'History',
    'Accounting',
    'Business Studies',
    'Economics',
    'Life Orientation',
    'Natural Sciences',
    'Technology',
  ];

  return candidates.find((subject) => haystack.includes(subject.toLowerCase())) || 'Imported Curriculum';
}

function getKeyConcepts(text: string): string[] {
  const stopWords = new Set([
    'about', 'after', 'again', 'also', 'because', 'before', 'being', 'between', 'chapter', 'content',
    'could', 'during', 'each', 'from', 'grade', 'have', 'into', 'learn', 'lesson', 'must', 'should',
    'students', 'their', 'there', 'these', 'this', 'through', 'under', 'using', 'where', 'which', 'with',
  ]);

  const counts = new Map<string, number>();
  for (const match of text.toLowerCase().matchAll(/\b[a-z][a-z-]{3,}\b/g)) {
    const word = match[0];
    if (stopWords.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([word]) => titleCase(word));
}

function buildLocalExtraction(rawText: string, fileName: string, aiError: string): Record<string, unknown> {
  const normalized = normalizeExtractedText(rawText);
  const headingPattern = /^(?:#{1,4}\s*)?(?:chapter|unit|module|topic|section)\s+\d+[:.\-\s]+(.+)$/gim;
  const matches = [...normalized.matchAll(headingPattern)];

  const sections: { title: string; content: string }[] = [];
  if (matches.length > 0) {
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      const next = matches[index + 1];
      const start = match.index ?? 0;
      const end = next?.index ?? normalized.length;
      const content = normalized.slice(start, end).trim();
      const title = match[1]?.trim() || `Chapter ${index + 1}`;
      if (content) sections.push({ title, content });
    }
  }

  if (sections.length === 0) {
    const chunks = splitTextIntoChunks(normalized, 6000, 10);
    chunks.forEach((content, index) => {
      sections.push({
        title: chunks.length === 1 ? fileName.replace(/\.[^.]+$/, '') : `Imported Section ${index + 1}`,
        content,
      });
    });
  }

  const chapters = sections.slice(0, 20).map((section, index) => ({
    chapter_number: index + 1,
    chapter_title: titleCase(section.title.replace(/[_-]+/g, ' ').slice(0, 90)) || `Imported Section ${index + 1}`,
    chapter_description: section.content.slice(0, 220).replace(/\s+/g, ' '),
    content_markdown: section.content,
    difficulty_level: 'Intermediate',
    estimated_duration_minutes: Math.max(20, Math.min(90, Math.round(section.content.length / 1200) * 15 || 30)),
    caps_code: '',
    key_concepts: getKeyConcepts(section.content),
  }));

  return {
    detected_grade: detectGrade(normalized, fileName),
    detected_subject: detectSubject(normalized, fileName),
    confidence: 0.45,
    provider_used: 'local',
    ai_error: `AI extraction is unavailable: ${aiError}. A local text-based extraction was created so you can still review and save the content.`,
    chapters,
  };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const EXTRACTION_TOOL = {
  type: 'function',
  function: {
    name: 'extract_curriculum',
    description: 'Extract every curriculum topic found in this section, one entry per grade level.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'One object per topic per grade level found in this section.',
          items: {
            type: 'object',
            properties: {
              grade_level: { type: 'integer', description: 'The grade this topic belongs to (1-12)' },
              subject: { type: 'string', description: 'Subject name, e.g. Mathematics, Natural Sciences' },
              chapter_title: { type: 'string', description: 'The module / chapter / unit this topic sits under' },
              topic_title: { type: 'string', description: 'The topic name' },
              key_concepts: { type: 'array', items: { type: 'string' } },
              content_markdown: { type: 'string', description: "The topic's content in Markdown, taken from this section" },
            },
            required: ['grade_level', 'subject', 'chapter_title', 'topic_title', 'content_markdown'],
          },
        },
      },
      required: ['items'],
    },
  },
};

const SYSTEM_PROMPT = `You are an expert South African CAPS curriculum analyst.
You receive the raw text of a small section (a few pages) of a teacher's source document.

Extract EVERY grade level, subject, chapter title, and topic individually.
If the section mentions multiple grade levels (e.g. Grade 4 and Grade 6), do NOT summarize or
collapse them into a single entry. Return separate objects for each grade.

Rules:
- One object per topic per grade. Never merge two grades into one object.
- Never invent grades, subjects, topics or content that is not in this section.
- If a grade is not stated for a topic, use the nearest grade stated earlier in this section.
- chapter_title is the module/unit/term the topic belongs to; topic_title is the topic itself.
- content_markdown must contain that topic's real content from this section, in Markdown.
- Return everything via the extract_curriculum tool. Do not respond with prose.
- If the section contains no curriculum content (cover page, index, blank), return an empty items array.`;

/**
 * Read the source file as an ordered list of pages (PDF) or small text
 * sections (everything else). Page boundaries are preserved so multi-grade
 * documents are never trimmed down to a single "excerpt".
 */
async function extractPagesFromFile(fileBytes: Uint8Array, fileName: string): Promise<string[]> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    if (fileBytes.byteLength > MAX_TEXT_FILE_BYTES) {
      throw new Error('Text or Markdown files must be 2MB or smaller for AI extraction. Split the document and try again.');
    }
    return splitTextIntoChunks(new TextDecoder().decode(fileBytes), PAGE_CHUNK_CHARS, MAX_PAGE_BATCHES);
  }

  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    if (fileBytes.byteLength > MAX_SPREADSHEET_BYTES) {
      throw new Error('Spreadsheet files must be 6MB or smaller for AI extraction. Split the workbook and try again.');
    }
    const wb = XLSX.read(fileBytes, { type: 'array' });
    const out: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      for (const part of splitTextIntoChunks(csv, PAGE_CHUNK_CHARS, MAX_PAGE_BATCHES)) {
        out.push(`### Sheet: ${sheetName}\n\n${part}`);
      }
    }
    return out.filter((part) => part.trim());
  }

  if (lower.endsWith('.pdf')) {
    try {
      if (fileBytes.byteLength > MAX_PDF_BYTES) {
        throw new Error('PDF files must be 8MB or smaller for AI extraction. Split the PDF into smaller sections and try again.');
      }

      const pdf = await getDocumentProxy(fileBytes);
      if (typeof pdf.numPages === 'number' && pdf.numPages > MAX_PDF_PAGES) {
        throw new Error(`PDF has ${pdf.numPages} pages. The extractor supports up to ${MAX_PDF_PAGES} pages per import. Split the PDF and try again.`);
      }
      const { text } = await extractText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? (text as string[]) : [String(text ?? '')];
      return pages.map((page, index) => `[Page ${index + 1}]\n${normalizeExtractedText(page || '')}`);
    } catch (err) {
      console.error('PDF extraction failed:', err);
      throw new Error(`Could not parse PDF: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  throw new Error(`Unsupported file type: ${fileName}`);
}

/** Group pages into small batches so each AI request stays granular but bounded. */
function buildPageBatches(pages: string[]): string[] {
  const usable = pages.filter((page) => page.replace(/\[Page \d+\]/g, '').trim().length > 40);
  const source = usable.length > 0 ? usable : pages.filter((p) => p.trim());
  const batches: string[] = [];

  let current: string[] = [];
  let currentChars = 0;

  for (const page of source) {
    if (
      current.length > 0 &&
      (current.length >= PAGES_PER_BATCH || currentChars + page.length > PAGE_CHUNK_CHARS)
    ) {
      batches.push(current.join('\n\n'));
      current = [];
      currentChars = 0;
    }
    current.push(page);
    currentChars += page.length;
  }
  if (current.length > 0) batches.push(current.join('\n\n'));

  return batches.slice(0, MAX_PAGE_BATCHES);
}

const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'deepseek/deepseek-chat-v3.1:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'google/gemini-2.5-flash',
];

async function callOpenRouterOnce(text: string, signal: AbortSignal, maxTokens = 3500): Promise<any> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const modelErrors: string[] = [];
  for (const model of OPENROUTER_MODELS) {
    try {
      return await callOpenRouterModel(apiKey, model, text, signal, maxTokens);
    } catch (err) {
      const e = err as Error & { status?: number; body?: string };
      // 402 = credit limit — retry once with reduced max_tokens (loop again)
      if (e.status === 402) {
        const match = e.body?.match(/can only afford (\d+)/i);
        const reduced = match ? Math.max(500, parseInt(match[1], 10) - 100) : 1500;
        try {
          console.log(`Retrying ${model} with reduced max_tokens=${reduced}`);
          return await callOpenRouterModel(apiKey, model, text, signal, reduced);
        } catch (retryErr) {
          modelErrors.push(`${model}: ${getErrorMessage(retryErr)}`);
          continue;
        }
      }
      modelErrors.push(`${model}: ${getErrorMessage(err)}`);
      // Always try the next model — including on 429/5xx — so a single
      // rate-limited model doesn't stop the whole fallback chain. The outer
      // retry wrapper will still re-run the full chain if every model fails
      // transiently.
      continue;
    }
  }
  const combined = new Error(`OpenRouter: all models failed. ${modelErrors.join(' | ')}`) as Error & { status?: number };
  // If every attempt was a rate-limit/transient, mark as 429 so the outer
  // retry wrapper backs off and retries the whole chain.
  const allTransient = modelErrors.every((m) => /\b(429|408|425|500|502|503|504)\b/.test(m));
  combined.status = allTransient ? 429 : 502;
  throw combined;
}

async function callOpenRouterModel(
  apiKey: string,
  model: string,
  text: string,
  signal: AbortSignal,
  maxTokens: number,
): Promise<any> {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://edufutura.app',
      'X-Title': 'EduFutura',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Source document section:\n\n${text}` },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_curriculum' } },
      max_tokens: maxTokens,
    }),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    const err = new Error(`OpenRouter ${resp.status} (${model}): ${txt.slice(0, 300)}`) as Error & {
      status?: number;
      body?: string;
    };
    err.status = resp.status;
    err.body = txt;
    throw err;
  }
  const json = await resp.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error(`OpenRouter (${model}) returned no tool call`);
  return JSON.parse(toolCall.function.arguments);
}

async function callOpenRouterWithRetry(text: string, signal: AbortSignal, attempts = 3): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await callOpenRouterOnce(text, signal);
    } catch (err) {
      lastErr = err;
      const status = getErrorStatus(err);
      const transient = status !== null && TRANSIENT_STATUSES.has(status);
      if (!transient || attempt === attempts) throw err;
      // Exponential backoff: 1s, 2s, 4s
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  throw lastErr;
}

/**
 * Extract one page batch. Lovable AI first, OpenRouter second — the same
 * provider order as before, now applied per batch so a failure on one batch
 * never loses the rest of the document.
 */
async function extractBatch(
  text: string,
  fallbackGrade: number,
  fallbackSubject: string,
): Promise<{ items: ExtractedItem[]; provider: 'lovable' | 'openrouter'; error?: string }> {
  const errors: string[] = [];
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');

  if (lovableKey) {
    try {
      const raw = await callLovableAIOnce(lovableKey, text) as Record<string, unknown>;
      return {
        items: normalizeItems(raw?.items, fallbackGrade, fallbackSubject),
        provider: 'lovable',
      };
    } catch (err) {
      errors.push(`Lovable AI: ${getErrorMessage(err)}`);
    }
  }

  if (Deno.env.get('OPENROUTER_API_KEY')) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BATCH_TIMEOUT_MS);
    try {
      const raw = await callOpenRouterWithRetry(text, controller.signal) as Record<string, unknown>;
      return {
        items: normalizeItems(raw?.items, fallbackGrade, fallbackSubject),
        provider: 'openrouter',
      };
    } catch (err) {
      errors.push(`OpenRouter: ${getErrorMessage(err)}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    items: [],
    provider: 'lovable',
    error: errors.join(' | ') || 'No AI provider configured',
  };
}

/** Run extraction across every page batch and aggregate into grade groups. */
async function extractAllBatches(
  batches: string[],
  fallbackGrade: number,
  fallbackSubject: string,
): Promise<{ groups: GradeGroup[]; provider: 'lovable' | 'openrouter'; failures: string[] }> {
  const items: ExtractedItem[] = [];
  const failures: string[] = [];
  let provider: 'lovable' | 'openrouter' = 'lovable';

  for (let i = 0; i < batches.length; i += 1) {
    const result = await extractBatch(batches[i], fallbackGrade, fallbackSubject);
    if (result.error) {
      failures.push(`section ${i + 1}: ${result.error}`);
    } else {
      provider = result.provider;
      items.push(...result.items);
    }
    if (i < batches.length - 1) await sleep(BATCH_SPACING_MS);
  }

  return { groups: aggregateItems(items), provider, failures };
}

async function callLovableAIOnce(apiKey: string, text: string): Promise<unknown> {
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Source document section:\n\n${text}` },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_curriculum' } },
    }),
  });

  if (resp.status === 429) {
    const e = new Error('Rate limit exceeded on Lovable AI') as Error & { status?: number };
    e.status = 429;
    throw e;
  }
  if (resp.status === 402) {
    const e = new Error('Payment required on Lovable AI') as Error & { status?: number };
    e.status = 402;
    throw e;
  }
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Lovable AI ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const json = await resp.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error('Lovable AI returned no tool call');
  return JSON.parse(toolCall.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createJsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate user
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData?.user) {
      return createJsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Role check: admin or educator
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const allowed = (roles || []).some((r) => isAllowedRole(r.role));
    if (!allowed) {
      return createJsonResponse({ error: 'Forbidden: admin or educator role required' }, 403);
    }

    const body = await req.json();
    const { storage_path, file_name } = body;
    if (!storage_path || !file_name) {
      return createJsonResponse({ error: 'storage_path and file_name required' }, 400);
    }

    // Download from private bucket
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from('curriculum-imports')
      .download(storage_path);
    if (dlErr || !fileBlob) {
      return createJsonResponse({ error: `Failed to download file: ${dlErr?.message}` }, 500);
    }

    const fileSize = fileBlob.size ?? 0;
    if (file_name.toLowerCase().endsWith('.pdf') && fileSize > MAX_PDF_BYTES) {
      return createJsonResponse({
        error: `PDF is too large for edge extraction (${Math.ceil(fileSize / 1024 / 1024)}MB). Maximum supported size is ${Math.floor(MAX_PDF_BYTES / 1024 / 1024)}MB per import. Split the file and try again.`,
      }, 413);
    }
    if ((file_name.toLowerCase().endsWith('.xlsx') || file_name.toLowerCase().endsWith('.xls') || file_name.toLowerCase().endsWith('.csv')) && fileSize > MAX_SPREADSHEET_BYTES) {
      return createJsonResponse({
        error: `Spreadsheet is too large for edge extraction (${Math.ceil(fileSize / 1024 / 1024)}MB). Maximum supported size is ${Math.floor(MAX_SPREADSHEET_BYTES / 1024 / 1024)}MB per import.`,
      }, 413);
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const pages = await extractPagesFromFile(bytes, file_name);
    const rawText = pages.join('\n\n');

    if (!rawText.trim()) {
      return createJsonResponse({ error: 'No text could be extracted from the file' }, 422);
    }

    const fallbackGrade = detectGrade(rawText, file_name);
    const fallbackSubject = detectSubject(rawText, file_name);

    // Page-level extraction: small batches of pages, each sent to the model on
    // its own so multi-grade documents keep every grade instead of collapsing
    // into one. Lovable AI first, OpenRouter second, local text fallback last.
    const batches = buildPageBatches(pages);
    const { groups, provider, failures } = await extractAllBatches(batches, fallbackGrade, fallbackSubject);

    let providerUsed: 'openrouter' | 'lovable' | 'local' = provider;
    let aiError: string | null = failures.length > 0 ? failures.join(' | ') : null;
    let resolvedGroups: GradeGroup[] = groups;

    if (resolvedGroups.length === 0) {
      aiError = aiError || 'The AI returned no curriculum content';
      const local = buildLocalExtraction(rawText, file_name, aiError) as Record<string, unknown>;
      providerUsed = 'local';
      aiError = typeof local.ai_error === 'string' ? local.ai_error : aiError;
      resolvedGroups = [{
        grade_level: Number(local.detected_grade) || fallbackGrade,
        subject: typeof local.detected_subject === 'string' ? local.detected_subject : fallbackSubject,
        chapters: (local.chapters as any[]) || [],
      }];
    } else if (failures.length > 0) {
      aiError = `${failures.length} section(s) could not be read by the AI and were skipped. ${aiError}`;
    }

    // Structuring step: organize each group's chapters into clearly headed,
    // sectioned topic modules that map onto the existing chapter schema.
    // Phase 7 video matching then runs per group with that group's own grade.
    let videosMatched = 0;
    const responseGroups: Array<{ grade_level: number; subject: string; chapters: any[] }> = [];

    for (const group of resolvedGroups) {
      const structured = structureChapters(group.chapters) as any[];
      try {
        const res = await attachVideosToChapters(structured, group.subject, group.grade_level);
        videosMatched += res.matched;
      } catch (err) {
        console.warn('video matching skipped:', getErrorMessage(err));
      }
      responseGroups.push({
        grade_level: group.grade_level,
        subject: group.subject,
        chapters: structured,
      });
    }

    // Flat list kept for backwards compatibility, tagged with its grade/subject.
    const flatChapters = responseGroups.flatMap((group) =>
      group.chapters.map((chapter) => ({
        ...chapter,
        grade_level: group.grade_level,
        subject: group.subject,
      })),
    );

    const primary = [...responseGroups].sort((a, b) => b.chapters.length - a.chapters.length)[0];

    return createJsonResponse({
      detected_grade: primary?.grade_level ?? fallbackGrade,
      detected_subject: primary?.subject ?? fallbackSubject,
      confidence: providerUsed === 'local' ? 0.45 : 0.8,
      groups: responseGroups,
      chapters: flatChapters,
      provider_used: providerUsed,
      structured: true,
      sections_processed: batches.length,
      videos_matched: videosMatched,
      openrouter_error: aiError,
      ai_error: aiError,
    });


  } catch (err) {
    console.error('extract-curriculum-content error:', err);
    const message = getErrorMessage(err);
    const status = message.includes('must be') || message.includes('supports up to') ? 413 : 500;
    return createJsonResponse({ error: message }, status);
  }
});
