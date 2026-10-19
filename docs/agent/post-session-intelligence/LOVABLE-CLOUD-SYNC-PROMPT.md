# Lovable Cloud Sync — Post-Session Intelligence Pipeline

One consolidated deploy/sync pass for the whole pipeline (Phases 1A, 1B, 2, 3).
Supersedes the per-phase prompts. Built from a full-scale code audit on
2026-06-25. Paste section A into Lovable. Sections B and C are the audit and the
smoothness checklist for you.

---

## A. PASTE THIS INTO LOVABLE

> **Goal:** Bring the LSAT U backend fully in sync with current `main` for the
> post-session-intelligence pipeline (Gemini Notes email to Google Doc to a
> reviewed, approval-gated student bundle). Everything below already exists in
> the repo on `main`. Do not write new product code. Do not change schema beyond
> confirming what is listed. Do not enable cron. Do not build an AI Suggestions
> surface. Do not publish anything student-facing. This is a sync/deploy pass
> only.
>
> **1. Confirm the migration is applied (no new migration needed).**
> Verify the table `public.session_ingestions` exists with these 23 columns:
> `id, gmail_message_id, gdrive_doc_id, calendar_event_id, status,
> matched_student_id, match_confidence, match_reason, transcript_context_id,
> session_id, draft_id, raw_subject, raw_meta, error_message, attempt_count,
> last_attempt_at, scan_requested_by, created_by, resolved_by, resolved_at,
> discard_reason, created_at, updated_at`. It should have: a `status` CHECK in
> (`ingested, needs_match, matched, stored, drafted, published, discarded,
> error`); unique constraints on `gmail_message_id` and `gdrive_doc_id`; indexes
> `session_ingestions_status_idx` and `session_ingestions_student_idx`; the
> `bump_session_ingestions_updated_at` BEFORE UPDATE trigger; admin-only RLS for
> SELECT/INSERT/UPDATE/DELETE with `created_by = auth.uid()` on INSERT. This was
> applied as `supabase/migrations/20260624204004_2f2c47bc-32b9-4cf0-bb39-43b29e9fd7c4.sql`.
> If it is already present, do nothing. Do NOT recreate it.
>
> **2. Deploy / redeploy these three edge functions from current `main`:**
> - `ingest-session-note` (redeploy — picks up the auth + rollback hardening)
> - `scan-session-notes` (new — actions `scan` / `resolve` / `discard`; depends
>   on `supabase/functions/_shared/sessionIngestCore.ts`, deploy the shared file
>   with it)
> - `synthesize-session-bundle` (new — it calls the internal `gemini-proxy`
>   function, NOT the Lovable gateway directly, so `gemini-proxy` must already be
>   deployed and healthy)
>
> **3. Confirm these function secrets exist** (all but the last are already used
> by other deployed functions, so they should already be set):
> - `SUPABASE_URL` (auto)
> - `SUPABASE_SERVICE_ROLE_KEY` (auto)
> - `LOVABLE_API_KEY` (used by the Drive connector calls AND the AI gateway)
> - `GOOGLE_DRIVE_API_KEY` (X-Connection-Api-Key for the Drive connector)
> - `GOOGLE_MAIL_API_KEY` (X-Connection-Api-Key for the Gmail connector)
> - `EDGE_INTERNAL_KEY` — **REQUIRED on `synthesize-session-bundle`, and it must
>   be the exact same value `gemini-proxy` already uses.** Since the Phase 0
>   hardening, `gemini-proxy` rejects any request whose `x-internal-key` header
>   does not match this secret, and `synthesize-session-bundle` now calls it
>   instead of the gateway directly. If this secret is missing or different on
>   either function, every "Build bundle" fails with a 401 from the proxy and
>   nothing else in the pipeline reports a problem. Please confirm it is set on
>   BOTH functions with the same value.
> - `SESSION_SYNTHESIS_MODEL` — OPTIONAL. If unset, the function defaults to
>   `google/gemini-3-flash-preview`. Only set this to override the model.
>
> **4. Confirm these Google connectors are authorized in Lovable Cloud** for the
> account whose mailbox holds the Gemini Notes emails:
> - **Google Mail** (Gmail) — `scan-session-notes` searches
>   `from:gemini-notes@google.com` for session-note emails.
> - **Google Drive** — `ingest-session-note` and `scan-session-notes` export the
>   linked Google Doc to text/plain.
> (Google Calendar is already authorized for the existing calendar functions and
> is reused for time+title corroboration only.)
>
> **5. Confirm the `student-context` storage bucket exists** with admin-only RLS
> on `storage.objects` (created back on 2026-04-24). Transcripts are written to
> `student-context/{studentId}/{contextId}/transcript.txt`. Do not change its
> policies.
>
> **6. Regenerate Supabase TypeScript types** if `session_ingestions` is not
> already present in `src/integrations/supabase/types.ts` (it currently is, so
> this is a no-op unless drift is detected).
>
> **7. Publish the frontend.** The Phase 3 publish path
> (`src/lib/publishSessionBundle.ts`, `src/lib/sessionBundleNotify.ts`), the
> dossier tabs on `TeacherStudentDetail.tsx`, the review UI
> (`SessionBundleReview.tsx`), and the `/teacher/session-ingest` page all ship on
> the next Publish and run under the admin JWT — no extra function deploy needed
> for publish.
>
> **After the deploy, report back:** the deployed function versions for the three
> functions, whether the migration was already present, and any connector that is
> NOT authorized. Do not run any student-facing action.

---

## B. FULL AUDIT (what the pipeline actually touches)

### Edge functions and what each needs

| Function | Phase | Reads/Writes | Bucket | Connector / Gateway | Secrets |
|---|---|---|---|---|---|
| `ingest-session-note` | 1A | RW `session_ingestions`; R `user_roles`, `profiles`; W `student_context`, `student_sessions` | `student-context` (write) | Drive export | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `GOOGLE_DRIVE_API_KEY` |
| `scan-session-notes` | 1B | RW `session_ingestions`; R `user_roles`, `schedule_events`, `profiles`; W `student_context`, `student_sessions` (on resolve) | `student-context` (write) | Gmail list/fetch, Drive export (resolve) | + `GOOGLE_MAIL_API_KEY` |
| `synthesize-session-bundle` | 2 | RW `session_ingestions`; R `student_sessions`, `student_context`, `user_roles`; W `ai_ta_drafts` | `student-context` (read) | internal `gemini-proxy` → Lovable AI gateway (rewired 2026-07-09; was `ai.gateway.lovable.dev` direct) | + `EDGE_INTERNAL_KEY` (**required**, must match `gemini-proxy`), `SESSION_SYNTHESIS_MODEL` (optional) |
| `_shared/sessionIngestCore.ts` | shared | resolve + Drive export + transcript store/cleanup | `student-context` | Drive | `LOVABLE_API_KEY`, `GOOGLE_DRIVE_API_KEY` |

Phase 3 publish is **client-side** (`publishSessionBundle.ts` +
`sessionBundleNotify.ts`) under the admin JWT — writes `classroom_items`,
`conversations`, `messages`, `notifications`, `ai_ta_drafts`. No function.

### Database

- **Pipeline-owned table:** `session_ingestions` — migration
  `20260624204004_2f2c47bc-32b9-4cf0-bb39-43b29e9fd7c4.sql`, already applied,
  types already regenerated. 23 columns, 2 indexes, 4 admin-only RLS policies,
  1 updated_at trigger, FKs to `auth.users`, `student_context`,
  `student_sessions`, `ai_ta_drafts`.
- **Pre-existing dependencies (no action):** `student_context` (2026-04-24),
  `student_sessions` (2026-04-24), `ai_ta_drafts` (2026-05-06), `classroom_items`
  (2026-05-06), `conversations`/`messages` (2026-04-16), `notifications`
  (2026-04-24).
- **Storage:** `student-context` bucket (2026-04-24), admin-only RLS. Pre-exists.
- **No pending migration** dated after 2026-06-24.

### Secrets summary

- **Already set (shared with other live functions):** `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `GOOGLE_DRIVE_API_KEY`,
  `GOOGLE_MAIL_API_KEY`.
- **New + optional:** `SESSION_SYNTHESIS_MODEL` (defaults to
  `google/gemini-3-flash-preview`).

### Connectors needing authorization

- Google Mail (Gmail) and Google Drive — required by the pipeline.
- Google Calendar — already authorized for existing functions; reused.

### Frontend

- Route `/teacher/session-ingest` (`ProtectedRoute requireAdmin`) →
  `TeacherSessionIngest` (scan + queue + resolve + manual single ingest).
- `/teacher/students/:studentId` → `TeacherStudentDetail` dossier (Overview /
  Sessions+Transcripts / Homework / Notes) with Build bundle + review +
  publish. Ships on Publish.

### Verified green

- App typecheck: pipeline files clean (only unrelated untracked scratch files
  `AssistantCommandLine.tsx`, `finalSet.ts` error).
- Tests: 311 pass; the one failure (`AcademyMainhub.test.tsx`) is pre-existing
  and unrelated.
- All 3 functions, the shared core, all 9 frontend/lib files present and wired.

---

## C. SMOOTHNESS CHECKLIST (make this flow repeatable)

**Before each Lovable sync**
- [ ] `git push` to `main` is done and CI/typecheck is green for the pipeline
      files (ignore the known unrelated `AcademyMainhub` test + scratch-file tsc
      errors, or clean them up first).
- [ ] New edge functions added since last deploy are listed explicitly in the
      prompt (Lovable will not infer them).
- [ ] Any new `Deno.env.get(...)` secret is named in the prompt with its default.

**One-time backend setup (verify once, then it stays true)**
- [ ] Gmail + Drive connectors authorized on the Gemini-Notes mailbox account.
- [ ] `student-context` bucket present with admin-only RLS.
- [ ] `session_ingestions` table + RLS present.

**After each deploy (your 10-minute E2E)**
- [ ] `/teacher/session-ingest` → Scan → a real `gemini-notes@google.com` email
      shows with the right student name parsed and the email summary visible.
- [ ] Resolve to the correct student → Doc exports and attaches; nothing
      auto-attached before the pick.
- [ ] Student dossier → Sessions → Build bundle → only transcript-supported
      parts, no AI/Gemini/transcript labels.
- [ ] Approve parts → Publish → student sees clean recap + homework, no source
      labels, no raw transcript.
- [ ] Re-scan and re-publish → no duplicates, posted parts skipped.

**Things that will bite if forgotten**
- New edge function not named in the prompt → silently never deployed.
- A function reads a new secret that was never set → 500 at call time, not at
  deploy time. Always name secrets in the prompt.
- Connector token expired/revoked → Gmail/Drive calls 401 inside the function.
  Re-authorize in Lovable, no code change.
- Editing `_shared/sessionIngestCore.ts` requires redeploying every function
  that imports it (currently `scan-session-notes`; `ingest-session-note` keeps
  its own copy until its next change).

**Future smoothing (optional, deferred by design)**
- Consolidate `ingest-session-note` onto the shared core so there is one
  transcript-store code path.
- Confident auto-attach on email+name+calendar agreement (parser already wired;
  currently conservative, queues everything).
- Cron trigger for scan (forces a service-role path; only after matching is
  proven on real data).
