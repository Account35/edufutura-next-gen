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
const ACCEPTED_EXTS = ['pdf', 'csv', 'xlsx', 'xls', 'md', 'txt'];

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
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message || 'unknown error'}`);
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
        const status = (error as any).context?.status;
        if (status === 429) {
          toast.error('AI rate limit reached. Please try again in a moment.');
        } else if (status === 402) {
          toast.error('AI credits exhausted. Add funds to your workspace.');
        } else {
          toast.error(`Extraction failed: ${error.message}`);
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
    } catch (err: any) {
      toast.error(`Extraction failed: ${err.message || 'unknown error'}`);
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
    } catch (err: any) {
      toast.error(`Save failed: ${err.message || 'unknown error'}`);
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
