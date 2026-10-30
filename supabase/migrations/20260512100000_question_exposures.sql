-- question_exposures: every time a SELECTOR serves a question to a student,
-- a row is written here. Used by Smart Drill, Smart Builder, and the bootcamp
-- day generators to exclude the user's most-recent-500 questions from new
-- picks (rolling-window cooldown). question_id is text — qids in this app
-- are formatted as "PT80-S2-Q14", not uuids (see attempts.qid,
-- wrong_answer_journal.qid for the same convention).

CREATE TABLE IF NOT EXISTS public.question_exposures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  shown_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS question_exposures_user_shown_idx
  ON public.question_exposures (user_id, shown_at DESC);

ALTER TABLE public.question_exposures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "question_exposures_select_own" ON public.question_exposures;
CREATE POLICY "question_exposures_select_own"
  ON public.question_exposures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "question_exposures_insert_own" ON public.question_exposures;
CREATE POLICY "question_exposures_insert_own"
  ON public.question_exposures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
