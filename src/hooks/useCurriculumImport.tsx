import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_PDF_IMPORT_BYTES = 8 * 1024 * 1024; // Keep PDF extraction within edge worker limits
const ACCEPTED_EXTS = ['pdf', 'csv', 'xlsx', 'xls', 'md', 'txt'];

const getErrorMessage = (error: unknown, fallback = 'unknown error') => {
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
};

const getErrorStatus = (error: unknown): number | null => {
  if (typeof error === 'object' && error !== null && 'context' in error) {
    const context = (error as { context?: unknown }).context;
    if (typeof context === 'object' && context !== null && 'status' in context) {
      const status = (context as { status?: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }
    }
  }
  return null;
};

export function useCurriculumImport() {
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function uploadAndExtract(file: File): Promise<ExtractionResult | null> {
    if (file.size > MAX_FILE_BYTES) {
      toast.error('File is too large. Maximum is 25MB.');
      return null;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_EXTS.includes(ext)) {
      toast.error(`Unsupported file type: .${ext}. Use PDF, CSV, XLSX, MD or TXT.`);
      return null;
    }
    if (ext === 'pdf' && file.size > MAX_PDF_IMPORT_BYTES) {
      toast.error('PDF is too large for AI extraction. Use a PDF smaller than 8MB or split it into smaller sections.');
      return null;
    }

    setIsUploading(true);
    let storagePath = '';
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      storagePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('curriculum-imports')
        .upload(storagePath, file, { cacheControl: '0', upsert: false });
      if (upErr) throw upErr;
    } catch (err: unknown) {
      toast.error(`Upload failed: ${getErrorMessage(err)}`);
      setIsUploading(false);
      return null;
    }
    setIsUploading(false);

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-curriculum-content', {
        body: { storage_path: storagePath, file_name: file.name },
      });

      if (error) {
        const status = getErrorStatus(error);
        if (status === 429) {
          toast.error('AI rate limit reached. Please try again in a moment.');
        } else if (status === 402) {
          toast.error('AI credits exhausted. Add funds to your workspace.');
        } else if (status === 413) {
          toast.error('This file is too large or complex for edge extraction. Split it into smaller sections and try again.');
        } else {
          toast.error(`Extraction failed: ${getErrorMessage(error)}`);
        }
        return null;
      }

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      // Cleanup the staging file (best-effort)
      void supabase.storage.from('curriculum-imports').remove([storagePath]);

      toast.success(`Extracted ${data.chapters?.length || 0} chapter(s) via ${data.provider_used}`);
      return data as ExtractionResult;
    } catch (err: unknown) {
      toast.error(`Extraction failed: ${getErrorMessage(err)}`);
      return null;
    } finally {
      setIsExtracting(false);
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
    uploadAndExtract,
    saveChapters,
  };
}
