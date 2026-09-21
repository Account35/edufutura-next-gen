# Multi-grade curriculum extraction

## The problem

Today one upload is read as one grade and one subject. The AI is given a trimmed "excerpt"
of the document (start, middle, end) and asked for a single grade + subject + chapter list.
When a file covers Grade 4 through Grade 6, the lower grades get summarised away or dropped
entirely, and everything lands under one grade.

## What changes

### 1. Read the document in small page groups

- Keep page boundaries when reading a PDF instead of merging everything into one block of text.
- Group roughly 4 pages at a time and send each group to the AI as its own request, so no part
  of the document is skipped or trimmed away.
- Groups are processed in sequence with the existing retry/back-off and provider fallback, so a
  rate limit on one group does not lose the rest. Non-PDF files (CSV, XLSX, MD, TXT) keep their
  current text-chunk behaviour, also page-group-shaped.

### 2. Ask for every grade separately

- The AI is told, in strict terms, to return one entry per grade and never to merge grades. If a
  page mentions Grade 4 and Grade 6, that is two entries.
- Each returned item carries: grade level, subject, chapter title, topic title, key concepts, and
  the topic's content.
- The output shape is enforced by the request schema, so the model cannot return prose or a
  collapsed single-grade summary.

### 3. Join the pieces back together

- Items from all page groups are merged: same grade + subject + chapter title = one chapter, with
  its topics appended in document order. Identical topics repeated across a page boundary are
  removed; near-duplicates from different grades are kept apart.
- Each chapter's content is rebuilt as `# Chapter title` followed by `## Topic` sections, which is
  the format the existing structuring step and the student content pane already use.
- Chapters are numbered per grade/subject group, not across the whole file.

### 4. Saving: split by grade automatically

- The review screen groups the extracted chapters under a heading per grade and subject, with a
  count, and shows which subject each group will be saved into.
- Each group is matched to an existing subject by name and grade. Where no subject exists, a new
  draft subject is created for that grade during save.
- Saving writes each group into its own subject in one pass. Chapter numbering, publish
  inheritance, duplicate-title skipping, subject counters, and the automatic quiz generation all
  run per group, unchanged.
- A single-grade upload behaves exactly as it does now: one group, one target subject, still
  overridable in the dropdown.

## Technical notes

- `supabase/functions/extract-curriculum-content/index.ts`: read PDFs with `mergePages: false`,
  build page-group batches, call the model per batch, and replace the single-result merge with a
  grade-aware aggregator. Extraction tool schema extended with `grade_level`, `subject` and
  `topic_title` per item; prompt updated with the explicit no-collapsing instruction. Provider
  order, retry/back-off, 402 token reduction, local fallback, structuring and video matching stay
  as they are.
- Response gains a `groups` array (grade, subject, chapters) alongside the existing flat
  `chapters` array, so nothing that reads the current shape breaks.
- `src/hooks/useCurriculumImport.tsx`: `ExtractionResult` gains `groups`; `saveChapters` extended
  to accept per-group targets and to create missing subjects; existing single-subject call path
  preserved.
- `src/components/admin/curriculum/ContentImportWizard.tsx` and `ExtractedChapterReview.tsx`:
  render chapters grouped by grade/subject with a per-group target subject selector.
- No database schema changes. No changes to the student-facing content pane.

## Verification

Import a multi-grade PDF and confirm the review screen lists a group per grade with its chapters
intact, then save and confirm each grade's chapters appear under the correct subject.
