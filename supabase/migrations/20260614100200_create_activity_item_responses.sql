-- Activity Centre Phase 1: append-only per-item attempts.
-- One row per submit. Drives the activity score and future analytics. The
-- Coach verdict is recorded alongside the student's response and attempt
-- number. Mirrors the abstract_translator_attempts append-only pattern:
-- owner can read + insert their rows; admins can read all.

CREATE TABLE IF NOT EXISTS public.activity_item_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.activity_assignments(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_order    integer NOT NULL,
  response_text text NOT NULL DEFAULT '',
  verdict       text CHECK (verdict IN ('correct', 'partial', 'incorrect')),
  attempt_no    integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_item_responses_assignment_idx
  ON public.activity_item_responses (assignment_id, item_order, created_at);

CREATE INDEX IF NOT EXISTS activity_item_responses_student_idx
  ON public.activity_item_responses (student_id, created_at DESC);

ALTER TABLE public.activity_item_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_item_responses: owner can select"
  ON public.activity_item_responses FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "activity_item_responses: owner can insert"
  ON public.activity_item_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);
