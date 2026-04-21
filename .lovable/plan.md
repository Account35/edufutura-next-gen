

## Support large PDF uploads via client-side chunking

The current 8MB PDF limit is enforced both client-side (`useCurriculumImport.tsx`) and edge-side (`extract-curriculum-content`). It exists because the edge worker has memory + time limits when parsing PDFs with `unpdf`, and the AI context is already truncated to ~18K characters. We will lift the limit by **splitting large PDFs in the browser into smaller per-chunk PDFs**, sending each chunk through the existing edge function, and merging the extracted chapters before the editor reviews them. No information is lost, and the edge function and AI providers remain untouched.

### What changes for the user

1. The wizard accepts PDFs up to 50MB (configurable). CSV/XLSX/MD/TXT limits stay the same.
2. For PDFs larger than 7MB or longer than ~60 pages, the wizard automatically:
   - Splits the file in the browser using `pdf-lib` into ~6MB / 40-page chunks.
   - Uploads each chunk to `curriculum-imports` and calls `extract-curriculum-content` per chunk (sequentially, to respect AI rate limits).
   - Shows progress: "Processing chunk 2 of 4…".
3. Results are merged into a single `ExtractionResult`:
   - `detected_grade` / `detected_subject` / `confidence` taken from the highest-confidence chunk.
   - `provider_used` shown as the provider used by the majority of chunks.
   - Chapters concatenated, `chapter_number` re-sequenced to be unique, and near-duplicate titles (case-insensitive match) deduplicated.
4. The review screen behaves exactly as today — editor confirms grade/subject and saves drafts.
5. If a single chunk fails, the wizard surfaces a non-blocking warning and continues with the rest, so partial results are never lost.

### Files to modify

- **`src/hooks/useCurriculumImport.tsx`**
  - Raise `MAX_PDF_IMPORT_BYTES` to 50MB.
  - Add `splitPdfIntoChunks(file)` using `pdf-lib` (already a tiny, browser-safe dep we will add).
  - Refactor `uploadAndExtract` to: detect large PDFs → split → loop chunks (`uploadAndExtractSingle` helper) → merge results → return one `ExtractionResult`.
  - Add `progress` state (`{current, total, label}`) returned from the hook.
  - Best-effort cleanup of all chunk files in `curriculum-imports` after extraction.

- **`src/components/admin/curriculum/ContentImportWizard.tsx`**
  - Show progress text in the "extracting" step using the new `progress` value.
  - Update the upload helper text to reflect the new 50MB PDF limit.

### Files NOT changed

- `supabase/functions/extract-curriculum-content/index.ts` — keeps its 8MB PDF / 80-page guardrails. Each chunk we send is well under those limits, so the function continues to behave safely and reliably.
- `ChapterEditorModal.tsx`, RLS policies, storage buckets, `saveChapters` — untouched.

### Tech notes

- `pdf-lib` runs entirely in the browser, no native deps, ~80KB gzipped.
- Chunk size targets: ≤6MB and ≤40 pages each, whichever triggers first. This keeps every chunk comfortably inside the edge function's existing limits.
- Chunk requests are sequential (not parallel) to avoid hitting AI 429s; a small delay between chunks is added.
- Merge logic re-numbers chapters globally (1..N) so saved drafts have unique `chapter_number` values per subject.
- All existing error handling (`429`, `402`, `413`, generic) is preserved per chunk; a chunk-level failure becomes a toast warning, not a hard stop.

