## Problem

The app queries `curriculum_subjects.thumbnail_url` (used in `SubjectCard`, `SubjectGrid`, admin curriculum hooks), but that column does not exist in the database, causing:

> column curriculum_subjects.thumbnail_url does not exist

## Fix

Add the missing column via a migration — no code changes needed since the frontend already expects it as optional/nullable.

### Migration

```sql
ALTER TABLE public.curriculum_subjects
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

NOTIFY pgrst, 'reload schema';
```

That's it. After the migration runs, the "Unable to load curriculum subjects" error will resolve and thumbnails (when set) will render on both admin cards and the student dashboard.

## Out of scope

- No changes to RLS, grants, or other columns.
- No frontend changes (existing code already treats `thumbnail_url` as optional).
