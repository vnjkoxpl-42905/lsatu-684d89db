# Claude Implementation Plan — Post-Session Intelligence Pipeline

Status: planning only. This describes the FUTURE build sequence. Nothing here is
implemented. Do not start Phase 1 until Joshua approves the spec (ideally after the
Codex review in `codex-review-prompt.md`).

## Guiding constraints

- Approval-first; never auto-publish; never expose raw transcripts or source labels.
- Build on existing rails (see `repo-inspection-summary.md`); do not duplicate
  classroom/homework/messaging/notification/analytics systems.
- Migrations are authored as files but **not applied** without Joshua's explicit OK.
- Edge functions are written but **not deployed** without Joshua's explicit OK.

---

## Phase 1 — Ingest + resolution (admin-only, zero student impact)

Split into 1A and 1B per the Codex red-team. Both run under the **admin's JWT** (manual
trigger), so the existing `created_by = auth.uid()` RLS on `student_context` /
`student_sessions` is satisfied directly (no service-role path yet — see build-spec §9a).

### Phase 1A — Manual single ingest (the ready-to-build slice)

**Goal:** from a **known Gmail message id and/or Google Doc id**, fetch the Doc, store
the transcript, and write a ledger row. Zero synthesis, zero matching automation, zero
student impact. **No remaining blockers** — the two prior open decisions are resolved
(ID mapping §3b, transcript storage §5a).

- **Build the safe resolver** `resolveStudentAuthId(class_id)` (build-spec §3b): validate
  UUID, confirm the `auth.users` row exists, return the uuid; orphan/invalid → null →
  fail closed (no write). Shared helper (`src/lib/resolveStudentAuthId.ts`) + the same
  guard inside the edge function. Used by every phase.
- Author `session_ingestions` migration **file** (full field set + unique
  `gmail_message_id` / `gdrive_doc_id`, attribution columns, admin-only RLS) — see
  build-spec §9b. **Not applied** without Joshua's OK.
- Build `ingest-session-note` edge function (admin JWT): given a Gmail/Doc id →
  `gdrive` export the Doc → store transcript per build-spec §5a (**bucket always;
  `content_text` only if < ~100 KB**) as `student_context` with
  `created_by = auth.uid()` → create/link a `student_sessions` row → upsert the
  `session_ingestions` ledger row (dedup on the unique ids; `scan_requested_by` /
  `created_by` set).
- Admin UI: a minimal "Ingest from Doc id" form (paste a Gmail/Doc id, see the stored
  transcript + ledger row). No roster automation yet.
- Student match in 1A is **manual**: the admin picks the student in the form; the
  function calls `resolveStudentAuthId` before writing; an unresolved id is refused
  truthfully (not a silent failure).

**Verify:** ingest a real Doc id → canonical transcript object in the `student-context`
bucket; `content_text` populated only when < ~100 KB; `student_sessions` linked; ledger
row written; pick an orphan/invalid id → write refused, routed to resolution, nothing
written; re-ingest the same id → no duplicate (unique constraint / upsert); nothing
visible to any student.

### Phase 1B — Scan window + resolution queue + calendar corroboration

**Goal:** automate detection and matching across a time window, with a human resolution
queue for anything uncertain.

- Build `scan-session-notes` (admin JWT): Gmail search window → parse Doc links →
  for each, run the matchable-student predicate (build-spec §3a) + ID resolution (§3b)
  + calendar corroboration (§3d, **time+title window** unless attendee fetch is approved)
  → confident matches auto-attach and ingest (reuse 1A's ingest path); uncertain →
  `needs_match` ledger rows.
- Manual **Scan for new session notes** button.
- **Resolution queue** UI: list `needs_match` rows, pick student or discard
  (`resolved_by`/`resolved_at`/`discard_reason`).
- Idempotency via the ledger unique ids.

**Verify:** run Scan against real Gemini Notes emails; confident matches attach,
ambiguous ones queue; calendar window raises confidence but never auto-confirms identity
on its own; re-scan produces no duplicates; no student-visible change.

**Safe to build directly:** all UI, hooks, the migration file, the edge function code.
**Waits for approval:** applying the migration, deploying the functions, §3d attendee
fetch if chosen.

---

## Phase 2 — Synthesis + review + dossier

**Goal:** turn a stored session into a reviewable, per-part-approvable bundle, and
give Joshua a real place to see student history.

- Synthesis step: feed transcript + student context to the Lovable AI Gateway (Gemini),
  behind a single model-config indirection so synthesis can later swap to Claude.
  Write an `ai_ta_drafts` `classroom_update_bundle`.
- Per-part review/approve UI on top of `useAITADrafts` / `useUpdateDraftStatus`.
  Per-part flags live in `draft_json`; row `status` stays `draft` until **every**
  included part is approved, then rolls up to `approved` (build-spec §5). Never mark the
  row `approved` on a single-part approval.
- Dossier tab shell on `TeacherStudentDetail.tsx`: Overview, Sessions/Transcripts,
  Homework, Notes (real tabs only).

**Safe to build directly:** synthesis function, review UI, dossier shell, hooks.
**Waits for approval:** deploying the function, any model/secret config.
**Verify:** generate a bundle from a real transcript; edit and approve parts; confirm
parts only generate when the transcript supports them; dossier tabs show real data;
existing AI TA draft flow unregressed.

---

## Phase 3 — Publish + suggestions + (later) cron

**Goal:** ship approved content to students cleanly, and open the admin-only
suggestion surface.

- `publish-session-bundle` step (separate from approve): materialize approved parts →
  `classroom_items` / `homework_assignments` / assignment.
  **Homework/assignment parts** reuse `notifyStudentOfClassroomItem`
  (`src/lib/classroomNotify.ts`) **as-is** ("New assignment" copy is correct for them).
  **Note + Joshua chat message** use a **new session-bundle notifier** (factor out
  `findOrCreateThread`, reuse the `notifications` + email pattern with session-note copy
  and a note-appropriate `notifications.type`); the chat body is the approved
  `draft_json.message` part, not helper-generated (build-spec §6). Sets `posted`,
  stamps `posted_at`; per-part `posted` tracked in `draft_json` for idempotent
  re-publish. Partial publish allowed.
- Admin-only AI Suggestions surface in the dossier/desk.
- **Cron trigger** for automatic scanning — only after matching is proven in Phases 1–2.

**Safe to build directly:** publish step, suggestions UI.
**Waits for approval:** deploying functions, enabling cron, secret/scope changes.
**Verify:** approve→publish pushes only approved parts; student sees a polished note,
homework, notification, and a natural message from Joshua, with no source labels and
no raw transcript; held parts stay invisible; partial publish works.

---

## Explicitly NOT yet

- Student-facing AI of any kind.
- "AI Joshua" autonomy.
- Analytics / Insights dossier tabs (no real data backing them in V1).
- Automatic consultation ingestion.
- The cron trigger before matching is trusted.
