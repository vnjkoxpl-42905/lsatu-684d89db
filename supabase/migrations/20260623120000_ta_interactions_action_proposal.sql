-- AI action agent (admin corner chat): let a TA interaction carry a proposed
-- platform action (assign drill/homework/bootcamp/note) that the admin confirms
-- with one click, mirroring the existing draft_content/draft_status flow.
--
-- Also relax student_id to nullable so the agent can run as a GLOBAL thread
-- (student resolved by name from the message) instead of requiring a student to
-- be picked first. Existing per-student rows are unaffected.

ALTER TABLE public.ta_interactions
  ADD COLUMN IF NOT EXISTS action_proposal jsonb,
  ADD COLUMN IF NOT EXISTS action_status   text
    CHECK (action_status IS NULL OR action_status IN ('pending','confirmed','cancelled','failed'));

ALTER TABLE public.ta_interactions
  ALTER COLUMN student_id DROP NOT NULL;

-- Global-thread scan: rows with no student, oldest-to-newest.
CREATE INDEX IF NOT EXISTS ta_interactions_global_created_idx
  ON public.ta_interactions (created_at DESC)
  WHERE student_id IS NULL;
