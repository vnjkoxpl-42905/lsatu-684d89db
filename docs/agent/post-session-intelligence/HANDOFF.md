# Handoff — Post-Session Intelligence Pipeline

For a future Claude/Codex session or a fresh chat. Read this first, then `STATUS.md`,
then `build-spec.md`. This handoff was refreshed after Phase 1A was deployed via
Lovable, Phase 1B was completed in code on `main`, and Codex added the
admin-route/ingest-integrity hardening commit.

## Current goal

Plan (and later build) a mostly hands-off, approval-first post-session intelligence
pipeline for LSAT U: Google Meet session → Gemini Notes (Gmail → Google Doc →
transcript) → match to enrolled student (email AND name) → AI-synthesized
student-facing bundle → Joshua reviews/approves per part → publish to Classroom +
notification + chat message authored as Joshua. The student profile becomes a tabbed
dossier in the Teacher Workspace.

## Where things live

- **Repo:** `~/ai-os/projects/lsatu`
- **Planning folder:** `docs/agent/post-session-intelligence/`
- **Phase 1A E2E checklist:** `docs/agent/post-session-intelligence/PHASE-1A-E2E-RUNBOOK.md`
- **Phase 1B E2E checklist:** `docs/agent/post-session-intelligence/PHASE-1B-E2E-RUNBOOK.md`
- **Product/decision layer (Obsidian):** `~/ai-os/` — teaching voice
  `wiki/teaching-voice.md` (live); pre-2026-07-16 product context archived at
  `archive/wiki-pre-rebuild-2026-07-16/domains/lsat-u/synthesis/intro-to-lr-product.md`.
- **Student records:** `~/ai-os/students/<name>/` — transcripts and notes are primary
  data here; see `~/ai-os/students/README.md` before writing anything back.
- **Source brief:** `~/Downloads/lsatu_post_session_intelligence_claude_code_prompt (1).md`

## Current status

**Phase 1A was deployed live via Lovable, but live is now behind `main`.** The
`session_ingestions` migration was applied in Lovable's canonical form,
`ingest-session-note` was deployed, and local types were regenerated. Since then,
commit `159bdd6609332101e82d4544608b0ea644fc6507` hardened admin route redirects and
ingest rollback/orphan cleanup. Before Joshua runs the real-doc Phase 1A E2E,
Lovable must redeploy the frontend and `ingest-session-note` from current `main`.
Do not substitute a fake transcript or write to a real student on a guess.

**Phase 1B is code complete on `main` but not deployed.** The `scan-session-notes`
function, shared ingest core, hook, and resolution queue UI are implemented. Joshua
will deploy this through Lovable using `~/Downloads/PHASE-1B-LOVABLE-PROMPT.md`.
That Lovable pass should also include the Phase 1A hardening redeploy if it has not
already happened. After deploy, Joshua should run `PHASE-1B-E2E-RUNBOOK.md`. Do not
deploy it directly.

**Phase 2 and Phase 3 are now code complete on `main`** (commit `ff443bf`).
Synthesis (`synthesize-session-bundle`), the per-part review UI, the tabbed
student dossier, and the client-side publish path are built and pass
typecheck/lint/build. Only `synthesize-session-bundle` needs a Lovable deploy
(see `PHASE-2-LOVABLE-DEPLOY.md`); the dossier, review UI, and publish ship on
the next frontend Publish (publish runs under the admin JWT, no function deploy).
Synthesis quality should still be validated against a real Gemini Notes
transcript once one is ingested — the prompt is conservative but unverified on
real data. The confident auto-attach decision (Phase 1B) is unchanged.

## Blockers resolved this pass

- **Student ID mapping (§3b):** `profiles.class_id` IS the `auth.users.id` (UUID as
  text) — confirmed in `admin-manage-users/index.ts`. Build a safe `resolveStudentAuthId`
  helper (validate UUID + confirm auth.users row + fail closed on orphans), don't raw-cast.
- **Raw transcript storage (§5a):** the `student-context` bucket is canonical/always;
  `content_text` is populated only when the transcript is < ~100 KB.
- **Admin route/auth behavior:** anonymous admin-route users redirect to
  `/auth?returnTo=...`; signed-in non-admin users still see locked/access-denied; local
  dev bypass remains.
- **Ingest data integrity:** late required-write failures clean up created transcript
  storage/context/session artifacts; duplicate/race paths intentionally return
  `already_ingested` after re-querying the ledger.

## Codex corrections folded in (read build-spec for detail)

- Matchable predicate is exact now: `role='student' AND has_classroom_access=true`
  (no generic "enrolled" flag). Roster keyed by `class_id`. (§3a)
- **ID duality — resolved**: `class_id` IS `auth.users.id`; use the safe
  `resolveStudentAuthId` helper, fail closed on orphans. (§3b)
- RLS is not just role: `student_context`/`student_sessions`/`ai_ta_drafts` INSERT need
  `created_by = auth.uid()`. V1 runs under admin JWT; cron/service-role must set
  `created_by` + `scan_requested_by` explicitly. (§9a)
- Calendar: `schedule_events` has **no attendee emails**; V1 corroborates by time+title
  window only; attendee match needs a direct event fetch (added scope). (§3d)
- `session_ingestions` expanded with safety/audit fields (unique gmail/doc ids,
  error_message, attempt_count, resolved_by, etc.). (§9b)
- Transcript stored in **both** `content_text` (if small) and the bucket (always);
  large transcripts truncate `content_text` + chunk-read the bucket. (§5a)
- Publish: reuse `notifyStudentOfClassroomItem` **only for homework** ("New assignment"
  copy); build a **session-bundle notifier** for note + Joshua chat copy. (§6)
- Partial approval: per-part flags in `draft_json`; row `status` rolls up to `approved`
  only when all parts approved. (§5)
- Dossier: acceptance rule — every V1 tab queries real data + honest empty state, no
  mock tabs. (§8)

## Decisions locked

1. Synthesis AI: Lovable Gateway (Gemini) now, Claude later behind a model-config indirection.
2. Trigger: manual "Scan" button in V1; cron later.
3. Dossier: tabbed shell, real tabs only (Overview, Sessions/Transcripts, Homework, Notes).
4. Publish: approve per part first, then a separate Publish action; partial publish allowed.

## Next step

First, redeploy the frontend and `ingest-session-note` hardening via Lovable. Then have
Joshua run `PHASE-1A-E2E-RUNBOOK.md`, especially the real Gemini Notes email and Doc format.
If the email + Doc provide reliable student email, name, and calendar agreement, the
next build step is to turn on confident auto-attach in `scan-session-notes`; the parser
and calendar hints are already wired, but the current deployed-intent behavior is
conservative and queues everything.

## Remaining open decisions (deferred — do NOT block Phase 1A)

- Calendar corroboration depth (§3d, Phase 1B).
- Service-role / cron timing (§9a, Phase 3).
- `notifications.type` for session notes (§6, Phase 3).

## Blockers

- Phase 1A hardening redeploy is pending: Lovable must redeploy the frontend and
  `ingest-session-note` from current `main`.
- Phase 1A happy-path E2E is pending after that redeploy and must be run by Joshua
  with a real Gemini Notes Doc and his admin session.
- Phase 1B deployment is pending and must be done by Joshua via Lovable.
- Confident auto-attach is intentionally disabled until the real email/Doc format is
  confirmed.

## Do NOT do yet

- Do not apply migrations or create/modify live Supabase schema directly.
- Do not deploy or modify edge functions directly.
- Do not enable cron.
- Do not publish anything student-facing; do not expose raw transcripts or source labels.
- Do not redesign the Teacher Workspace or rebuild existing analytics/classroom/
  messaging/notification systems.
- Do not switch the AI provider yet (Gemini gateway stays for V1).

## Reuse, don't rebuild (key handles)

- Review/approval queue: `ai_ta_drafts` + `useAITADrafts` / `useUpdateDraftStatus`.
- Transcript storage: `student_context` (`context_type='transcript'`) + `student_sessions`.
- Publish rails: `homework_assignments`, `classroom_items`, `notifications`,
  `conversations`/`messages` via `src/lib/adminConversation.ts`.
- Roster: `HubStudentList`. Dossier target: `src/pages/teacher/TeacherStudentDetail.tsx`.
- Google: `supabase/functions/{gmail,gdrive,gcal-list-calendars,gcal-sync-pull}`.
