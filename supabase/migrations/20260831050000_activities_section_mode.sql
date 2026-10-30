-- Section mode for Read, Recall, Colour.
--
-- The captured drill's unit of work is a whole LR section run unbroken against
-- a clock, not a single stimulus (spec: docs/specs/2026-08-31-rrc-section-mode.md,
-- argued at docs/adr/0010-rrc-section-is-the-unit-of-work.md). Three facts about
-- a section have nowhere to live in today's `activities` row, and all three are
-- per-Activity rather than per-item, so they are columns rather than another
-- shape smuggled into `instructions`.
--
-- All three are nullable with no default. Null means "not a section", which is
-- every Activity authored before this migration, so nothing existing changes
-- behaviour and no backfill is required.

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS mode              text,
  -- Minutes per accommodation: {"standard": 20, "accommodation_53": 25,
  -- "accommodation_70": 30}. Time is a scored criterion, so the goal cannot be
  -- one number -- grading a student with extra time against the standard goal
  -- would score her accommodation as a failure.
  ADD COLUMN IF NOT EXISTS time_goal_minutes jsonb,
  -- The captured section this Activity is, e.g. 'PT105.S2'. Null on every
  -- Activity that is not one section.
  ADD COLUMN IF NOT EXISTS source_section    text;

-- Written as a drop-and-add so re-running is safe and so the allowed set is
-- stated in one place rather than accumulating across migrations.
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_mode_check;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_mode_check
  CHECK (mode IS NULL OR mode = ANY (ARRAY['stimulus'::text, 'section'::text]));

-- A section is only a section if it carries its clock and names its source. A
-- row with `mode = 'section'` and no time goal would reach the runner with
-- nothing to score time against, and the failure would surface as a scorecard
-- with a blank rather than as an error.
ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS activities_section_is_complete;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_section_is_complete
  CHECK (
    mode IS DISTINCT FROM 'section'
    OR (time_goal_minutes IS NOT NULL AND source_section IS NOT NULL)
  );

COMMENT ON COLUMN public.activities.mode IS
  'Null or ''stimulus'' for the one-stimulus-at-a-time drill; ''section'' for a whole LR section run unbroken against the clock.';
COMMENT ON COLUMN public.activities.time_goal_minutes IS
  'Section mode only. Minutes per accommodation: standard, accommodation_53, accommodation_70.';
COMMENT ON COLUMN public.activities.source_section IS
  'Section mode only. The captured section, e.g. PT105.S2.';

-- The same three on the snapshot.
--
-- `activity_assignments` deliberately copies an Activity's content at assign
-- time so editing the definition later cannot change work a student has already
-- started. The clock is content by that standard: it is what her time is scored
-- against, so reading it live from `activities` would let a later edit rescore a
-- run she already finished. Without these the runner also cannot tell a section
-- assignment from a v1 one, because the snapshot is all it ever sees.

ALTER TABLE public.activity_assignments
  ADD COLUMN IF NOT EXISTS mode              text,
  ADD COLUMN IF NOT EXISTS time_goal_minutes jsonb,
  ADD COLUMN IF NOT EXISTS source_section    text;

ALTER TABLE public.activity_assignments DROP CONSTRAINT IF EXISTS activity_assignments_mode_check;
ALTER TABLE public.activity_assignments
  ADD CONSTRAINT activity_assignments_mode_check
  CHECK (mode IS NULL OR mode = ANY (ARRAY['stimulus'::text, 'section'::text]));

ALTER TABLE public.activity_assignments DROP CONSTRAINT IF EXISTS activity_assignments_section_is_complete;
ALTER TABLE public.activity_assignments
  ADD CONSTRAINT activity_assignments_section_is_complete
  CHECK (
    mode IS DISTINCT FROM 'section'
    OR (time_goal_minutes IS NOT NULL AND source_section IS NOT NULL)
  );

COMMENT ON COLUMN public.activity_assignments.time_goal_minutes IS
  'Snapshotted from the Activity at assign time, like items. Her time is scored against this, so it must not move under a finished run.';
