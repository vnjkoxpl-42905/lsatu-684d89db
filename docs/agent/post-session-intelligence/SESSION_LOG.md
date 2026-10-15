# Session Log — Post-Session Intelligence Pipeline

Append-only-ish running log. Newest entries at the bottom of each section. Keep this
current so a token-out or new-chat handoff is immediate.

---

## 2026-06-24 — Spec pass (Claude / Opus)

### Inspected
- Teacher Workspace: `TeacherShell.tsx`, `TeacherDeskPreview.tsx`, all
  `src/pages/teacher/*` incl. untracked pages, `TeacherStudentDetail.tsx` (read in
  full — thin: 4 stat cards + 4 action rows, legacy `profiles.class_id`).
- Reusable systems: inbox (`useInbox`, `adminConversation.ts`), notifications,
  assignments (`homework_assignments`), `student_context`, `student_sessions`,
  `ai_ta_drafts`, external uploads, classroom items.
- Backend: 30 edge functions; Google connectors (`gmail`, `gdrive`, `gcal-*`) confirmed
  live via Lovable Connector Gateway; AI only via Lovable AI Gateway (Gemini), no
  Anthropic/OpenAI client.
- Read migrations directly: `ai_ta_drafts`, `student_sessions`, `student_context`
  (confirmed enums, FKs, admin-only RLS).

### Key finding
The source brief assumed Google might be stubbed. It is not — Gmail/Drive/Calendar are
wired, and half the data model (`ai_ta_drafts` with `session_recap`/
`classroom_update_bundle`, `student_sessions.transcript_id` → `student_context`,
`context_type='transcript'`) already fits. Build = orchestration + dossier +
publish-materialization on existing rails, not greenfield.

### Questions asked → answered (Joshua)
1. AI model for synthesis → **Gateway now (Gemini), Claude later** (behind config indirection).
2. Trigger for V1 → **Manual now, cron later** (callable orchestrator + Scan button).
3. Dossier scope → **Tab shell, real tabs only** (Overview, Sessions/Transcripts, Homework, Notes).
4. Publish flow → **Approve, then publish separately** (distinct Publish action; partial allowed).

Mid-pass, Joshua added a requirement: include handoff/tracking files (`SESSION_LOG.md`,
`HANDOFF.md`, `STATUS.md`) in the planning folder and keep them updated.

### Files created (planning only — no app code)
- `docs/agent/post-session-intelligence/README.md`
- `docs/agent/post-session-intelligence/build-spec.md`
- `docs/agent/post-session-intelligence/claude-implementation-plan.md`
- `docs/agent/post-session-intelligence/codex-review-prompt.md`
- `docs/agent/post-session-intelligence/repo-inspection-summary.md`
- `docs/agent/post-session-intelligence/lovable-handoff-prompt.md`
- `docs/agent/post-session-intelligence/SESSION_LOG.md` (this file)
- `docs/agent/post-session-intelligence/HANDOFF.md`
- `docs/agent/post-session-intelligence/STATUS.md`

### Files changed (app/schema)
- None. No app code, no schema, no migrations, no production behavior touched.

### Pending approval / open
- Spec needs Codex red-team (`codex-review-prompt.md`) before any build.
- Then Joshua's go-ahead to start Phase 1.
- Approvals still required later: applying the `session_ingestions` migration,
  deploying edge functions, enabling cron, any model/secret change.

### Next action
Run the Codex review, then report back to Joshua for build approval.

---

## 2026-06-24 — Revision pass after Codex red-team (Claude / Opus)

Codex red-teamed the plan against the real repo: direction right, Phase 1 not ready.
Verified the relevant repo facts directly before revising (`useHubStudents` flags,
`src/lib/classroomNotify.ts`, `schedule_events` columns).

### Repo facts confirmed this pass
- Real flags from `HubStudentRow`: `has_classroom_access`, `has_chat_access`,
  `has_ta_access`, `has_analytics_access`, `has_schedule_access`, etc. Roster keyed by
  `class_id`. No generic "enrolled" flag.
- `schedule_events` (`20260513111010...`) has **no attendee columns**.
- `notifyStudentOfClassroomItem` hardcodes "New assignment" copy in inbox + bell + email.
- FK tables (`student_context`/`student_sessions`/`ai_ta_drafts`/`notifications`/
  `conversation_participants`) key off `auth.users(id)`, not `class_id`.
- `student_context`/`student_sessions` INSERT RLS requires `created_by = auth.uid()`.

### Corrections applied (10)
1. Exact matchable predicate `role='student' AND has_classroom_access=true` (§3a) + ID
   resolution to auth.users.id (§3b).
2. Phase 1 split into 1A (manual single ingest from known Gmail/Doc id) and 1B (scan
   window + resolution queue + calendar). Synthesis stays Phase 2, publish Phase 3.
3. RLS/service-role/audit story: admin JWT for V1 (created_by=auth.uid()); service-role
   must set created_by + scan_requested_by (§9a).
4. Calendar claim reduced to time+title window; attendee-email needs direct fetch (§3d).
5. `session_ingestions` expanded with safety/audit fields incl. unique gmail/doc ids,
   error_message, attempt_count, last_attempt_at, scan_requested_by, resolved_by, etc. (§9b).
6. Transcript stored in both `content_text` (if small) and bucket (always); large →
   truncate + chunk-read (§5a).
7. Publish: reuse helper only for homework; new session-bundle notifier for note +
   Joshua chat copy (§6).
8. Partial approval: per-part flags in draft_json; row status rolls to approved only
   when all parts approved (§5).
9. Dossier real-tabs acceptance rule: real query + honest empty state, no mock tabs (§8).
10. HANDOFF + STATUS updated; open decisions §12 added.

### Files changed (docs only)
build-spec.md, claude-implementation-plan.md, repo-inspection-summary.md, HANDOFF.md,
STATUS.md, SESSION_LOG.md, lovable-handoff-prompt.md. No app/schema/migration changes.

### Open decisions gating Phase 1A
- §3b class_id vs auth.users.id (blocks writes); §5a transcript size bound.
- Soft: §3d calendar depth, §9a service-role timing, §6 notifications.type for notes.

### Phase 1A readiness
Ready to build once §3b and §5a are answered. Migration authored-not-applied; function
deploy and migration apply still gated on Joshua.

---

## 2026-06-24 — Blocker resolution pass (Claude / Opus)

Joshua asked to solve the two pre-build blockers before implementation; Calendar stays
Phase 1B, notifications/publish/chat stay Phase 3; docs only.

### Blocker 1 — Student ID mapping (RESOLVED by inspection, not assumption)
Read `supabase/functions/admin-manage-users/index.ts`: email = `emailMap.get(p.class_id)`
keyed by `auth.users.id` (~L132/142); role = `roleMap.get(p.class_id)` keyed by
`user_roles.user_id` (~L137/143). Therefore **`profiles.class_id` IS the `auth.users.id`**
(UUID stored as text; `class_id text PRIMARY KEY` vs `auth.users.id uuid`). Decision:
build a safe `resolveStudentAuthId(class_id)` helper — validate UUID, confirm auth.users
row exists, return uuid, **fail closed** on orphans (the `email==='unknown'` case). No raw
cast; no write against an unresolved id. Helper is a Phase 1A deliverable, reused everywhere.

### Blocker 2 — Raw transcript storage (DECIDED)
`student-context` bucket = canonical raw store, always. `content_text` populated only when
transcript < ~100 KB (inline convenience for synthesis). > ~100 KB → bucket only,
`content_text` null/header, `metadata.full_artifact_path` set; synthesis chunk-reads the
bucket. Never treat `content_text` as source of truth.

### Scope held
Calendar corroboration stays Phase 1B; notifications/publish/Joshua chat stay Phase 3.
Phase 1A scope unchanged otherwise.

### Files changed (docs only)
build-spec.md (§3b, §5a, §12), claude-implementation-plan.md (Phase 1A), 
repo-inspection-summary.md (ID model), HANDOFF.md, STATUS.md, SESSION_LOG.md.
No app/schema/migration changes.

### Result
Both pre-build blockers resolved. **Phase 1A has no remaining blockers** and is ready to
build on Joshua's go. Migration-apply + function-deploy still gated on Joshua.

---

## 2026-06-24 — Phase 1A build (Claude / Opus 4.8)

### Built
- `src/lib/resolveStudentAuthId.ts` — pure fail-closed resolver: `isWellFormedUuid` +
  `resolveStudentAuthIdFromRoster` (UUID format → roster membership → orphan (`email==='unknown'`)
  → student role → classroom-access delivery gate). Typed `ResolveFailureReason`.
- `src/lib/resolveStudentAuthId.test.ts` — 11 vitest cases, all passing.
- `supabase/migrations/20260624150000_create_session_ingestions.sql` — ledger table
  (unique `gmail_message_id`/`gdrive_doc_id` dedup, status enum, match fields, artifact
  FKs, audit/attribution cols, admin-only RLS with `created_by=auth.uid()` on INSERT,
  updated_at trigger, status + per-student indexes). **NOT applied.**
- `supabase/functions/ingest-session-note/index.ts` — admin-only POST. Resolves student
  via authoritative `admin.auth.admin.getUserById` + admin-role + classroom-access checks
  (fail closed, 422 on orphan/not-student/no-access). Idempotent `.or()` dedup. Exports
  Doc as `text/plain` via Drive connector gateway. Stores transcript: bucket always
  (`{studentId}/{contextId}/transcript.txt`, rolls back row on upload failure),
  `content_text` only when ≤100 KB (`metadata.inline_text`). Links `student_sessions`.
  Writes `session_ingestions` ledger (status `stored`, `created_by`/`scan_requested_by`/
  `resolved_by` = caller). ZERO synthesis, ZERO student-facing output. **NOT deployed.**
- `src/pages/teacher/TeacherSessionIngest.tsx` + route `/teacher/session-ingest`
  (admin-only, standalone like `/teacher/tutor-corpus`). Doc-id/URL parse, roster picker,
  optional gmail id, client-side resolver guard, result panel. No nav/dock changes.

### Verified
- `npx vitest run` resolver suite: 11/11 pass.
- `npx tsc --noEmit -p tsconfig.app.json`: no errors in new files (fixed one loose-mode
  union-narrowing access in the form).
- `npx eslint` new client files: clean.
- Preview at `/teacher/session-ingest`: form renders, real roster loads (Adriana Varea,
  Andrew, …), submit disabled until both fields set. Screenshot captured.

### Held at gate (await Joshua's explicit OK)
- Apply migration `20260624150000`.
- Deploy `ingest-session-note`.
- End-to-end run on a real Gemini Notes Doc (needs deploy): orphan refused, re-ingest
  no duplicate, nothing student-visible.

### Result
Phase 1A code complete and verified locally. Nothing applied/deployed; no student impact.
Next: Joshua approves migration-apply + function-deploy, then E2E verify, then Phase 1B.

---

## 2026-06-24 — Phase 1A/1B blocker hardening (Codex / GPT-5)

Joshua asked to fix only the two remaining completion blockers: admin route/auth behavior
and ingest rollback/orphan cleanup. Scope stayed limited: no deploys, no migrations, no
Phase 1B deploy, no synthesis, no publish, no notifications/chat/homework/quiz/cron, and
no student-facing output.

### Built
- `src/components/ProtectedRoute.tsx` now redirects anonymous users on admin/flagged
  protected routes to `/auth?returnTo=...` while preserving the existing localhost/dev
  bypass. Signed-in non-admin users still see `LockedModule`.
- `src/lib/authRedirect.ts` now accepts only safe internal `returnTo` paths and routes
  successful auth back to the preserved destination.
- `src/components/ProtectedRoute.test.tsx` covers the anonymous admin redirect, signed-in
  non-admin locked state, and local dev bypass.
- `supabase/functions/_shared/sessionIngestCore.ts` now tracks `storagePath`, exposes
  `cleanupStoredTranscript`, and treats unique violations explicitly.
- `supabase/functions/ingest-session-note/index.ts` now cleans up created
  `student_context`, `student_sessions`, and storage artifacts if a required late ledger
  write fails. Unique ledger races re-query the existing ingestion and return
  `already_ingested` instead of leaving partial transcript/session rows.
- `supabase/functions/scan-session-notes/index.ts` now cleans up transcript artifacts if
  a resolve ledger update fails after creating storage/session/context rows.

### Verified
- Commit pushed to `main`: `159bdd6609332101e82d4544608b0ea644fc6507`
  (`fix(session-intelligence): harden auth and ingest integrity`).
- `HEAD` and `origin/main` both point at the blocker commit.
- Targeted tests passed: `npm test -- --run src/lib/resolveStudentAuthId.test.ts
  src/components/ProtectedRoute.test.tsx` → 14/14 passing.
- Local preview route check: `curl -I http://localhost:4173/teacher/session-ingest`
  returned `HTTP/1.1 200 OK`.
- Production-build check passed with larger heap:
  `NODE_OPTIONS=--max-old-space-size=6144 npm run build`.
- Typecheck was attempted. The completed run failed only in unrelated pre-existing
  untracked files: `src/pages/teacher/desk/AssistantCommandLine.tsx` and
  `src/topics/abstract/data/finalSet.ts`. A later repeat invocation hung silently and
  was stopped rather than conflating that with blocker status.

### Current phase after this pass
- Phase 1A remains deployed but needs Lovable redeploy of the frontend and
  `ingest-session-note` for these hardening fixes to be live.
- Phase 1A E2E is safe after that redeploy.
- Phase 1B remains code complete on `main` but not deployed; deploy remains Joshua's
  Lovable task.

---

## 2026-06-24 — Deploy-gate documentation correction (Codex / GPT-5)

Continued the active project-plan ownership pass. Re-read `STATUS.md`, `HANDOFF.md`,
`lovable-handoff-prompt.md`, the external Phase 1B Lovable prompt, and current git state
after the blocker-hardening commit.

### Finding
The planning bundle still described Phase 1A as simply "deployed live via Lovable."
That was incomplete after commit `159bdd6609332101e82d4544608b0ea644fc6507`, because the
live Lovable deployment does not include:
- the admin-route redirect fix (`/auth?returnTo=...`);
- the `ingest-session-note` rollback/orphan cleanup hardening.

If left uncorrected, Joshua could run the real-doc Phase 1A E2E against a live build that
does not contain the final blocker fixes.

### Updated
- `STATUS.md` now states Phase 1A is deployed but the live build is behind `main`, and
  explicitly adds the redeploy gate: frontend + `ingest-session-note`.
- `HANDOFF.md` now names the hardening commit, explains the redeploy requirement before
  the real-doc E2E, and keeps Phase 1B deploy as Joshua/Lovable-owned.
- `lovable-handoff-prompt.md` now reflects current deploy reality: redeploy Phase 1A
  hardening first, deploy Phase 1B only when Joshua requests it, do not apply migrations,
  do not add cron, and do not create student-facing output.
- `~/Downloads/PHASE-1B-LOVABLE-PROMPT.md` was updated to match the same deploy gate:
  frontend + `ingest-session-note` redeploy from current `main`, then
  `scan-session-notes` + `_shared/sessionIngestCore.ts`, with no migrations/schema/RLS
  changes, no cron, no function rewrites, and no student-facing output.

### Result
Current phase label is now precise: **between Phase 1A hardening redeploy/E2E and Phase
1B Lovable deploy**. No app code changed, no schema changed, no deploys performed.

---

## 2026-06-24 — Retired stale Phase 1A deploy prompt (Codex / GPT-5)

Continued the project-plan maintenance pass and inspected the remaining files in
`docs/agent/post-session-intelligence/` for stale operator instructions.

### Finding
`PHASE-1A-LOVABLE-DEPLOY.md` still contained the original Phase 1A Lovable prompt with
the migration SQL and initial `ingest-session-note` deploy instructions. That file is
now dangerous as an operator artifact because Phase 1A's migration has already been
applied and the next required action is a redeploy, not another migration/apply pass.

### Updated
- Replaced `PHASE-1A-LOVABLE-DEPLOY.md` with a historical-only guardrail that says not
  to paste it into Lovable now.
- Pointed it to the current prompt:
  `~/Downloads/PHASE-1B-LOVABLE-PROMPT.md`.
- Updated `README.md` so the current phase and file list reflect the redeploy/E2E gate.

### Result
The planning bundle no longer contains an obsolete paste-ready Phase 1A migration prompt.
Next operator action remains the updated Lovable prompt, then Joshua's real-doc E2E.

---

## 2026-06-24 — Updated historical implementation plan to current state (Codex / GPT-5)

Continued the plan-bundle audit for stale phase language.

### Finding
`claude-implementation-plan.md` and build-spec §10 still described Phase 1 as future work:
"planning only," "nothing implemented," "ready-to-build," and "migration authored, not
applied." That conflicted with the current state: Phase 1A was deployed once, the
canonical migration is already applied, Phase 1A hardening is on `main` but not live,
and Phase 1B is code complete but not deployed.

### Updated
- `claude-implementation-plan.md` now reads as a historical implementation plan plus
  remaining phase map:
  - Phase 1A built; hardening redeploy/E2E pending.
  - Phase 1B code complete; Lovable deploy pending.
  - Phase 2/3 still future.
- `build-spec.md` §10 now separates:
  - already built/applied,
  - still needs Joshua/Lovable,
  - still future direct-build work.
- `README.md` top status and file table now match that current state.

### Result
The planning bundle no longer tells a future agent that Phase 1 is unimplemented or that
the `session_ingestions` migration is merely authored. Current phase remains **Phase 1A
hardening redeploy/E2E + Phase 1B Lovable deploy pending**.

---

## 2026-06-24 — Added Phase 1A real-doc E2E runbook (Codex / GPT-5)

Continued the active project-plan ownership pass and inspected the docs for a single
operator checklist for Joshua's real Gemini Notes E2E.

### Finding
The E2E requirements existed across `STATUS.md`, `HANDOFF.md`, build-spec, and the
Lovable prompt, but there was no one checklist with expected evidence and a result
template. That made it too easy to run the real-doc test without capturing the exact
signals needed for the next auto-attach decision.

### Added
- `PHASE-1A-E2E-RUNBOOK.md`
  - preconditions after Lovable redeploy;
  - candidate Gemini Notes Doc/Gmail id already found;
  - happy-path steps;
  - idempotency check;
  - bad-input fail-closed check;
  - student-facing safety checks;
  - copy/paste result template;
  - explicit next build decision: confident auto-attach only if real email/Doc signals
    support email + name + calendar agreement.
- Linked the runbook from `README.md`, `STATUS.md`, and `HANDOFF.md`.

### Result
The next human gate is now executable and auditable: Lovable redeploy first, then Joshua
runs `PHASE-1A-E2E-RUNBOOK.md` and reports the result template.

---

## 2026-06-24 — Added Phase 1B scan/resolve E2E runbook (Codex / GPT-5)

Continued the active project-plan ownership pass and inspected Phase 1B test guidance.

### Finding
Phase 1B deploy and test expectations existed in `STATUS.md` and
`~/Downloads/PHASE-1B-LOVABLE-PROMPT.md`, but there was no repo-local result template for
the scan/resolution queue E2E. The missing template would make it harder to decide
whether parser/calendar evidence is strong enough for confident auto-attach.

### Added
- `PHASE-1B-E2E-RUNBOOK.md`
  - deploy preconditions;
  - expected conservative V1 behavior;
  - scan check;
  - resolve check;
  - re-scan idempotency check;
  - discard check;
  - student-facing safety checks;
  - copy/paste result template;
  - explicit next build decision for confident auto-attach.
- Linked the runbook from `README.md`, `STATUS.md`, and `HANDOFF.md`.

### Result
Both human-run Phase 1 gates now have dedicated runbooks:
`PHASE-1A-E2E-RUNBOOK.md` for manual real-doc ingest and
`PHASE-1B-E2E-RUNBOOK.md` for scan/resolve/discard after Lovable deploy.
