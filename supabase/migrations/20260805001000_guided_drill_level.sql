-- Level-aware guided drills, part 2: tag the catalog.
--
-- This is the DRILL's level, which is a browsing and warning aid: it is how the
-- library filters, and how the assign sheet can say "this is an advanced drill
-- and Priya is a beginner". It does NOT select questions. The STUDENT's level
-- does that (see 20260805000000_student_level.sql and src/lib/guidedDrillLevel.ts).

ALTER TABLE public.guided_drills
  ADD COLUMN IF NOT EXISTS level text
  CHECK (level IN ('beginner', 'intermediate', 'advanced'));

COMMENT ON COLUMN public.guided_drills.level IS
  'Which band this drill is pitched at. NULL means it suits any level, not that '
  'it is untagged. Catalog metadata only: question selection is driven by the '
  'student''s profiles.proficiency_level, never by this column.';

CREATE INDEX IF NOT EXISTS idx_guided_drills_level ON public.guided_drills (level);

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
--
-- Two signals, and they agree: across all 114 seeded drills there is not one
-- case where the slug token and the numeric range point at different bands.
--
--  1. The slug/title token -- "first-taste", "easier", "medium", "harder".
--     This is Joshua's own authored intent and it wins, because
--     difficulty_min/max is frequently left at the 1-5 default: 23 drills sit
--     at 1-5, and 13 of those carry an explicit token. For those, 1-5 means
--     "not tuned yet", not "suits everyone", and inferring from the range alone
--     would wrongly file them as level-agnostic.
--  2. The numeric range, for the 50 drills with no token. A range that fits
--     inside exactly one band takes it; a range that fits two (3-4, 4-4, 2-3)
--     is tie-broken to intermediate.
--
-- Anything that matches neither stays NULL. Distribution:
--   beginner 41, intermediate 41, advanced 21, NULL 11.
--
-- The band numbers below are the only place LEVEL_BANDS is restated outside
-- src/lib/studentLevel.ts. src/lib/studentLevel.migration.test.ts reads this
-- file and fails if the two ever drift apart.

UPDATE public.guided_drills SET level = CASE
  -- 1. Authored intent, from the slug or title.
  WHEN lower(slug || ' ' || coalesce(title, '')) ~ '(first[- ]taste|easier|easy)'
    THEN 'beginner'
  WHEN lower(slug || ' ' || coalesce(title, '')) ~ '(harder|hardest)'
    THEN 'advanced'
  WHEN lower(slug || ' ' || coalesce(title, '')) ~ 'medium'
    THEN 'intermediate'

  -- 2. Otherwise infer from the range, when it fits exactly one band.
  --    beginner 1-3, and not also inside intermediate 2-4
  WHEN coalesce(difficulty_min, 1) >= 1 AND coalesce(difficulty_max, 5) <= 3
       AND NOT (coalesce(difficulty_min, 1) >= 2 AND coalesce(difficulty_max, 5) <= 4)
    THEN 'beginner'
  --    advanced 3-5, and not also inside intermediate 2-4
  WHEN coalesce(difficulty_min, 1) >= 3 AND coalesce(difficulty_max, 5) <= 5
       AND NOT (coalesce(difficulty_min, 1) >= 2 AND coalesce(difficulty_max, 5) <= 4)
    THEN 'advanced'
  --    intermediate 2-4, which is also the tie-break for a range fitting two
  WHEN coalesce(difficulty_min, 1) >= 2 AND coalesce(difficulty_max, 5) <= 4
    THEN 'intermediate'

  -- 3. Wider than any single band and unlabelled: genuinely level-agnostic.
  ELSE NULL
END
WHERE level IS NULL;
