-- user_last_activity: one row per user tracking the most recent resumable
-- activity (drill, section, bootcamp step). Drives the "Resume" CTA on the
-- Main Hub so a returning student can reopen exactly where they left off.
--
-- state_snapshot is a typed discriminated union (see src/lib/lastActivity.ts).
-- We denormalize the human-readable label inside state_snapshot.label so the
-- Main Hub does not need to load the question bank or bootcamp content just
-- to render the button caption.

CREATE TABLE IF NOT EXISTS public.user_last_activity (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type   text NOT NULL CHECK (activity_type IN ('drill', 'section', 'bootcamp_step')),
  activity_id     text NOT NULL,
  state_snapshot  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_last_activity_updated_at_idx
  ON public.user_last_activity (updated_at DESC);

ALTER TABLE public.user_last_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_last_activity_select_own" ON public.user_last_activity;
CREATE POLICY "user_last_activity_select_own"
  ON public.user_last_activity FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_last_activity_insert_own" ON public.user_last_activity;
CREATE POLICY "user_last_activity_insert_own"
  ON public.user_last_activity FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_last_activity_update_own" ON public.user_last_activity;
CREATE POLICY "user_last_activity_update_own"
  ON public.user_last_activity FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
