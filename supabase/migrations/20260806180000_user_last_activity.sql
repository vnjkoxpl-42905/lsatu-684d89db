-- user_last_activity: where each student left off, so Resume can offer it back.
--
-- The app has written to this table since the Resume feature shipped, but the
-- table was never created. `src/lib/lastActivity.ts` treats a missing relation
-- as a deploy race and silently skips, so every write has been a no-op and
-- Resume has never had anything to resume. Verified absent in prod 2026-08-06.
--
-- One row per user, replaced in place: the question is only ever "where is this
-- student now", never "where have they been". That is what makes
-- `onConflict: "user_id"` in upsertLastActivity correct, so user_id is the
-- primary key rather than a plain column with a separate id.

CREATE TABLE IF NOT EXISTS public.user_last_activity (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- 'drill' | 'section' | 'bootcamp_step' — the LastActivitySnapshot union's
  -- discriminant. Left as text rather than a CHECK: a new activity kind ships
  -- in client code, and a constraint here would reject it until a migration
  -- caught up, turning a new feature into a silent write failure.
  activity_type  text NOT NULL,
  -- Identifies the thing within its kind (assignment id, "PT152-S3", step id).
  activity_id    text NOT NULL,
  -- The whole snapshot, so Resume can rebuild the surface without re-querying.
  state_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_last_activity ENABLE ROW LEVEL SECURITY;

-- A student's position is their own. No teacher read path here: nothing in the
-- teacher workspace reads this table, and adding an admin policy for a reader
-- that does not exist would widen access for nothing.
DROP POLICY IF EXISTS "own last activity: select" ON public.user_last_activity;
CREATE POLICY "own last activity: select" ON public.user_last_activity
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own last activity: insert" ON public.user_last_activity;
CREATE POLICY "own last activity: insert" ON public.user_last_activity
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- upsert() issues an UPDATE on conflict, so the write path needs both.
DROP POLICY IF EXISTS "own last activity: update" ON public.user_last_activity;
CREATE POLICY "own last activity: update" ON public.user_last_activity
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_last_activity TO authenticated;
