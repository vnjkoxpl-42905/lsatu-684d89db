-- Post-Session Intelligence Pipeline — Phase 1A.
-- Ledger + resolution-queue backing store for ingesting Gemini Notes
-- (Gmail message -> Google Doc -> transcript) and attaching them to an
-- enrolled student. One row per ingested source artifact.
--
-- This table is the IDEMPOTENCY guard (unique gmail_message_id / gdrive_doc_id
-- so re-scans never double-ingest) AND the audit/attribution record for the
-- whole chain: who scanned, who resolved a match, who discarded.
--
-- NOTE: authored as part of the Phase 1A build but NOT yet applied. Applying
-- this migration requires Joshua's explicit OK.
--
-- See docs/agent/post-session-intelligence/build-spec.md §9b.

CREATE TABLE IF NOT EXISTS public.session_ingestions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source identity + dedup. A single Gemini Notes ingestion is keyed by the
  -- Google Doc; the originating Gmail message is recorded when available.
  -- Both are UNIQUE so a re-scan of the same email/doc is a no-op.
  gmail_message_id      text UNIQUE,
  gdrive_doc_id         text UNIQUE,
  calendar_event_id     text,                     -- corroboration ref (Phase 1B)

  -- Lifecycle. Phase 1A reaches `stored` (transcript attached) or lands in
  -- `needs_match` / `discarded` / `error`. `drafted` (Phase 2) and `published`
  -- (Phase 3) are reserved for later phases.
  status                text NOT NULL DEFAULT 'ingested'
                        CHECK (status IN (
                          'ingested','needs_match','matched','stored',
                          'drafted','published','discarded','error'
                        )),

  -- Match result. `matched_student_id` is the resolved auth.users.id (NULL
  -- until a confident/manual match). `match_reason` mirrors the resolver's
  -- ResolveFailureReason or a success note.
  matched_student_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  match_confidence      text CHECK (match_confidence IN ('high','medium','low','none')),
  match_reason          text,

  -- Downstream artifacts produced from this source.
  transcript_context_id uuid REFERENCES public.student_context(id) ON DELETE SET NULL,
  session_id            uuid REFERENCES public.student_sessions(id) ON DELETE SET NULL,
  draft_id              uuid REFERENCES public.ai_ta_drafts(id) ON DELETE SET NULL,

  -- Raw source metadata kept admin-side for trust/debugging (never shown to
  -- the student): parsed subject, doc title, sender, parsed name/email,
  -- calendar window hit, byte sizes, inline_text flag, etc.
  raw_subject           text,
  raw_meta              jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Error / retry bookkeeping.
  error_message         text,
  attempt_count         int NOT NULL DEFAULT 0,
  last_attempt_at       timestamptz,

  -- Attribution / audit. `scan_requested_by` and `created_by` are the actor
  -- for the ingest (Joshua under manual JWT in V1; the designated admin under
  -- service-role/cron in Phase 3). `resolved_by` / `resolved_at` record who
  -- cleared a needs_match item from the resolution queue.
  scan_requested_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resolved_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at           timestamptz,
  discard_reason        text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_ingestions ENABLE ROW LEVEL SECURITY;

-- Admin-only. INSERT additionally pins `created_by = auth.uid()` under a user
-- JWT (matching student_context / student_sessions / ai_ta_drafts). The
-- service role bypasses RLS for future cron but is still required by app logic
-- to populate created_by + scan_requested_by explicitly (build-spec §9a).
CREATE POLICY "Admins read session ingestions"
  ON public.session_ingestions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert session ingestions"
  ON public.session_ingestions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE POLICY "Admins update session ingestions"
  ON public.session_ingestions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete session ingestions"
  ON public.session_ingestions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.bump_session_ingestions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_ingestions_updated_at ON public.session_ingestions;
CREATE TRIGGER session_ingestions_updated_at
  BEFORE UPDATE ON public.session_ingestions
  FOR EACH ROW EXECUTE FUNCTION public.bump_session_ingestions_updated_at();

-- Resolution queue scan: open items first, newest first.
CREATE INDEX IF NOT EXISTS session_ingestions_status_idx
  ON public.session_ingestions (status, created_at DESC);

-- Per-student lookup: every ingestion attached to a student.
CREATE INDEX IF NOT EXISTS session_ingestions_student_idx
  ON public.session_ingestions (matched_student_id, created_at DESC);
