// Extract curriculum content from uploaded files (PDF, CSV, XLSX, MD, TXT)
// AI provider routing: OpenRouter primary -> Lovable AI Gateway fallback
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { extractText, getDocumentProxy } from 'https://esm.sh/unpdf@0.12.1';

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
    description: 'Extract structured curriculum chapter data from source content.',
    parameters: {
      type: 'object',
      properties: {
        detected_grade: { type: 'integer', description: 'Detected grade level (4-12) or 0 if unknown' },
        detected_subject: { type: 'string', description: 'Detected subject name (e.g., Mathematics, Physical Sciences)' },
        confidence: { type: 'number', description: '0-1 confidence in the detection' },
        chapters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chapter_number: { type: 'integer' },
              chapter_title: { type: 'string' },
              chapter_description: { type: 'string' },
              content_markdown: { type: 'string', description: 'Full chapter content in Markdown' },
              difficulty_level: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced'] },
              estimated_duration_minutes: { type: 'integer' },
              caps_code: { type: 'string' },
              key_concepts: { type: 'array', items: { type: 'string' } },
            },
            required: ['chapter_number', 'chapter_title', 'chapter_description', 'content_markdown'],
          },
        },
      },
      required: ['detected_grade', 'detected_subject', 'confidence', 'chapters'],
    },
  },
};

const SYSTEM_PROMPT = `You are an expert South African CAPS curriculum analyst.
You receive raw text extracted from a teacher's source document (PDF, spreadsheet, or notes).
Your job is to:
1. Detect the school grade level (4-12) and the subject (e.g., Mathematics, Physical Sciences, Life Sciences, English).
2. Split the material into well-formed chapters.
3. For each chapter, write a clean title, a 1-2 sentence description, full Markdown content, a difficulty level, an estimated duration in minutes, an optional CAPS code, and 3-8 key concepts.
4. Return everything via the extract_curriculum tool. Do not respond with prose.`;

async function extractTextFromFile(fileBytes: Uint8Array, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    if (fileBytes.byteLength > MAX_TEXT_FILE_BYTES) {
      throw new Error('Text or Markdown files must be 2MB or smaller for AI extraction. Split the document and try again.');
    }
    return new TextDecoder().decode(fileBytes);
  }

  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    if (fileBytes.byteLength > MAX_SPREADSHEET_BYTES) {
      throw new Error('Spreadsheet files must be 6MB or smaller for AI extraction. Split the workbook and try again.');
    }
    const wb = XLSX.read(fileBytes, { type: 'array' });
    const out: string[] = [];
    for (const sheetName of wb.SheetNames) {
      out.push(`### Sheet: ${sheetName}`);
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
      out.push(csv);
    }
    return out.join('\n\n');
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
      const { text } = await extractText(pdf, { mergePages: true });
      return typeof text === 'string' ? text : (text as string[]).join('\n\n');
    } catch (err) {
      console.error('PDF extraction failed:', err);
      throw new Error(`Could not parse PDF: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  throw new Error(`Unsupported file type: ${fileName}`);
}

const OPENROUTER_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'deepseek/deepseek-chat-v3.1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
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
      // Try next model on 4xx; rethrow on transient (let retry wrapper handle)
      if (e.status && TRANSIENT_STATUSES.has(e.status)) throw err;
    }
  }
  const combined = new Error(`OpenRouter: all models failed. ${modelErrors.join(' | ')}`) as Error & { status?: number };
  combined.status = 502;
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

function mergeChunkResults(parts: any[]): any {
  const best = parts.reduce((b, c) => ((c?.confidence ?? 0) > (b?.confidence ?? 0) ? c : b), parts[0]);
  const seen = new Set<string>();
  const chapters: any[] = [];
  for (const part of parts) {
    for (const ch of (part?.chapters || [])) {
      const key = (ch.chapter_title || '').trim().toLowerCase();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      chapters.push(ch);
    }
  }
  chapters.forEach((ch, i) => { ch.chapter_number = i + 1; });
  return {
    detected_grade: best?.detected_grade ?? 0,
    detected_subject: best?.detected_subject ?? '',
    confidence: best?.confidence ?? 0,
    chapters,
  };
}

async function callOpenRouter(rawText: string, signal: AbortSignal): Promise<unknown> {
  // Try a single call first using the smart excerpt.
  const excerpt = buildModelExcerpt(rawText);
  try {
    return await callOpenRouterWithRetry(excerpt, signal);
  } catch (err) {
    const status = getErrorStatus(err);
    // If it's a token-limit/transient error, fall back to chunked extraction.
    const shouldChunk = status === null || TRANSIENT_STATUSES.has(status) || status === 400 || status === 413;
    if (!shouldChunk) throw err;

    const chunks = splitTextIntoChunks(rawText);
    if (chunks.length <= 1) throw err;

    const results: any[] = [];
    const failures: string[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      try {
        const part = await callOpenRouterWithRetry(chunks[i], signal);
        results.push(part);
      } catch (chunkErr) {
        failures.push(`chunk ${i + 1}: ${getErrorMessage(chunkErr)}`);
      }
      // Small spacing between chunks to avoid rate limits.
      if (i < chunks.length - 1) await sleep(500);
    }

    if (results.length === 0) {
      throw new Error(`OpenRouter chunked extraction failed. ${failures.join('; ')}`);
    }
    return mergeChunkResults(results);
  }
}

async function callLovableAI(rawText: string): Promise<unknown> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const truncated = buildModelExcerpt(rawText);
  const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Source document:\n\n${truncated}` },
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
    const rawText = await extractTextFromFile(bytes, file_name);

    if (!rawText.trim()) {
      return createJsonResponse({ error: 'No text could be extracted from the file' }, 422);
    }

    // OpenRouter only (per user request — no Lovable AI fallback)
    let result: unknown;
    let providerUsed: 'openrouter' | 'local' = 'openrouter';
    let aiError: string | null = null;

    if (!Deno.env.get('OPENROUTER_API_KEY')) {
      return createJsonResponse(
        buildLocalExtraction(rawText, file_name, 'OPENROUTER_API_KEY is not configured')
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 150000);
    try {
      result = await callOpenRouter(rawText, controller.signal);
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      const message = getErrorMessage(err);
      const status = getErrorStatus(err) ?? 500;
      if (status === 402 || status === 429) {
        aiError = `OpenRouter returned ${status}: ${message}`;
        result = buildLocalExtraction(rawText, file_name, aiError);
        providerUsed = 'local';
      } else {
        return createJsonResponse({ error: `OpenRouter extraction failed: ${message}` }, status);
      }
    }

    return createJsonResponse({
      ...result,
      provider_used: providerUsed,
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
