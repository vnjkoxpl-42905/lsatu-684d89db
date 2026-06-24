# Phase 1A — Lovable deploy prompt

Paste the block below into Lovable. It applies one migration and deploys one
edge function for the post-session intelligence pipeline (Phase 1A). The
frontend (resolver, ingest form, route) is already on `main` and will sync
automatically — Lovable only needs to do the two server-side steps.

After Lovable finishes, run the E2E checklist at the bottom.

---

## Prompt to paste into Lovable

> I have new code on the connected GitHub `main` branch for a "post-session
> intelligence" Phase 1A feature. The frontend files are already synced. I need
> you to do exactly two server-side things and nothing else. Do not change any
> other tables, functions, RLS, or UI. This feature is admin-only and must have
> zero student-facing impact.
>
> **1. Apply this database migration** (creates one new admin-only table,
> `public.session_ingestions`). It references existing tables
> `public.student_context`, `public.student_sessions`, `public.ai_ta_drafts`,
> `auth.users`, and the existing `public.has_role(uuid, text)` function — all of
> which already exist. Run it as-is:
>
> ```sql
> CREATE TABLE IF NOT EXISTS public.session_ingestions (
>   id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
>   gmail_message_id      text UNIQUE,
>   gdrive_doc_id         text UNIQUE,
>   calendar_event_id     text,
>   status                text NOT NULL DEFAULT 'ingested'
>                         CHECK (status IN (
>                           'ingested','needs_match','matched','stored',
>                           'drafted','published','discarded','error'
>                         )),
>   matched_student_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
>   match_confidence      text CHECK (match_confidence IN ('high','medium','low','none')),
>   match_reason          text,
>   transcript_context_id uuid REFERENCES public.student_context(id) ON DELETE SET NULL,
>   session_id            uuid REFERENCES public.student_sessions(id) ON DELETE SET NULL,
>   draft_id              uuid REFERENCES public.ai_ta_drafts(id) ON DELETE SET NULL,
>   raw_subject           text,
>   raw_meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
>   error_message         text,
>   attempt_count         int NOT NULL DEFAULT 0,
>   last_attempt_at       timestamptz,
>   scan_requested_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
>   created_by            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
>   resolved_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
>   resolved_at           timestamptz,
>   discard_reason        text,
>   created_at            timestamptz NOT NULL DEFAULT now(),
>   updated_at            timestamptz NOT NULL DEFAULT now()
> );
>
> ALTER TABLE public.session_ingestions ENABLE ROW LEVEL SECURITY;
>
> CREATE POLICY "Admins read session ingestions"
>   ON public.session_ingestions FOR SELECT TO authenticated
>   USING (public.has_role(auth.uid(), 'admin'));
>
> CREATE POLICY "Admins insert session ingestions"
>   ON public.session_ingestions FOR INSERT TO authenticated
>   WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());
>
> CREATE POLICY "Admins update session ingestions"
>   ON public.session_ingestions FOR UPDATE TO authenticated
>   USING (public.has_role(auth.uid(), 'admin'))
>   WITH CHECK (public.has_role(auth.uid(), 'admin'));
>
> CREATE POLICY "Admins delete session ingestions"
>   ON public.session_ingestions FOR DELETE TO authenticated
>   USING (public.has_role(auth.uid(), 'admin'));
>
> CREATE OR REPLACE FUNCTION public.bump_session_ingestions_updated_at()
> RETURNS trigger LANGUAGE plpgsql AS $$
> BEGIN
>   NEW.updated_at := now();
>   RETURN NEW;
> END;
> $$;
>
> DROP TRIGGER IF EXISTS session_ingestions_updated_at ON public.session_ingestions;
> CREATE TRIGGER session_ingestions_updated_at
>   BEFORE UPDATE ON public.session_ingestions
>   FOR EACH ROW EXECUTE FUNCTION public.bump_session_ingestions_updated_at();
>
> CREATE INDEX IF NOT EXISTS session_ingestions_status_idx
>   ON public.session_ingestions (status, created_at DESC);
>
> CREATE INDEX IF NOT EXISTS session_ingestions_student_idx
>   ON public.session_ingestions (matched_student_id, created_at DESC);
> ```
>
> **2. Deploy the edge function** named `ingest-session-note`. The full source
> is already in the repo at `supabase/functions/ingest-session-note/index.ts` —
> deploy that file as-is. Keep JWT verification ON (the function does its own
> admin check on top). It reuses the same connector secrets the existing
> `gdrive` function already uses: `LOVABLE_API_KEY` and `GOOGLE_DRIVE_API_KEY`
> (plus the standard `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`). Do not create
> new secrets; if any of those are missing, tell me rather than guessing.
>
> After both steps, confirm: the `session_ingestions` table exists with RLS
> enabled, and the `ingest-session-note` function shows as deployed. Do not
> deploy or modify any other function, and do not add cron. Report anything that
> failed instead of working around it.

---

## E2E verification checklist (run after Lovable confirms)

Sign in as admin, go to `/teacher/session-ingest`.

1. **Happy path:** paste a real Gemini Notes Google Doc id/URL, pick the correct
   enrolled student, Ingest. Expect: success panel with ingestion id, status
   `stored`, a transcript context id, a session id, and a size line. Check the
   student's dossier / `student_context` shows a new `transcript` row and
   `student_sessions` has the linked session. **Nothing should appear on the
   student side.**
2. **Idempotency:** ingest the same Doc id again. Expect: "Already ingested (no
   duplicate created)" — no second `session_ingestions` / `student_context` /
   `student_sessions` row.
3. **Orphan / bad id:** paste a malformed id, or pick is blocked. Expect a
   fail-closed error toast, no row written.
4. **Non-Google-Doc id:** paste a Drive file id that isn't a Google Doc. Expect
   `not_a_google_doc` error, no row written.
5. **Large transcript (if available):** a >100 KB Doc should store
   `content_text = null` and `metadata.inline_text = false`, with the full text
   in the `student-context` bucket. A smaller one stores both.

Report results back and we move to Phase 1B (Gmail scan + resolution queue).
