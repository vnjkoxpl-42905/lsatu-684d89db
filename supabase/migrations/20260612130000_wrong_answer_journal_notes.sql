-- User-scoped reflection notes for wrong_answer_journal entries.
--
-- Keyed by (user_id, class_id, qid) — matches the natural upsert key in
-- wajService. No FK to wrong_answer_journal so we avoid cross-id-space
-- constraints and policy conflicts.
--
-- RLS mirrors journal_pages: own rows + admin read.

CREATE TABLE IF NOT EXISTS public.wrong_answer_journal_notes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id          uuid NOT NULL,
  qid               text NOT NULL,
  root_cause        text,
  trap_pattern      text,
  student_note      text,
  next_action       text,
  review_status     text NOT NULL DEFAULT 'unreviewed'
                      CHECK (review_status IN ('unreviewed', 'in_progress', 'mastered')),
  reattempt_due_at  date,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, class_id, qid)
);

CREATE INDEX IF NOT EXISTS waj_notes_user_class_idx
  ON public.wrong_answer_journal_notes (user_id, class_id);

ALTER TABLE public.wrong_answer_journal_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waj_notes_select_own" ON public.wrong_answer_journal_notes;
CREATE POLICY "waj_notes_select_own"
  ON public.wrong_answer_journal_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "waj_notes_select_admin" ON public.wrong_answer_journal_notes;
CREATE POLICY "waj_notes_select_admin"
  ON public.wrong_answer_journal_notes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "waj_notes_insert_own" ON public.wrong_answer_journal_notes;
CREATE POLICY "waj_notes_insert_own"
  ON public.wrong_answer_journal_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "waj_notes_update_own" ON public.wrong_answer_journal_notes;
CREATE POLICY "waj_notes_update_own"
  ON public.wrong_answer_journal_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "waj_notes_delete_own" ON public.wrong_answer_journal_notes;
CREATE POLICY "waj_notes_delete_own"
  ON public.wrong_answer_journal_notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS waj_notes_updated_at ON public.wrong_answer_journal_notes;
CREATE TRIGGER waj_notes_updated_at
  BEFORE UPDATE ON public.wrong_answer_journal_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
