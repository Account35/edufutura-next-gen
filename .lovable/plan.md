## Fix subject card chapter count + add Publish & CAPS quick toggles

Two small, scoped changes on the Admin → Curriculum Management screen. No structural or routing changes.

### Problem 1 — Card shows "0 chapters" after AI import

`curriculum_subjects.total_chapters` is a **static counter column**, not auto-derived. The AI import inserts rows into `curriculum_chapters` but never updates the parent subject's counter, so the card keeps showing `0 chapters` even though opening the subject lists them correctly. The same drift can happen on manual add/delete.

### Problem 2 — No quick way to publish or mark CAPS-aligned from the card

Today you can only toggle `is_published` and `caps_aligned` from the full Subject Editor modal. The user wants the same two switches surfaced directly on the subject card after reviewing AI-imported content, mirroring what manual creation already offers.

### Changes

**1. `src/hooks/useCurriculumImport.tsx` → `saveChapters`**
- After inserting the new chapter rows, recount `curriculum_chapters` for that `subject_id` and `update` the parent `curriculum_subjects` row with the fresh `total_chapters` value (and recompute `estimated_hours` from the sum of `estimated_duration_minutes`, rounded to the nearest hour).
- Toast and return value stay the same.

**2. `src/hooks/useAdminCurriculum.tsx` → keep counters honest for manual edits**
- In `createChapterMutation.onSuccess` and `deleteChapterMutation.onSuccess`, recount chapters for the affected `subject_id` and update `total_chapters` + `estimated_hours` on the subject. Invalidate `['admin-subjects']` so the cards refresh.
- Add a small `togglePublish(subjectId, value)` and `toggleCapsAligned(subjectId, value)` helper that calls the existing `updateSubject` mutation (no new endpoints, no schema changes).
- Export both helpers from the hook.

**3. `src/components/admin/curriculum/SubjectCard.tsx`**
- Add two new optional props: `onTogglePublish(subject, next: boolean)` and `onToggleCapsAligned(subject, next: boolean)`.
- In the card footer, replace the static "Published / Draft" badge and "CAPS Aligned" badge with two compact toggle controls (shadcn `Switch` + label). Each is wrapped in a `div` with `onClick={(e) => e.stopPropagation()}` so toggling does not navigate into the subject.
- Layout stays inside the existing footer; uses semantic tokens only (no hardcoded colors).
- Mobile: switches stack on the right of the grade badge — already fits within the current 1/2/3 column grid at 1040px.

**4. `src/pages/AdminCurriculum.tsx`**
- Wire `onTogglePublish` and `onToggleCapsAligned` to the new hook helpers and pass them into each `<SubjectCard />`.

### Files NOT changed
- `SubjectEditorModal.tsx`, `ChapterEditorModal.tsx`, `ContentImportWizard.tsx`, RLS policies, edge functions, storage buckets, routing.

### Acceptance
- After an AI import completes, the subject card immediately shows the correct chapter count (matches the count visible inside the subject).
- Each subject card displays a working **Publish** switch and **CAPS Aligned** switch; flipping either updates the database, refreshes the card, and never opens the subject view.
- Manual add/delete of chapters also keeps the card's count accurate.
