# Phase 2: Make the chapter content pane respond to learning style

## What's happening today

The learning style selector already exists in two places (onboarding preferences and settings preferences) and saves to the existing `learning_style` field on the student's study preferences. The chapter page already reads it correctly: it loads adaptive settings for the subject and derives flags such as "show diagrams" (Visual) and "show detailed steps" (Reading/Writing).

The problem is only in the content pane: those flags are used purely to print informational cards ("Visual support enabled", "Step-by-step guidance"). The actual body below always renders the same chapter text, no matter which style is selected.

## What will change

Only the chapter content pane on the Continue Learning screen. Nothing about how the selection is captured or stored changes, and Auditory and Kinesthetic keep their current behaviour.

- Reading/Writing selected: render the chapter's existing text content exactly as it renders today (no visual change).
- Visual selected: render the chapter's existing media fields — the chapter's content URL when it is a video, PDF or image, the chapter thumbnail, and any images/diagrams already embedded in the chapter text.
  - No media on the chapter: show an empty state ("No visuals have been added to this chapter yet"), then render the chapter text below it so the student can still learn. No placeholder or fabricated media is ever generated.
- Auditory, Kinesthetic, or no preference saved: unchanged — the chapter text renders as today.

The existing adaptive-learning banner, difficulty badge, reading time, navigation, sidebar, discussion section and global navigation all stay exactly as they are.

## Technical notes

- Read path stays as-is: `getAdaptiveContent` in `src/hooks/useAdaptiveLearning.tsx` already returns `show_diagrams` / `show_detailed_steps` from the stored `learning_style`. No writes, no schema changes, no migration.
- Extend the `Chapter` interface in `src/hooks/useCurriculumData.tsx` to expose the columns that already exist on `curriculum_chapters`: `content_type` and `content_url` (currently fetched with `select('*')` but not typed).
- New presentational component `src/components/curriculum/ChapterVisualContent.tsx`:
  - Collects media from `content_url` (branching on `content_type`: video → embedded/native player, pdf → link/iframe, image → `img`), `thumbnail_url`, and markdown image syntax found in `content_markdown`.
  - Renders an empty state via existing UI primitives when nothing is found. All colours use existing semantic tokens.
- In `src/pages/ChapterContent.tsx`, inside the existing `<article>` block, branch on `adaptiveContent?.show_diagrams`: render `ChapterVisualContent` above the existing `ChapterContentRenderer`. The existing "Chapter content coming soon…" fallback for chapters with no text is preserved.
- Note on current data: all 94 chapters are `content_type = 'rich_text'` with no `content_url` or `thumbnail_url`, so Visual mode will show the empty state plus text until admins attach media through the existing chapter editor.
