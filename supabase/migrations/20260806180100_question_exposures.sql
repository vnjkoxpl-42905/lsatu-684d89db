-- question_exposures: which questions a student has already been shown, so the
-- drill selector can stop re-serving them.
--
-- Like user_last_activity, the app has written here since the feature shipped
-- and the table never existed, so `getRecentExposureSet` has always returned an
-- empty set and every drill has picked as if the student had seen nothing.
-- Verified absent in prod 2026-08-06.
--
-- Append-only, many rows per user: the read is "the most recent N qids", which
-- needs the history, not a single current value. Deliberately NOT unique on
-- (user_id, question_id) — a repeat serve is a real event worth recording, and
-- a unique constraint would make recordExposures' bulk insert fail the whole
-- batch the first time a question came round again.

CREATE TABLE IF NOT EXISTS public.question_exposures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  shown_at    timestamptz NOT NULL DEFAULT now()
);

-- The only read is: this user's rows, newest first, limit N. Ordering the index
-- descending on shown_at lets that come straight off the index.
CREATE INDEX IF NOT EXISTS question_exposures_user_recent_idx
  ON public.question_exposures (user_id, shown_at DESC);

ALTER TABLE public.question_exposures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own exposures: select" ON public.question_exposures;
CREATE POLICY "own exposures: select" ON public.question_exposures
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own exposures: insert" ON public.question_exposures;
CREATE POLICY "own exposures: insert" ON public.question_exposures
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policy: an exposure is a fact about what happened, and
-- nothing in the app edits or removes one.
GRANT SELECT, INSERT ON public.question_exposures TO authenticated;
