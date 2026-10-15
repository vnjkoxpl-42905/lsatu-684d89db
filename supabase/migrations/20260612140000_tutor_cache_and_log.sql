-- Tutor content cache + interaction log.
--
-- Two roles, one system (see docs/adr once written):
--   question_tutor_cache  — reusable generated content, served back to avoid
--                           regen. Breakdown keyed by qid; wrong-answer
--                           explanation keyed by (qid, picked_answer). Same for
--                           every student, so it grows into a shared corpus.
--   tutor_interaction_log — append-only record of every turn (including
--                           follow-ups) for the dataset / quality review.
--
-- Both are written ONLY by the tutor-chat edge function via the service-role
-- client (bypasses RLS). Authenticated users get read on the cache; admin gets
-- read on the log.

-- ── Reusable cache ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_tutor_cache (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qid             text NOT NULL,
  kind            text NOT NULL CHECK (kind IN ('preview', 'explanation')),
  -- '' for 'preview' (question-level); the picked letter for 'explanation'.
  -- NOT NULL so a plain UNIQUE constraint supports upsert onConflict.
  picked_answer   text NOT NULL DEFAULT '',
  content_json    jsonb,
  content_markdown text,
  model           text,
  prompt_version  int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- One cached row per (question, kind, picked letter).
  UNIQUE (qid, kind, picked_answer)
);

ALTER TABLE public.question_tutor_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tutor_cache_select_authed" ON public.question_tutor_cache;
CREATE POLICY "tutor_cache_select_authed"
  ON public.question_tutor_cache FOR SELECT
  TO authenticated
  USING (true);

DROP TRIGGER IF EXISTS question_tutor_cache_updated_at ON public.question_tutor_cache;
CREATE TRIGGER question_tutor_cache_updated_at
  BEFORE UPDATE ON public.question_tutor_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Interaction log (corpus) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tutor_interaction_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  qid             text NOT NULL,
  mode            text,
  picked_answer   text,
  role            text NOT NULL CHECK (role IN ('student', 'tutor')),
  message         text,
  content_json    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tutor_log_qid_idx
  ON public.tutor_interaction_log (qid, created_at);
CREATE INDEX IF NOT EXISTS tutor_log_user_idx
  ON public.tutor_interaction_log (user_id, created_at);

ALTER TABLE public.tutor_interaction_log ENABLE ROW LEVEL SECURITY;

-- Students may read their own turns; admin reads the whole corpus. Writes are
-- service-role only (no insert policy → blocked for normal clients).
DROP POLICY IF EXISTS "tutor_log_select_own" ON public.tutor_interaction_log;
CREATE POLICY "tutor_log_select_own"
  ON public.tutor_interaction_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tutor_log_select_admin" ON public.tutor_interaction_log;
CREATE POLICY "tutor_log_select_admin"
  ON public.tutor_interaction_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
