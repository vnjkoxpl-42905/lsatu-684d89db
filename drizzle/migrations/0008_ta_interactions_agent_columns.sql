ALTER TABLE public.ta_interactions
  ALTER COLUMN student_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS action_proposal jsonb,
  ADD COLUMN IF NOT EXISTS action_status text;

ALTER TABLE public.ta_interactions
  DROP CONSTRAINT IF EXISTS ta_interactions_action_status_chk;
ALTER TABLE public.ta_interactions
  ADD CONSTRAINT ta_interactions_action_status_chk
  CHECK (action_status IS NULL OR action_status IN ('pending','confirmed','cancelled','failed'));