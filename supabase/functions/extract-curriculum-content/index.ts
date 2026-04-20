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
    return new TextDecoder().decode(fileBytes);
  }

  if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
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
      const pdf = await getDocumentProxy(fileBytes);
      const { text } = await extractText(pdf, { mergePages: true });
      return typeof text === 'string' ? text : (text as string[]).join('\n\n');
    } catch (err) {
      console.error('PDF extraction failed:', err);
      throw new Error(`Could not parse PDF: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  throw new Error(`Unsupported file type: ${fileName}`);
}

async function callOpenRouter(rawText: string, signal: AbortSignal): Promise<any> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!apiKey) throw new Error('OPENROUTER_API_KEY missing');

  const truncated = rawText.slice(0, 60000);
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

async function callLovableAI(rawText: string): Promise<any> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const truncated = rawText.slice(0, 60000);
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
    const e: any = new Error('Rate limit exceeded on Lovable AI');
    e.status = 429;
    throw e;
  }
  if (resp.status === 402) {
    const e: any = new Error('Payment required on Lovable AI');
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
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Role check: admin or educator
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id);
    const allowed = (roles || []).some((r: any) => r.role === 'admin' || r.role === 'educator');
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin or educator role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { storage_path, file_name } = body;
    if (!storage_path || !file_name) {
      return new Response(JSON.stringify({ error: 'storage_path and file_name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Download from private bucket
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from('curriculum-imports')
      .download(storage_path);
    if (dlErr || !fileBlob) {
      return new Response(JSON.stringify({ error: `Failed to download file: ${dlErr?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const rawText = await extractTextFromFile(bytes, file_name);

    if (!rawText.trim()) {
      return new Response(JSON.stringify({ error: 'No text could be extracted from the file' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try OpenRouter first with timeout, fall back to Lovable AI
    let result: any;
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
      } catch (err: any) {
        const status = err?.status || 500;
        return new Response(
          JSON.stringify({
            error: `Both AI providers failed. OpenRouter: ${openrouterError}. Lovable AI: ${err.message}`,
          }),
          { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        ...result,
        provider_used: providerUsed,
        openrouter_error: openrouterError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('extract-curriculum-content error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
