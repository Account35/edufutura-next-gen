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

async function callOpenRouter(rawText: string, signal: AbortSignal): Promise<unknown> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const truncated = buildModelExcerpt(rawText);
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': Deno.env.get('SUPABASE_URL') || 'https://edufutura.app',
      'X-Title': 'EduFutura',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Source document (filename context will follow):\n\n${truncated}` },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_curriculum' } },
    }),
    signal,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenRouter ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const json = await resp.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error('OpenRouter returned no tool call');
  return JSON.parse(toolCall.function.arguments);
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

    // Try OpenRouter first with timeout, fall back to Lovable AI
    let result: unknown;
    let providerUsed: 'openrouter' | 'lovable' = 'openrouter';
    let openrouterError: string | null = null;

    if (Deno.env.get('OPENROUTER_API_KEY')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      try {
        result = await callOpenRouter(rawText, controller.signal);
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        openrouterError = err instanceof Error ? err.message : String(err);
        console.warn('OpenRouter failed, falling back to Lovable AI:', openrouterError);
      }
    } else {
      openrouterError = 'OPENROUTER_API_KEY not configured';
    }

    if (!result) {
      try {
        result = await callLovableAI(rawText);
        providerUsed = 'lovable';
      } catch (err) {
        const status = getErrorStatus(err) ?? 500;
        const lovableMessage = getErrorMessage(err);
        return createJsonResponse({
          error: `Both AI providers failed. OpenRouter: ${openrouterError}. Lovable AI: ${lovableMessage}`,
        }, status);
      }
    }

    return createJsonResponse({
      ...result,
      provider_used: providerUsed,
      openrouter_error: openrouterError,
    });
  } catch (err) {
    console.error('extract-curriculum-content error:', err);
    const message = getErrorMessage(err);
    const status = message.includes('must be') || message.includes('supports up to') ? 413 : 500;
    return createJsonResponse({ error: message }, status);
  }
});
