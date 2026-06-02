-- Seed forums for each curriculum subject
-- This ensures that when users click "Discuss This Chapter", they have a forum to navigate to

INSERT INTO public.forums (
  subject_name,
  forum_title,
  forum_description,
  icon_name,
  color_theme,
  is_active,
  post_count,
  member_count,
  forum_rules
) 
SELECT 
  subject_name,
  CONCAT(subject_name, ' Forum') as forum_title,
  CONCAT('Discuss ', subject_name, ' topics, ask questions, and collaborate with fellow students') as forum_description,
  'MessageSquare' as icon_name,
  CASE 
    WHEN subject_name ILIKE '%Math%' THEN '#FF6B6B'
    WHEN subject_name ILIKE '%English%' THEN '#4ECDC4'
    WHEN subject_name ILIKE '%Science%' THEN '#45B7D1'
    WHEN subject_name ILIKE '%History%' THEN '#8B7355'
    WHEN subject_name ILIKE '%Geography%' THEN '#2ECC71'
    WHEN subject_name ILIKE '%Language%' THEN '#9B59B6'
    ELSE '#D4AF37'
  END as color_theme,
  true as is_active,
  0 as post_count,
  0 as member_count,
  'Be respectful and helpful | Stay on topic | No homework copying | Cite your sources' as forum_rules
FROM public.curriculum_subjects cs
WHERE NOT EXISTS (
  SELECT 1 FROM public.forums f 
  WHERE f.subject_name = cs.subject_name
)
ON CONFLICT (subject_name) DO NOTHING;

NOTIFY pgrst, 'reload schema';
