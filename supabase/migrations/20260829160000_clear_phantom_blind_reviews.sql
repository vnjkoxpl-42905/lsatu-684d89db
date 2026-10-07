-- Clear the blind reviews that were never sat.
--
-- Before 629e9c16, persistSectionResults tested `brResults ? … : null`. An empty
-- array is truthy, so a student who took "Skip to results" and never opened blind
-- review still had br_used written true with a score of zero — and the section
-- history then reported Blind Review 0% with a negative delta on a review nobody
-- took. The write path is fixed; these rows are the residue it left behind.
--
-- Guarded by the bug's own signature rather than by id, so it repairs every
-- affected row and is a no-op on re-run:
--   br_used true AND br_score 0 AND initial_score > 0
-- A real review cannot land there. Since c13e385c blind review walks the whole
-- section and an unreviewed question keeps its original result, so any genuine
-- review of a section with at least one correct answer scores at least that many.
-- The one row this is known to catch is PT102.S2 (3/25 initial, br_score 0,
-- delta -3, written 2026-08-29 02:42). PT105.S1 — br_score 8 against initial 8,
-- delta 0, a real review that changed nothing — does not match and is left alone.
UPDATE public.section_history
SET br_used = false,
    br_score = NULL,
    br_percent = NULL,
    br_delta = NULL,
    br_total = NULL
WHERE br_used IS TRUE
  AND br_score = 0
  AND initial_score > 0;
