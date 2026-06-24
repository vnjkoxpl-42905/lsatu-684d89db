# Status — Post-Session Intelligence Pipeline

States: `not started` · `planned` · `approved` · `in progress` · `complete` · `blocked`

Last updated: 2026-06-24 (Phase 1A built — code complete, migration/function not yet applied/deployed).

## Phase 0 — Spec & planning
**State: complete**
- [x] Inspect repo (Teacher Workspace, reusable systems, Supabase, Google connectors, AI)
- [x] Capture decisions (AI model, trigger, dossier scope, publish flow)
- [x] Write planning bundle + tracking files
- [x] Codex red-team review
- [x] Fold Codex corrections into the bundle (predicate, ID duality, RLS/created_by,
      calendar, ledger fields, transcript storage, publish copy, partial approval, dossier rule)
- [x] Resolve pre-build blockers: ID mapping (§3b, class_id IS auth.users.id) + transcript storage (§5a, bucket canonical)
- [ ] Joshua approves build of Phase 1A

## Phase 1A — Manual single ingest (admin-only, zero student impact)
**State: in progress — CODE COMPLETE, awaiting Joshua's OK to apply migration + deploy function**
- [x] §3b resolved: class_id IS auth.users.id → use safe `resolveStudentAuthId` helper
- [x] §5a decided: `student-context` bucket canonical/always; `content_text` only if < ~100 KB
- [x] Build `resolveStudentAuthId` helper — `src/lib/resolveStudentAuthId.ts` (UUID guard + roster membership + delivery gate, fail closed) + 11 passing unit tests
- [x] Author `session_ingestions` migration file — `supabase/migrations/20260624150000_create_session_ingestions.sql` (full field set; **NOT applied**)
- [x] `ingest-session-note` edge function — `supabase/functions/ingest-session-note/index.ts` (admin JWT; Doc id → authoritative `getUserById` resolve → export text → store → ledger; **NOT deployed**)
- [x] Transcript: bucket always; `content_text` only if ≤ 100 KB; `metadata.inline_text` flag (§5a)
- [x] Minimal admin form — `src/pages/teacher/TeacherSessionIngest.tsx` at `/teacher/session-ingest` (admin-only route); manual student pick via resolver
- [x] Idempotency (`.or()` check on unique gmail_message_id / gdrive_doc_id; unique constraints in migration)
- [x] Verified: typecheck clean, lint clean, 11 resolver tests pass, form renders with real roster
- [ ] **Approval gate (await Joshua):** apply migration `20260624150000` + deploy `ingest-session-note`
- [ ] End-to-end verify (needs deploy + real Gemini Notes Doc): orphan id refused; re-ingest no duplicate; nothing student-visible

## Phase 1B — Scan window + resolution queue + calendar corroboration
**State: planned** (not started)
- [ ] `scan-session-notes` (Gmail window → predicate §3a → ID resolve §3b → calendar §3d)
- [ ] Manual "Scan for new session notes" button
- [ ] Resolution-queue UI (resolved_by / resolved_at / discard_reason)
- [ ] Calendar corroboration = time+title window (attendee fetch only if approved §3d)
- [ ] Verify on real Gemini Notes emails; confident attach, ambiguous queue; no dup; no student impact

## Phase 2 — Synthesis + review + dossier
**State: planned** (not started)
- [ ] Synthesis → `ai_ta_drafts` `classroom_update_bundle` (Gemini via gateway, config indirection)
- [ ] Per-part review/approve UI on `useAITADrafts`; row `status`→`approved` only when all parts approved (§5)
- [ ] Dossier tab shell: Overview / Sessions+Transcripts / Homework / Notes
- [ ] Acceptance: every tab queries real data + honest empty state; no mock tabs (§8)
- [ ] Verify: bundle generates only when transcript supports parts; existing draft flow unregressed

## Phase 3 — Publish + suggestions + (later) cron
**State: planned** (not started)
- [ ] `publish-session-bundle` (separate from approve; partial publish allowed)
- [ ] Materialize → classroom_items / homework_assignments
- [ ] Homework parts reuse `notifyStudentOfClassroomItem`; note + Joshua chat use new session-bundle notifier (§6)
- [ ] Admin-only AI Suggestions surface
- [ ] Cron trigger (only after matching proven)
- [ ] Verify: student sees polished output, no source labels, no raw transcript

## Deferred / explicitly not yet
- [ ] Student-facing AI · "AI Joshua" autonomy
- [ ] Analytics / Insights dossier tabs (no real data backing in V1)
- [ ] Automatic consultation ingestion
</content>
