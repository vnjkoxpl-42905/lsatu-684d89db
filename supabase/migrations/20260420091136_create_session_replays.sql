-- Session replay capture for drill surface (rrweb event stream).
-- One row per question attempt; keyed by (class_id, user_id, qid, mode).

CREATE TABLE IF NOT EXISTS public.session_replays (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id     uuid NOT NULL,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qid          text NOT NULL,
  mode         text NOT NULL,
  events_jsonb jsonb NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_replays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own replays"
  ON public.session_replays FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own replays"
  ON public.session_replays FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all replays"
  ON public.session_replays FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS session_replays_user_created_idx
  ON public.session_replays (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS session_replays_class_qid_idx
  ON public.session_replays (class_id, qid);
