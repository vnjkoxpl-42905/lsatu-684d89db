-- Per CLAUDE.md identity rule: "instructor is displayed as 'Joshua'". The
-- admin profile was stored with a full name ("Joshua Fisseha"), so every
-- surface that reads `display_name` — inbox thread titles, sender labels
-- above message bubbles, the student-facing dock — currently shows the full
-- name. Shorten any admin row's `display_name` to its first whitespace-
-- separated token so the rendered identity matches the product rule without
-- adding client-side role-aware formatting everywhere.
--
-- Safe by construction:
--   - Affects only rows whose class_id corresponds to a user with the
--     `admin` role in `user_roles`.
--   - No-op for admins whose name is already a single token
--     (`display_name LIKE '% %'` guard).
--   - Students' display_names are untouched.

UPDATE public.profiles
SET display_name = SPLIT_PART(display_name, ' ', 1)
WHERE class_id IN (
  SELECT user_id::text FROM public.user_roles WHERE role = 'admin'
)
  AND display_name IS NOT NULL
  AND display_name LIKE '% %';
