-- Access tiers, stage 1: make every switch mean what its label says.
--
-- Three routes were gated by the wrong column, and two columns guarded the same
-- page. The code now reads:
--   /testing, /testing/test/:runId  -> has_practice_access   (was has_drill_access)
--   /sets                           -> has_drill_access      (was has_practice_access)
--   /classroom/ta/:assignmentId     -> has_ta_access         (was has_classroom_access)
--   /journal*                       -> has_journal_access    (was journal OR waj)
--
-- This migration copies each student's current effective access into the
-- column that now guards it, so nobody gains or loses the Testing Centre, TA
-- worksheets or Wrong answers by the rewire.
--
-- The one place effective access moves is Saved Sets (/sets), which now follows
-- Drill. A saved set launches /drill, so it was never usable without Drill.
-- has_waj_access is left in place and no longer read.

UPDATE public.profiles SET
  has_practice_access = has_drill_access,
  has_ta_access       = has_classroom_access,
  has_journal_access  = has_journal_access OR has_waj_access;
