# Coursera-Style Learning Layout (Phase 1)

Restructure the chapter reading screen (`/curriculum/:subjectName/:chapterNumber`, reached via "Continue Learning") into a two-column course layout. Layout only — no schema changes, no new content records, no changes to the global navigation.

## What the student sees

```text
[ global app nav — unchanged ]
Subject → Chapter → Section            (breadcrumb)
┌───────────────────────┬──────────────────────────────┐
│ Progress bar  62%     │  chapter content (unchanged) │
│ ▸ 1. Module title  ✓  │  ...                         │
│ ▾ 2. Module title  ◐  │  ...            [ TOC kept ] │
│     • Section A       │                              │
│     • Section B       │                              │
│ ▸ 3. Module title  ○  │                              │
└───────────────────────┴──────────────────────────────┘
```

- Left sidebar, collapsible, listing the subject's existing chapters as modules. The active chapter expands to show its in-content headings as topics; clicking one scrolls to that section.
- Each module shows a completion indicator: completed, in progress, or not started.
- A progress bar sits above the sidebar list showing overall subject completion.
- Breadcrumb above the content pane: Subject → Chapter → active section.
- Right-hand table of contents stays exactly as it is today.
- On mobile the sidebar collapses off-canvas behind a toggle; the existing mobile reading toolbar is untouched.

## Data used (existing only)

- Chapters come from the already-loaded `allChapters` for the subject.
- Per-chapter state comes from `user_chapter_progress` (`status`, `progress_percentage`) for the signed-in user; chapters with no row show as not started.
- Overall progress reuses the `user_progress` percentage for the subject, falling back to completed-chapter count when no row exists.
- Topics are the H2/H3 headings already parsed from `content_markdown` by the existing TOC logic — nothing new is stored.

## Technical notes

- New presentational components under `src/components/curriculum/`: `CourseSidebar` (collapsible module/topic list plus progress bar) and `CourseBreadcrumb`.
- New read-only hook to fetch `user_chapter_progress` rows for the current subject's chapter ids in one query; existing progress-writing logic in `useProgressTracking` is not touched.
- `src/pages/ChapterContent.tsx` is rewrapped: breadcrumb + flex row of sidebar and the current content column. All existing children (`ChapterHeader`, adaptive panel, metadata, learning outcomes, `ChapterContentRenderer`, `ChapterNavigation`, `ChapterDiscussionSection`, `ChapterSidebar`, mobile toolbar, floating buttons) are kept and re-used, not rewritten.
- Module clicks navigate with the existing route pattern; locked chapters keep the current prerequisite behaviour.
- Styling uses existing semantic tokens and shadcn primitives (Collapsible, Progress, Breadcrumb); no hardcoded colors.
- No migrations, no edge function changes, no routing changes.
