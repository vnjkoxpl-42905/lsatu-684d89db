-- user_saved_sets: a named question set a student built in the Question Picker,
-- kept with the filters that produced it so it can be reopened or re-run.
--
-- Third of the three tables the app writes to that were never created. Here the
-- consequence was the most visible: `saveSet` surfaces "Saved sets aren't
-- available yet" on a missing table, and `listSavedSets` returns an empty list,
-- so Save appeared to work and the set was simply gone. Verified absent in prod
-- 2026-08-06.

CREATE TABLE IF NOT EXISTS public.user_saved_sets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  -- The picker's filter state, replayed when the set is reopened.
  filter_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The resolved qids. Stored rather than re-derived from filter_state: the
  -- bank changes, and a saved set must stay the questions the student saved.
  question_ids text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- listSavedSets reads this user's sets, newest first.
CREATE INDEX IF NOT EXISTS user_saved_sets_user_created_idx
  ON public.user_saved_sets (user_id, created_at DESC);

ALTER TABLE public.user_saved_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own saved sets: select" ON public.user_saved_sets;
CREATE POLICY "own saved sets: select" ON public.user_saved_sets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own saved sets: insert" ON public.user_saved_sets;
CREATE POLICY "own saved sets: insert" ON public.user_saved_sets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own saved sets: update" ON public.user_saved_sets;
CREATE POLICY "own saved sets: update" ON public.user_saved_sets
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- deleteSavedSet filters by id alone, so the policy is what scopes the delete
-- to the owner. Without it a known id would delete another student's set.
DROP POLICY IF EXISTS "own saved sets: delete" ON public.user_saved_sets;
CREATE POLICY "own saved sets: delete" ON public.user_saved_sets
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_sets TO authenticated;
