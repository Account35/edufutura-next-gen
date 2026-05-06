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

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_PDF_IMPORT_BYTES = 50 * 1024 * 1024;
const PDF_CHUNK_BYTE_TARGET = 6 * 1024 * 1024;
const PDF_CHUNK_PAGE_TARGET = 40;
const SINGLE_PDF_THRESHOLD_BYTES = 7 * 1024 * 1024;
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
  const buffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const totalPages = sourcePdf.getPageCount();
  const totalBytes = file.size;

  const bytesPerPage = totalBytes / Math.max(1, totalPages);
  const pagesByByte = Math.max(1, Math.floor(PDF_CHUNK_BYTE_TARGET / Math.max(1, bytesPerPage)));
  const pagesPerChunk = Math.max(1, Math.min(PDF_CHUNK_PAGE_TARGET, pagesByByte));

  const chunks: File[] = [];
  const baseName = file.name.replace(/\.pdf$/i, '');

  for (let start = 0; start < totalPages; start += pagesPerChunk) {
    const end = Math.min(totalPages, start + pagesPerChunk);
    const chunkPdf = await PDFDocument.create();
    const pageIndexes = Array.from({ length: end - start }, (_, index) => start + index);
    const pages = await chunkPdf.copyPages(sourcePdf, pageIndexes);
    pages.forEach((page) => chunkPdf.addPage(page));

    const bytes = await chunkPdf.save();
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);

    chunks.push(
      new File(
        [arrayBuffer],
        `${baseName}__part-${chunks.length + 1}-pages-${start + 1}-${end}.pdf`,
        { type: 'application/pdf' }
      )
    );
  }

  return chunks;
}

function mergeResults(parts: ExtractionResult[]): ExtractionResult {
  const bestResult = parts.reduce((best, current) => (
    current.confidence > best.confidence ? current : best
  ), parts[0]);

  const providerCounts = parts.reduce<Record<string, number>>((counts, part) => {
    counts[part.provider_used] = (counts[part.provider_used] || 0) + 1;
    return counts;
  }, {});

  const provider_used =
    (Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as 'openrouter' | 'lovable') ||
    bestResult.provider_used;

  const seenTitles = new Set<string>();
  const chapters: ExtractedChapter[] = [];

  for (const part of parts) {
    for (const chapter of part.chapters || []) {
      const key = (chapter.chapter_title || '').trim().toLowerCase();
      if (key && seenTitles.has(key)) continue;
      if (key) seenTitles.add(key);
      chapters.push({ ...chapter });
    }
  }

  chapters.forEach((chapter, index) => {
    chapter.chapter_number = index + 1;
  });

  return {
    detected_grade: bestResult.detected_grade,
    detected_subject: bestResult.detected_subject,
    confidence: bestResult.confidence,
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
        status === 413 ? 'This file is too large or complex for edge extraction.' :
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

    let chunks: File[] = [file];

    if (ext === 'pdf' && file.size > SINGLE_PDF_THRESHOLD_BYTES) {
      setIsUploading(true);
      setProgress({ current: 0, total: 1, label: 'Splitting large PDF...' });
      try {
        chunks = await splitPdfIntoChunks(file);
        toast.message(`Large PDF detected. Split into ${chunks.length} parts for AI extraction.`);
      } catch (err: unknown) {
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
      for (let index = 0; index < chunks.length; index += 1) {
        setProgress({
          current: index + 1,
          total: chunks.length,
          label: chunks.length > 1
            ? `Processing part ${index + 1} of ${chunks.length}...`
            : 'AI is reading your content...',
        });

        const { result, error, storagePath } = await uploadAndExtractSingle(chunks[index], user.id);
        pathsToCleanup.push(storagePath);

        if (result) {
          partResults.push(result);
        } else {
          failedChunks.push(`Part ${index + 1}: ${error || 'unknown error'}`);
          if (chunks.length === 1) {
            toast.error(error || 'Extraction failed');
            return null;
          }
        }

        if (index < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 750));
        }
      }

      if (partResults.length === 0) {
        toast.error('All parts failed to extract.');
        return null;
      }

      if (failedChunks.length > 0) {
        toast.warning(`${failedChunks.length} part(s) could not be extracted. Continuing with the rest.`);
      }

      const mergedResult = mergeResults(partResults);
      toast.success(`Extracted ${mergedResult.chapters.length} chapter(s) via ${mergedResult.provider_used}`);
      return mergedResult;
    } catch (err: unknown) {
      toast.error(`Extraction failed: ${getErrorMessage(err)}`);
      return null;
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
      setProgress(null);

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

      // Recompute parent subject counters
      try {
        const { count } = await supabase
          .from('curriculum_chapters')
          .select('id', { count: 'exact', head: true })
          .eq('subject_id', subjectId);

        const { data: durRows } = await supabase
          .from('curriculum_chapters')
          .select('estimated_duration_minutes')
          .eq('subject_id', subjectId);

        const totalMinutes = (durRows || []).reduce(
          (sum, r: { estimated_duration_minutes: number | null }) =>
            sum + (r.estimated_duration_minutes || 0),
          0
        );

        await supabase
          .from('curriculum_subjects')
          .update({
            total_chapters: count ?? rows.length,
            estimated_hours: Math.max(1, Math.round(totalMinutes / 60)),
            updated_at: new Date().toISOString(),
          })
          .eq('id', subjectId);
      } catch {
        // Non-fatal: counters will resync on next manual edit
      }

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
