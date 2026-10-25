-- Phase B: per-student external context for the AI TA.
-- Separate from teaching_assets (shared curriculum) — this is per-student
-- intelligence: files, screenshots, transcripts, and notes the admin
-- uploads through the TA chat attachment bar. The ta-chat edge function
-- queries this table alongside analytics/WAJ/history so the TA has
-- awareness of what happened outside the platform.

CREATE TABLE IF NOT EXISTS public.student_context (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_type  text NOT NULL
                CHECK (context_type IN ('file','screenshot','transcript','note','external_score')),
  title         text NOT NULL,
  content_text  text,
  file_path     text,
  source        text,
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_context ENABLE ROW LEVEL SECURITY;

-- Admin-only CRUD. Students have zero access — the TA never surfaces
-- per-student context to the student directly. Approved assignments are
-- the only path to student-visible tables.
CREATE POLICY "Admins read student context"
  ON public.student_context FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert student context"
  ON public.student_context FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update student context"
  ON public.student_context FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete student context"
  ON public.student_context FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Primary scan: newest context for a given student, used by the TA chat
-- view's attachment list and the ta-chat edge function's prompt builder.
CREATE INDEX IF NOT EXISTS student_context_student_idx
  ON public.student_context (student_id, created_at DESC);

-- Optional filter by type (e.g., only transcripts) when building prep briefs.
CREATE INDEX IF NOT EXISTS student_context_type_idx
  ON public.student_context (student_id, context_type, created_at DESC);
