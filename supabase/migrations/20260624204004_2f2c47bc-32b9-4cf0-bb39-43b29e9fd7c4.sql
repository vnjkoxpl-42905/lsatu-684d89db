CREATE TABLE IF NOT EXISTS public.session_ingestions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id      text UNIQUE,
  gdrive_doc_id         text UNIQUE,
  calendar_event_id     text,
  status                text NOT NULL DEFAULT 'ingested'
                        CHECK (status IN ('ingested','needs_match','matched','stored','drafted','published','discarded','error')),
  matched_student_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  match_confidence      text CHECK (match_confidence IN ('high','medium','low','none')),
  match_reason          text,
  transcript_context_id uuid REFERENCES public.student_context(id) ON DELETE SET NULL,
  session_id            uuid REFERENCES public.student_sessions(id) ON DELETE SET NULL,
  draft_id              uuid REFERENCES public.ai_ta_drafts(id) ON DELETE SET NULL,
  raw_subject           text,
  raw_meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message         text,
  attempt_count         int NOT NULL DEFAULT 0,
  last_attempt_at       timestamptz,
  scan_requested_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolved_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  discard_reason        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_ingestions TO authenticated;
GRANT ALL ON public.session_ingestions TO service_role;

ALTER TABLE public.session_ingestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read session ingestions"
  ON public.session_ingestions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert session ingestions"
  ON public.session_ingestions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins update session ingestions"
  ON public.session_ingestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete session ingestions"
  ON public.session_ingestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.bump_session_ingestions_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_ingestions_updated_at ON public.session_ingestions;
CREATE TRIGGER session_ingestions_updated_at
  BEFORE UPDATE ON public.session_ingestions
  FOR EACH ROW EXECUTE FUNCTION public.bump_session_ingestions_updated_at();

CREATE INDEX IF NOT EXISTS session_ingestions_status_idx
  ON public.session_ingestions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS session_ingestions_student_idx
  ON public.session_ingestions (matched_student_id, created_at DESC);