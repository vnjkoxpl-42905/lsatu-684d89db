-- Phase D: logged tutoring sessions per student.
-- Separate from ta_interactions (TA chat log) and student_context (external
-- artifacts). A student_session is a record that Joshua met with the student:
-- when, for how long, the outcome, and optionally a link to an uploaded
-- transcript stored in student_context.

CREATE TABLE IF NOT EXISTS public.student_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at      timestamptz NOT NULL,
  status            text NOT NULL DEFAULT 'completed'
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  duration_minutes  int,
  transcript_id     uuid REFERENCES public.student_context(id) ON DELETE SET NULL,
  notes             text,
  source            text,
  created_by        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read student sessions"
  ON public.student_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert student sessions"
  ON public.student_sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update student sessions"
  ON public.student_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete student sessions"
  ON public.student_sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.bump_student_sessions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS student_sessions_updated_at ON public.student_sessions;
CREATE TRIGGER student_sessions_updated_at
  BEFORE UPDATE ON public.student_sessions
  FOR EACH ROW EXECUTE FUNCTION public.bump_student_sessions_updated_at();

-- Primary scan: sessions for a student, most recent first. Covers both
-- past (completed/cancelled/no_show) and future (scheduled) sessions —
-- the TA's prep brief uses this to find the next upcoming slot AND the
-- most recent completed session.
CREATE INDEX IF NOT EXISTS student_sessions_student_idx
  ON public.student_sessions (student_id, scheduled_at DESC);

-- Upcoming-session filter: supports "what's the next session for this
-- student?" queries without scanning the whole history.
CREATE INDEX IF NOT EXISTS student_sessions_upcoming_idx
  ON public.student_sessions (student_id, scheduled_at)
  WHERE status = 'scheduled';
