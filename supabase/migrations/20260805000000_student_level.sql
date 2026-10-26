-- Level-aware guided drills, part 1: record the level.
--
-- A guided drill defines a pool of questions via bank_filter. Until now every
-- student who opened a drill drew from the whole pool. This migration adds the
-- two facts needed to narrow that draw per student:
--   * profiles.proficiency_level        -- the band a student works at
--   * guided_drill_assignments.level    -- the band THIS assignment was made for
--
-- The draw itself stays client-side (src/lib/guidedDrillLevel.ts) and happens
-- when the student opens the drill, so re-attempts still get a fresh set.
-- Nothing here freezes a question list.

-- ---------------------------------------------------------------------------
-- 1. The student's band
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS proficiency_level text
  CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced'));

COMMENT ON COLUMN public.profiles.proficiency_level IS
  'Teacher-set LSAT proficiency band, one of beginner/intermediate/advanced. '
  'NULL means not set, and the app then applies no level at all rather than '
  'guessing a default. Distinct from profiles.level, which is gamification XP.';

-- REQUIRED, and easy to miss. Migration 20260612153001 did
--   REVOKE UPDATE ON public.profiles FROM authenticated
-- and re-granted a fixed column allowlist. Column privileges are checked BEFORE
-- row-level security, so without this grant no client role can write the new
-- column -- including Joshua, because admin authenticates as `authenticated`
-- too and is only distinguished later by has_role(). The failure surfaces as a
-- permission error that reads like an RLS bug and is not one.
GRANT UPDATE (proficiency_level) ON public.profiles TO authenticated;

-- The grant lets a student SUBMIT the column; this trigger is what rejects
-- them. Both are needed: the grant for admin to write it, the guard so students
-- cannot re-level themselves through the existing self-update policy.
CREATE OR REPLACE FUNCTION public.guard_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.has_bootcamp_access  IS DISTINCT FROM OLD.has_bootcamp_access  OR
     NEW.has_classroom_access IS DISTINCT FROM OLD.has_classroom_access OR
     NEW.has_analytics_access IS DISTINCT FROM OLD.has_analytics_access OR
     NEW.has_schedule_access  IS DISTINCT FROM OLD.has_schedule_access  OR
     NEW.has_practice_access  IS DISTINCT FROM OLD.has_practice_access  OR
     NEW.has_drill_access     IS DISTINCT FROM OLD.has_drill_access     OR
     NEW.has_waj_access       IS DISTINCT FROM OLD.has_waj_access       OR
     NEW.has_journal_access   IS DISTINCT FROM OLD.has_journal_access   OR
     NEW.has_flagged_access   IS DISTINCT FROM OLD.has_flagged_access   OR
     NEW.has_chat_access      IS DISTINCT FROM OLD.has_chat_access      OR
     NEW.has_export_access    IS DISTINCT FROM OLD.has_export_access    OR
     NEW.has_ta_access        IS DISTINCT FROM OLD.has_ta_access        OR
     NEW.proficiency_level    IS DISTINCT FROM OLD.proficiency_level    OR
     NEW.class_id             IS DISTINCT FROM OLD.class_id             THEN
    RAISE EXCEPTION 'profiles: access flags, proficiency_level and class_id are admin-controlled';
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. The band this assignment was made for
-- ---------------------------------------------------------------------------

-- Copied from the student's profile at assign time, or set explicitly as a
-- per-assignment override. Snapshotted rather than joined so that re-levelling
-- a student later cannot silently change work already in their classroom.
ALTER TABLE public.guided_drill_assignments
  ADD COLUMN IF NOT EXISTS level text
  CHECK (level IN ('beginner', 'intermediate', 'advanced'));

COMMENT ON COLUMN public.guided_drill_assignments.level IS
  'The band this assignment draws questions at. NULL means no level applies, '
  'so the drill uses its own bank_filter range -- which is also every row that '
  'predates this column. Deliberately not backfilled.';

-- Lets the teacher shorten a drill for one student without editing the drill.
-- NULL falls back to guided_drills.question_count.
ALTER TABLE public.guided_drill_assignments
  ADD COLUMN IF NOT EXISTS question_count integer
  CHECK (question_count IS NULL OR question_count > 0);

COMMENT ON COLUMN public.guided_drill_assignments.question_count IS
  'Per-assignment override for how many questions this student gets. NULL '
  'falls back to guided_drills.question_count.';

-- Without these two lines a student could re-level or resize their own drill:
-- the "Students update own assignments" policy is not column-scoped, and this
-- guard is the only thing narrowing it to progress fields.
CREATE OR REPLACE FUNCTION public.guard_guided_drill_assignment_immutables()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.guided_drill_id    IS DISTINCT FROM OLD.guided_drill_id    OR
     NEW.student_id         IS DISTINCT FROM OLD.student_id         OR
     NEW.class_id           IS DISTINCT FROM OLD.class_id           OR
     NEW.assigned_by        IS DISTINCT FROM OLD.assigned_by        OR
     NEW.assigned_at        IS DISTINCT FROM OLD.assigned_at        OR
     NEW.scheduled_for      IS DISTINCT FROM OLD.scheduled_for      OR
     NEW.unlock_at          IS DISTINCT FROM OLD.unlock_at          OR
     NEW.attempt_session_id IS DISTINCT FROM OLD.attempt_session_id OR
     NEW.created_at         IS DISTINCT FROM OLD.created_at         OR
     NEW.level              IS DISTINCT FROM OLD.level              OR
     NEW.question_count     IS DISTINCT FROM OLD.question_count     OR
     NEW.question_qids      IS DISTINCT FROM OLD.question_qids THEN
    RAISE EXCEPTION 'guided_drill_assignments: only progress fields (status, started_at, completed_at, read_card_at) are mutable for students';
  END IF;

  RETURN NEW;
END;
$function$;
