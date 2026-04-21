import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';

export interface ExtractedChapter {
  chapter_number: number;
  chapter_title: string;
  chapter_description: string;
  content_markdown: string;
  difficulty_level?: string;
  estimated_duration_minutes?: number;
  caps_code?: string;
  key_concepts?: string[];
}

export interface ExtractionResult {
  detected_grade: number;
  detected_subject: string;
  confidence: number;
  provider_used: 'openrouter' | 'lovable';
  chapters: ExtractedChapter[];
}

export interface ImportProgress {
  current: number;
  total: number;
  label: string;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB overall cap
const MAX_PDF_IMPORT_BYTES = 50 * 1024 * 1024; // PDFs up to 50MB are now supported via auto-chunking
const PDF_CHUNK_BYTE_TARGET = 6 * 1024 * 1024; // ~6MB per chunk (under edge 8MB guard)
const PDF_CHUNK_PAGE_TARGET = 40; // ~40 pages per chunk (under edge 80-page guard)
const SINGLE_PDF_THRESHOLD_BYTES = 7 * 1024 * 1024; // Below this, no need to chunk
const ACCEPTED_EXTS = ['pdf', 'csv', 'xlsx', 'xls', 'md', 'txt'];

const getErrorMessage = (error: unknown, fallback = 'unknown error') => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const getErrorStatus = (error: unknown): number | null => {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = (error as { context?: unknown }).context;
    if (typeof context === 'object' && context !== null && 'status' in context) {
      const status = (context as { status?: unknown }).status;
      if (typeof status === 'number') return status;
    }
  }
  return null;
};

async function splitPdfIntoChunks(file: File): Promise<File[]> {
  const buf = await file.arrayBuffer();
  const src = await PDFDocument.load(buf, { ignoreEncryption: true });
  const totalPages = src.getPageCount();
  const totalBytes = file.size;

  // Estimate pages per chunk so each chunk is under both byte + page targets.
  const bytesPerPage = totalBytes / Math.max(1, totalPages);
  const pagesByByte = Math.max(1, Math.floor(PDF_CHUNK_BYTE_TARGET / Math.max(1, bytesPerPage)));
  const pagesPerChunk = Math.max(1, Math.min(PDF_CHUNK_PAGE_TARGET, pagesByByte));

  const chunks: File[] = [];
  const baseName = file.name.replace(/\.pdf$/i, '');
  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(totalPages, start + pagesPerChunk);
    const newDoc = await PDFDocument.create();
    const pageIndexes = Array.from({ length: end - start }, (_, i) => start + i);
    const copied = await newDoc.copyPages(src, pageIndexes);
    copied.forEach((p) => newDoc.addPage(p));
    const bytes = await newDoc.save();
    const partName = `${baseName}__part-${chunks.length + 1}-pages-${start + 1}-${end}.pdf`;
    // Copy into a fresh ArrayBuffer to satisfy strict BlobPart typing
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    chunks.push(new File([ab], partName, { type: 'application/pdf' }));
  }
  return chunks;
}

function mergeResults(parts: ExtractionResult[]): ExtractionResult {
  // Pick highest-confidence detection
  const best = parts.reduce((a, b) => (b.confidence > a.confidence ? b : a), parts[0]);

  // Provider used by majority
  const providerCount = parts.reduce<Record<string, number>>((acc, p) => {
    acc[p.provider_used] = (acc[p.provider_used] || 0) + 1;
    return acc;
  }, {});
  const provider_used =
    (Object.entries(providerCount).sort((a, b) => b[1] - a[1])[0]?.[0] as 'openrouter' | 'lovable') ||
    best.provider_used;

  // Concatenate + dedupe chapters by lowercased title, then re-sequence
  const seen = new Set<string>();
  const chapters: ExtractedChapter[] = [];
  for (const part of parts) {
    for (const ch of part.chapters || []) {
      const key = (ch.chapter_title || '').trim().toLowerCase();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      chapters.push(ch);
    }
  }
  chapters.forEach((ch, i) => { ch.chapter_number = i + 1; });

  return {
    detected_grade: best.detected_grade,
    detected_subject: best.detected_subject,
    confidence: best.confidence,
    provider_used,
    chapters,
  };
}

export function useCurriculumImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  async function uploadAndExtractSingle(
    file: File,
    userId: string
  ): Promise<{ result: ExtractionResult | null; error?: string; storagePath: string }> {
    const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('curriculum-imports')
      .upload(storagePath, file, { cacheControl: '0', upsert: false });
    if (upErr) return { result: null, error: `Upload failed: ${getErrorMessage(upErr)}`, storagePath };

    const { data, error } = await supabase.functions.invoke('extract-curriculum-content', {
      body: { storage_path: storagePath, file_name: file.name },
    });

    if (error) {
      const status = getErrorStatus(error);
      const msg =
        status === 429 ? 'AI rate limit reached.' :
        status === 402 ? 'AI credits exhausted.' :
        status === 413 ? 'Chunk too large for edge extraction.' :
        `Extraction failed: ${getErrorMessage(error)}`;
      return { result: null, error: msg, storagePath };
    }
    if (data?.error) return { result: null, error: data.error, storagePath };
    return { result: data as ExtractionResult, storagePath };
  }

  async function uploadAndExtract(file: File): Promise<ExtractionResult | null> {
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is too large. Maximum is 50MB.');
      return null;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_EXTS.includes(ext)) {
      toast.error(`Unsupported file type: .${ext}. Use PDF, CSV, XLSX, MD or TXT.`);
      return null;
    }
    if (ext === 'pdf' && file.size > MAX_PDF_IMPORT_BYTES) {
      toast.error('PDF is too large. Maximum is 50MB.');
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated');
      return null;
    }

    // Decide whether to chunk
    let chunks: File[] = [file];
    if (ext === 'pdf' && file.size > SINGLE_PDF_THRESHOLD_BYTES) {
      setIsUploading(true);
      setProgress({ current: 0, total: 1, label: 'Splitting large PDF…' });
      try {
        chunks = await splitPdfIntoChunks(file);
        toast.message(`Large PDF detected — split into ${chunks.length} parts for AI extraction.`);
      } catch (err) {
        toast.error(`Could not split PDF: ${getErrorMessage(err)}`);
        setIsUploading(false);
        setProgress(null);
        return null;
      }
      setIsUploading(false);
    }

    setIsExtracting(true);
    const partResults: ExtractionResult[] = [];
    const pathsToCleanup: string[] = [];
    const failedChunks: string[] = [];

    try {
      for (let i = 0; i < chunks.length; i++) {
        setProgress({
          current: i + 1,
          total: chunks.length,
          label: chunks.length > 1 ? `Processing part ${i + 1} of ${chunks.length}…` : 'AI is reading your content…',
        });
        const { result, error, storagePath } = await uploadAndExtractSingle(chunks[i], user.id);
        pathsToCleanup.push(storagePath);
        if (result) {
          partResults.push(result);
        } else {
          failedChunks.push(`Part ${i + 1}: ${error || 'unknown error'}`);
          if (chunks.length === 1) {
            toast.error(error || 'Extraction failed');
            return null;
          }
        }
        // small pacing delay to avoid AI 429 between chunks
        if (i < chunks.length - 1) await new Promise((r) => setTimeout(r, 750));
      }

      if (partResults.length === 0) {
        toast.error('All parts failed to extract.');
        return null;
      }

      if (failedChunks.length > 0) {
        toast.warning(`${failedChunks.length} part(s) could not be extracted. Continuing with the rest.`);
      }

      const merged = mergeResults(partResults);
      toast.success(`Extracted ${merged.chapters.length} chapter(s) via ${merged.provider_used}`);
      return merged;
    } catch (err: unknown) {
      toast.error(`Extraction failed: ${getErrorMessage(err)}`);
      return null;
    } finally {
      setIsExtracting(false);
      setProgress(null);
      // best-effort cleanup
      if (pathsToCleanup.length > 0) {
        void supabase.storage.from('curriculum-imports').remove(pathsToCleanup);
      }
    }
  }

  async function saveChapters(
    subjectId: string,
    chapters: ExtractedChapter[]
  ): Promise<boolean> {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const rows = chapters.map((c) => ({
        subject_id: subjectId,
        chapter_number: c.chapter_number,
        chapter_title: c.chapter_title,
        chapter_description: c.chapter_description || '',
        content_markdown: c.content_markdown || '',
        content_type: 'rich_text',
        difficulty_level: c.difficulty_level || 'Intermediate',
        estimated_duration_minutes: c.estimated_duration_minutes || 30,
        caps_code: c.caps_code || '',
        key_concepts: c.key_concepts || [],
        created_by: user.id,
        updated_by: user.id,
        is_published: false,
      }));

      const { error } = await supabase.from('curriculum_chapters').insert(rows);
      if (error) throw error;

      toast.success(`${rows.length} chapter(s) saved as drafts.`);
      return true;
    } catch (err: unknown) {
      toast.error(`Save failed: ${getErrorMessage(err)}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    isUploading,
    isExtracting,
    isSaving,
    progress,
    uploadAndExtract,
    saveChapters,
  };
}
