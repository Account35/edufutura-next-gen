

## Merge Admin Content into Curriculum + AI-Assisted Bulk Upload (OpenRouter primary, Lovable AI fallback)

Consolidate the two admin pages into a single `/admin/curriculum` workflow, and add an AI-powered uploader that ingests PDFs, CSVs, or spreadsheets, extracts chapter data, detects the grade/subject, and lets the editor review before saving. AI extraction routes through OpenRouter first and falls back to Lovable AI Gateway on failure.

### Part 1 — Merge `/admin/content` into `/admin/curriculum`

- Move the rich upload capabilities from `ContentUploadForm` (PDF upload to `curriculum-pdfs` bucket, video URL, markdown content, key concepts, CAPS code, difficulty, estimated duration) into the existing `ChapterEditorModal`.
- Remove the `/admin/content` route from `App.tsx` and any sidebar/nav entry.
- Add a redirect: `/admin/content` → `/admin/curriculum` so old links still work.
- Delete `src/pages/AdminContent.tsx` and `src/components/admin/ContentUploadForm.tsx` after their fields are merged.

### Part 2 — AI-Assisted Bulk Content Import

A new "Import Content" button on `/admin/curriculum` opens a 3-step wizard.

**Step 1 — Upload**
- Accept `.pdf`, `.csv`, `.xlsx`, `.md`, `.txt` (max 25MB).
- File uploads to a new private storage bucket `curriculum-imports` (admin/educator only).

**Step 2 — AI Extraction**
- New edge function `extract-curriculum-content` (admin/educator role check):
  - PDFs: extract text server-side, then send to AI with a structured tool-call schema.
  - CSV/XLSX: parse rows server-side, send to AI to map columns to chapter fields.
  - **AI provider routing**:
    1. **Primary**: OpenRouter via the existing shared utility `supabase/functions/_shared/openrouter.ts` (model: `google/gemini-2.5-pro` or `openai/gpt-4o`).
    2. **Fallback**: Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`, model `google/gemini-2.5-pro`) — triggered when OpenRouter returns non-2xx, times out (>30s), or `OPENROUTER_API_KEY` is missing.
  - Response shape (enforced via tool-calling on both providers):
    ```json
    {
      "detected_grade": 10,
      "detected_subject": "Mathematics",
      "confidence": 0.92,
      "provider_used": "openrouter" | "lovable",
      "chapters": [{
        "chapter_number": 1,
        "chapter_title": "...",
        "chapter_description": "...",
        "content_markdown": "...",
        "difficulty_level": "intermediate",
        "estimated_duration_minutes": 45,
        "caps_code": "...",
        "key_concepts": ["..."]
      }]
    }
    ```
  - Surface 429/402/5xx errors as toasts with provider context.

**Step 3 — Review & Confirm**
- Editor sees:
  - Detected grade + subject (dropdowns to override; pre-matched against existing `curriculum_subjects`).
  - A badge showing which AI provider was used (OpenRouter / Lovable AI fallback).
  - Per-chapter inline editing for every field with confidence indicators.
  - Checkboxes to include/exclude individual chapters.
- "Confirm & Save" batch-inserts selected chapters into `curriculum_chapters` linked to the chosen subject.

### Files to Add
- `src/components/admin/curriculum/ContentImportWizard.tsx`
- `src/components/admin/curriculum/ExtractedChapterReview.tsx`
- `src/hooks/useCurriculumImport.tsx`
- `supabase/functions/extract-curriculum-content/index.ts`

### Files to Modify
- `src/components/admin/curriculum/ChapterEditorModal.tsx` — absorb PDF upload, video URL, key concepts, CAPS code.
- `src/pages/AdminCurriculum.tsx` — add "Import Content" button.
- `src/App.tsx` — remove `/admin/content` route, add redirect to `/admin/curriculum`.
- `src/components/admin/AdminLayout.tsx` (and mobile nav) — remove "Content" sidebar entry.
- `supabase/functions/_shared/openrouter.ts` — add a small `callOpenRouterWithTools()` helper if needed for the structured tool-call payload.

### Files to Delete
- `src/pages/AdminContent.tsx`
- `src/components/admin/ContentUploadForm.tsx`

### Database / Backend Changes
- New private storage bucket `curriculum-imports` with RLS allowing only admins/educators (`has_role(auth.uid(),'admin') OR has_role(auth.uid(),'educator')`) to insert/select/delete.
- No schema changes to `curriculum_chapters`.

### Tech Notes
- AI provider order is OpenRouter → Lovable AI; both use tool-calling for reliable structured JSON.
- Detected grade is matched against existing `curriculum_subjects.grade_level` so the editor confirms the subject with a single click.
- Wizard is mobile-responsive and uses semantic design tokens.
- Fallback is silent to the user (toast only on total failure); the review screen shows which provider was used for transparency.

