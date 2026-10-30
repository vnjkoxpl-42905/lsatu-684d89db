-- Per-user key/value store for bootcamp progress autosave.
-- The bootcamp persistence layer stores small JSON records keyed by
-- (table_name, record_id). This mirrors them to the backend so each
-- profile keeps all of their progress across devices/sessions.

CREATE TABLE IF NOT EXISTS public.bootcamp_kv (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name   text        NOT NULL,
  record_id    text        NOT NULL,
  data         jsonb       NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, table_name, record_id)
);

CREATE INDEX IF NOT EXISTS bootcamp_kv_user_table_idx
  ON public.bootcamp_kv (user_id, table_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bootcamp_kv TO authenticated;
GRANT ALL ON public.bootcamp_kv TO service_role;

ALTER TABLE public.bootcamp_kv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bootcamp data"
  ON public.bootcamp_kv FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own bootcamp data"
  ON public.bootcamp_kv FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own bootcamp data"
  ON public.bootcamp_kv FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own bootcamp data"
  ON public.bootcamp_kv FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bootcamp_kv_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS bootcamp_kv_touch ON public.bootcamp_kv;
CREATE TRIGGER bootcamp_kv_touch
  BEFORE UPDATE ON public.bootcamp_kv
  FOR EACH ROW EXECUTE FUNCTION public.bootcamp_kv_touch_updated_at();
