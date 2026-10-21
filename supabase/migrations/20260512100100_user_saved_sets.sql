-- user_saved_sets: students save curated question sets from Build a Set
-- (preview rail) and Smart Builder (preview screen) so they can re-launch
-- or duplicate them later. Surfaces in a "My Sets" card on the Practice Hub.
--
-- filter_state captures the configuration that produced the set (qtypes,
-- difficulties, pts, features, etc.) so the user can re-run the same query
-- to get fresh questions, or relaunch the exact snapshot via question_ids.
-- question_ids is text[] because qids are "PT80-S2-Q14"-style strings (see
-- attempts.qid, wrong_answer_journal.qid, question_exposures.question_id).

CREATE TABLE IF NOT EXISTS public.user_saved_sets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  filter_state  jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_ids  text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_saved_sets_user_created_idx
  ON public.user_saved_sets (user_id, created_at DESC);

ALTER TABLE public.user_saved_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_saved_sets_select_own" ON public.user_saved_sets;
CREATE POLICY "user_saved_sets_select_own"
  ON public.user_saved_sets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_saved_sets_insert_own" ON public.user_saved_sets;
CREATE POLICY "user_saved_sets_insert_own"
  ON public.user_saved_sets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_saved_sets_update_own" ON public.user_saved_sets;
CREATE POLICY "user_saved_sets_update_own"
  ON public.user_saved_sets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_saved_sets_delete_own" ON public.user_saved_sets;
CREATE POLICY "user_saved_sets_delete_own"
  ON public.user_saved_sets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
