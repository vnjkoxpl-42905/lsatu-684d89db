# Build Spec — Post-Session Intelligence Pipeline

Status: implementation spec. Phase 1A has since been deployed via Lovable, and Phase
1B is code complete on `main` but not deployed. This document remains the source for
the product contract and later phases; use `STATUS.md` for live implementation state.
Read `repo-inspection-summary.md` first for the as-found state this spec builds on.

---

## 1. Product intent & non-goals

**Intent.** A mostly hands-off, approval-first pipeline. After a Google Meet
tutoring session with an enrolled student, LSAT U ingests the Gemini Notes, builds
a polished student-facing learning bundle, lets Joshua review and approve each part,
then publishes to the student's Classroom with a notification and a chat message
that reads as if Joshua wrote it. The student profile becomes a richer dossier in
the Teacher Workspace.

**This is not** a transcript summarizer, a generic AI summary feature, or a PDF dump.

**Hard rules (non-negotiable).**
- Approval-first. Nothing is student-visible until Joshua approves it.
- Never auto-publish.
- Never expose the raw transcript to students.
- Never expose source labels to students: no "AI-generated," "Gemini Notes,"
  "Google Doc," "transcript-derived," "generated vs adapted." Admin side keeps full
  source metadata for trust/debugging.
- Only enrolled/current tutoring students enter the pipeline. Consultation notes do
  not auto-become intelligence records unless that person later enrolls and the
  record is intentionally connected.
- Student matching requires **email AND name**, never name alone. Uncertain → review
  queue; publish/assign/message nothing until resolved.

---

## 2. End-to-end flow (V1, manual trigger)

Joshua clicks **Scan for new session notes** in the Teacher Workspace. The
orchestrator runs:

1. **Detect** — `gmail` edge function searches for Gemini Notes emails since the last
   scan. Subject pattern looks like `Notes: "Lydia" Jun 19, 2026`. The email carries
   a Google Doc link.
2. **Fetch** — parse the Doc link; `gdrive` edge function exports the Doc (it is the
   richer source: summary, next steps, details, invited student email, full
   timestamped transcript).
3. **Verify** — corroborate against the Google Calendar event (time, attendees) using
   the already-synced `schedule_events` / `gcal-list-calendars`.
4. **Match** — resolve to an enrolled student by **email AND name** (§3).
5. **Store source** — store the raw transcript (§5a) and create/link a
   `student_sessions` row (`scheduled_at`, `duration_minutes`, `status`,
   `transcript_id`, `source='gemini_notes'`, `created_by`).
6. **Synthesize** — AI builds the bundle (§4) and writes it to `ai_ta_drafts` as a
   `classroom_update_bundle` (admin-only). **Phase 2 — not in Phase 1.**
7. **Queue** — the item appears in the **review queue**. Nothing is student-visible.

Every step writes to a `session_ingestions` ledger row (§9) for idempotency and
resolution-queue state.

> **Phase boundary:** Steps 1–5 are Phase 1 (1A = manual single ingest from a known
> Gmail/Doc id; 1B = scan window + resolution queue + calendar corroboration). Step 6
> (synthesis) is Phase 2. Publish is Phase 3. See `claude-implementation-plan.md`.

---

## 3. Matching & resolution

### 3a. The "matchable student" predicate (exact, from repo reality)

There is no generic "enrolled" flag. The roster comes from the `admin-manage-users`
edge function via `useHubStudents` (`HubStudentRow`), keyed by **`class_id`**, carrying
`role`, `email`, `display_name`, and granular `has_*_access` flags. The matchable set is:

> A `HubStudentRow` where **`role = 'student'`** (i.e. not `'admin'`) **AND
> `has_classroom_access = true`** (this is the flag that gates whether the student can
> receive `classroom_items` at all, so it is the correct delivery gate). The publish
> step additionally requires **`has_chat_access = true`** for the inbox/chat message; if
> a matched student lacks it, the note/homework can still publish but the chat message
> is skipped and reported truthfully (not faked).

Anyone not in this set (admins, consultations, access-revoked profiles) is **not**
matchable and falls to the resolution queue.

### 3b. ID resolution (class_id → auth.users.id) — RESOLVED

The roster is keyed by `class_id`, but every storage/delivery table the pipeline writes
to keys off **`auth.users(id)`**: `student_context.student_id`,
`student_sessions.student_id`, `ai_ta_drafts.student_id`, `notifications.user_id`,
`conversation_participants.user_id`.

**Resolved by repo inspection (not assumed):** `profiles.class_id` **is** the
`auth.users.id` — the same UUID, stored as `text` (`profiles.class_id text PRIMARY KEY`;
`auth.users.id uuid`). Evidence in `supabase/functions/admin-manage-users/index.ts`:
email is resolved as `emailMap.get(p.class_id)` where `emailMap` is keyed by
`auth.users.id` (lines ~132/142), and role as `roleMap.get(p.class_id)` keyed by
`user_roles.user_id` (~137/143). Existing app code already passes `class_id` directly
into the uuid FK columns (e.g. `ai_ta_drafts.student_id` via `useAITADrafts`), relying on
Postgres `text`→`uuid` casting.

**The safe resolver** (build once, reuse everywhere — not a raw cast):

```
resolveStudentAuthId(class_id: string): uuid | null
  1. Trim. Reject if not a well-formed UUID (regex/`::uuid` guard) → return null.
  2. Confirm a matching auth.users row exists (admin client
     `admin.auth.admin.getUserById(class_id)` OR a profiles+auth join). 
  3. Return the uuid on success.
  4. Orphan/invalid (the `email === 'unknown'` case useHubStudents already logs) →
     return null. Caller must NOT write; route to the resolution queue with
     match_reason='unresolved_auth_id'.
```

**Fail closed:** no `student_context` / `student_sessions` / `ai_ta_drafts` write happens
against an unresolved or orphan id. This resolver is a Phase 1A deliverable (a small
shared helper, e.g. `src/lib/resolveStudentAuthId.ts` + the same guard in the edge
function), used by every phase.

### 3c. Match decision

- **Confident match**: the Doc's invited-student email matches a matchable student's
  `email` (case-insensitive) **AND** the name agrees (normalized compare of the Gemini
  subject name vs `display_name`) **AND** calendar corroborates (§3d) → auto-attach,
  `match_confidence='high'`, record `match_reason`.
- **Uncertain / missing**: any disagreement, missing email, name-only signal, or no
  calendar corroboration → `status='needs_match'`, into the **resolution queue**. Admin
  picks the correct student or discards (`discard_reason`). No transcript is attached to
  a student until resolved.
- **Idempotency**: dedup by unique `gmail_message_id` and unique `gdrive_doc_id` so
  re-scans never double-ingest. The `session_ingestions` ledger is the dedup key (§9).

### 3d. Calendar corroboration (claim corrected)

`gcal-sync-pull` writes `schedule_events`, but that table stores only
`title/description/location/start_at/end_at/html_link/status` — **no attendee emails**.
So attendee-email corroboration is **not** available from the synced table. Two options,
decided per phase:

- **V1 (Phase 1B):** corroborate by **time window + title only** — find a
  `schedule_events` row whose `start_at` is near the session time and whose title
  contains the student name. This is a soft signal that *raises* confidence but cannot
  *confirm* identity by itself; identity still rests on email+name from the Doc.
- **If attendee-email corroboration is required:** add a **direct Google Calendar event
  fetch** at scan time (new `gcal-event-get` call returning `attendees[].email`), or
  extend `gcal-sync-pull` + `schedule_events` to persist attendees. This is an explicit
  added scope item, flagged in `lovable-handoff-prompt.md`, **not** assumed present.

---

## 4. Synthesis output (the bundle)

One `ai_ta_drafts` row of `draft_type='classroom_update_bundle'`. `draft_json` holds
the parts; each part is independently editable and approvable:

- Polished session note — clean, Notion-style sections + checklists, concise.
- Homework checklist.
- Quiz / mini-drill — **prefer existing LSAT U material** via question-bank refs; may
  generate low-stakes recall or concept checks when the transcript supports it.
  Source metadata (existing-vs-generated) preserved internally, never shown to student.
- Mistake-pattern checklist.
- Key-concept cards.
- Weakness tags.
- Drill recommendations.
- Next-session agenda.
- Private tutor/admin note (admin-only, never published).

All student-facing copy is routed through the teaching-voice guidance
(`~/Documents/Obsidian Vault/wiki/concepts/teaching-voice.md`). V1 generates a part
**only when the transcript clearly supports it** — no forced sections.

---

## 5a. Transcript storage (decided)

**The `student-context` bucket is the canonical raw-transcript store. Always.** The
exported Doc (full transcript as a text file, plus optionally the PDF/HTML export) is
written to the bucket and referenced by `student_context.file_path`. This is the source
of record and holds the complete transcript regardless of size.

**`content_text` is a convenience copy, only when small.** Store the transcript text in
`student_context.content_text` **only if it is under ~100 KB**, so the synthesis step and
TA prompt builders can read it inline without a fetch.

- **≤ ~100 KB:** write the full text to `content_text` **and** the canonical file to the
  bucket. `metadata.inline_text=true`.
- **> ~100 KB:** bucket only. Leave `content_text` null (or a short header excerpt),
  set `metadata.inline_text=false` and `metadata.full_artifact_path` = the bucket object.
  Synthesis reads the bucket object (chunked) in this case.

Never rely on `content_text` as the source of truth — the bucket object is canonical.
The `student_sessions.transcript_id` FK points at this `student_context` row.

## 5. Admin review workflow

Reuse `ai_ta_drafts` + `useAITADrafts` / `useUpdateDraftStatus`. Per-part edit and
approve.

**Status rollup (corrected — `ai_ta_drafts.status` only has
`draft/approved/rejected/posted`):** per-part approval lives in `draft_json` (each part
carries its own `{ approved: boolean, edited_at, ... }`). The **row's `status` stays
`draft`** while any part is unapproved. The row only moves to `approved` when **every
included part is approved** (or explicitly excluded). Never mark the whole row
`approved` because one part was approved — the per-part flags in `draft_json` are the
source of truth; `status` is a coarse rollup used only by existing list/filter UI.
`rejected` applies to the whole row (discard the bundle). `posted` is set by the publish
step (§6) once at least one approved part has been materialized. Approve ≠ publish.

The seven separately approvable items match the brief: student-facing note, homework
checklist, quiz/mini-drill, weakness tags, drill recommendations, next-session agenda,
private tutor/admin note.

---

## 6. Publish (separate action — decision 4)

A `publish-session-bundle` step materializes **only approved parts**:

- Note → `classroom_items` (and/or recap via `RecapComposer` path).
- Homework → `homework_assignments`.
- Quiz / drill → assignment (homework or guided-drill assignment).

**Notification + chat copy (corrected).** The existing helper
`notifyStudentOfClassroomItem` (`src/lib/classroomNotify.ts`) hardcodes
`"New assignment: …"` copy across the inbox body, the bell `notifications.title`, and
the `send-assignment-email` body (`assignmentType` default `"assignment"`). It is
therefore correct **only for the homework/assignment parts**, and we reuse it **as-is
for those**. For the **session note** and the **polished Joshua chat message** we do
**not** route through it (it would mislabel a note as an assignment). Instead:

- **Phase 3 builds a session-bundle notifier** that reuses the thread-find/create logic
  (factor `findOrCreateThread` out of `classroomNotify.ts`, or call
  `adminConversation.ts`) and the `notifications` + email insert pattern, but with
  **session-note copy** and `notifications.type` appropriate to a note (e.g. add/use a
  `recap`/`note` type rather than `assignment`). The polished Joshua chat message body
  comes from the approved `draft_json.message` part — its copy is authored/edited in
  review, **not** generated by the helper. Until that notifier + copy path is built, the
  spec does **not** promise polished chat copy via the existing helper.
- Partial-success is surfaced truthfully (reuse the `NotifyResult` pattern), never faked.

Sets the draft `status='posted'`, stamps `posted_at`, once at least one approved part is
materialized. Idempotent (re-publish skips already-materialized parts; track per-part
`posted` in `draft_json`). Partial publish allowed (publish the note now, hold the
homework).

---

## 7. AI Suggestions (admin-only in V1)

Surfaced in the dossier / desk only. May suggest next steps, homework/drills, note
edits, quiz items, next-session agenda, and history-based insights. Nothing publishes,
assigns, or messages the student without Joshua's approval. Long-term path: admin-first
"AI Joshua." Student-facing AI comes only after quality and safety are proven.

---

## 8. Student dossier (tab shell, real tabs only — decision 3)

Convert `src/pages/teacher/TeacherStudentDetail.tsx` into a tabbed shell. Reuse
`HubStudentList` for the roster.

**V1 live tabs (data-backed only):**
- **Overview** — current stat cards + most recent session.
- **Sessions / Transcripts** — required. `student_sessions` list + linked transcript
  (admin-only). This is the home of the pipeline's per-student output.
- **Homework** — `useStudentClassroomItems` / assignments.
- **Notes** — `student_context` notes + recaps.

**Designed but deferred** (added only when backed by real data, to avoid placeholder
UI): Analytics/Performance, Schedule, AI Suggestions, Insights. Tab structure is kept
flexible; Sessions/Transcripts is the only mandated tab.

**Acceptance rule (real-tabs-only):** every V1 tab MUST issue a real query against a
real table and render an **honest empty state** when there is no data (e.g. "No
sessions logged yet"), never a placeholder or mock. A tab may ship in V1 **only if** it
has a real data source wired. No Analytics, Schedule, AI Suggestions, or Insights tab
appears in V1 until it queries real data. A PR adding a tab that returns hardcoded/mock
content fails review.

---

## 9. Data model proposal

**Reuse as-is:** `student_sessions`, `student_context`, `ai_ta_drafts`,
`homework_assignments`, `classroom_items`, `conversations` / `messages`,
`notifications`.

### 9a. RLS / service-role / audit story (corrected — no hand-waving)

The existing admin-only tables are **not** simply `using(has_role(...,'admin'))`.
`student_context` and `student_sessions` require, on INSERT, **both**
`has_role(auth.uid(),'admin')` **AND `created_by = auth.uid()`**. That has a concrete
consequence for an edge function:

- **If the orchestrator runs with the admin's JWT** (manual Scan, Phase 1A/1B), then
  `auth.uid()` is Joshua, and the function sets `created_by = auth.uid()` — the existing
  RLS is satisfied directly. **This is the V1 path.**
- **If the orchestrator runs with the service role** (future cron, Phase 3), RLS is
  bypassed, so the function MUST set `created_by` explicitly to the **admin actor's
  user id** (resolved from the cron config / a designated admin), and MUST stamp the
  ledger's `scan_requested_by` so every row is attributable. Service-role writes that
  leave `created_by`/`scan_requested_by` null are a review failure.

`ai_ta_drafts` insert requires `created_by` too (set the same way).
`session_ingestions` carries its own `created_by` / `scan_requested_by`, `resolved_by`,
`resolved_at` so the whole chain (who scanned, who resolved a match, who discarded) is
audited. Cron compatibility: the `session_ingestions` policy allows admin via
`has_role`, and service-role bypasses RLS but is still required to populate the
attribution columns.

### 9b. `session_ingestions` ledger (net-new — proposed, NOT created this pass)

Minimal but with the required safety fields:

| Column | Type / note |
|--------|-------------|
| `id` | uuid PK |
| `gmail_message_id` | text **UNIQUE** (dedup) |
| `gdrive_doc_id` | text **UNIQUE** (dedup) |
| `calendar_event_id` | text **nullable** (corroboration ref) |
| `status` | text enum: `ingested` / `needs_match` / `matched` / `stored` / `drafted` / `published` / `discarded` / `error` |
| `matched_student_id` | uuid **nullable** → `auth.users(id)` (set on resolve) |
| `match_confidence` | text/enum: `high` / `medium` / `low` / `none` |
| `match_reason` | text (why this match / why uncertain) |
| `transcript_context_id` | uuid **nullable** → `student_context(id)` |
| `draft_id` | uuid **nullable** → `ai_ta_drafts(id)` |
| `raw_subject` | text |
| `raw_meta` | jsonb (sender, doc title, parsed name/email, calendar window hit) |
| `error_message` | text **nullable** |
| `attempt_count` | int default 0 |
| `last_attempt_at` | timestamptz **nullable** |
| `scan_requested_by` | uuid → `auth.users(id)` (who triggered the scan) |
| `created_by` | uuid → `auth.users(id)` (actor for the row) |
| `resolved_by` | uuid **nullable** → `auth.users(id)` |
| `resolved_at` | timestamptz **nullable** |
| `discard_reason` | text **nullable** |
| `created_at` / `updated_at` | timestamptz |

RLS: admin-only via `has_role(auth.uid(),'admin')` for `all`; INSERT additionally
checks `created_by = auth.uid()` under JWT. Service role bypasses RLS for cron but must
populate `created_by` + `scan_requested_by` (§9a). Unique constraints on
`gmail_message_id` and `gdrive_doc_id` are the idempotency guard. This table is the
dedup key **and** the backing store for the resolution queue.

---

## 10. Claude-direct vs Lovable/Supabase-dependent

**Already built / applied:**
- `session_ingestions` migration was applied via Lovable as
  `supabase/migrations/20260624204004_2f2c47bc-32b9-4cf0-bb39-43b29e9fd7c4.sql`.
- Phase 1A `ingest-session-note` and `/teacher/session-ingest` were built and initially
  deployed.
- Phase 1B `scan-session-notes`, shared ingest core, hook, scan button, and resolution
  queue UI are code complete on `main`.

**Still needs Joshua/Lovable:**
- Redeploy the frontend and `ingest-session-note` from current `main` so the Phase 1A
  hardening commit is live before real-doc E2E.
- Deploy `scan-session-notes` and `_shared/sessionIngestCore.ts` when Joshua chooses to
  start Phase 1B.
- Any model/secret configuration change.

**Still future direct-build work:**
- Phase 2 synthesis + review + dossier tabs.
- Phase 3 `publish-session-bundle`, AI suggestions, and later cron.

**Lovable/Supabase-dependent (narrow):**
- Confirm Gmail/Drive/Calendar connector **scopes** cover reading Gemini Notes emails
  and exporting the linked Doc (likely already true).
- The later **cron** trigger for automatic scanning.
- Secret presence: `LOVABLE_API_KEY`, Google connector keys.

See `lovable-handoff-prompt.md` and `~/Downloads/PHASE-1B-LOVABLE-PROMPT.md` for the
current deploy ask.

---

## 11. Verification per phase

Each phase ends with a manual checklist Joshua runs in the deployed app (needs his
admin login + real data), and every checklist includes explicit error-path tests:

- Email with no Doc link.
- Ambiguous / name-only match → must land in resolution queue, not auto-attach.
- Missing or non-corroborating calendar event.
- Re-scan of an already-ingested email → no duplicate (idempotency).
- Partial approve → publish only approved parts; held parts stay invisible.
- Regression: existing AI TA draft flow (`useAITADrafts`) and the current student
  detail page still work.

---

## 12. Open decisions

**Resolved (no longer blocking Phase 1A):**
- ~~**`class_id` vs `auth.users.id`**~~ → RESOLVED by inspection: `class_id` *is* the auth
  user id (UUID as text). Use the safe `resolveStudentAuthId` helper; fail closed on
  orphans. (§3b)
- ~~**Transcript size bound**~~ → DECIDED: bucket is canonical/always; `content_text` only
  when < ~100 KB. (§5a)

**Still open (NOT blocking Phase 1A — deferred to their phases):**
1. **Calendar corroboration depth** (§3d, Phase 1B): time+title window enough, or is
   attendee-email corroboration required (needs a direct Calendar event fetch / attendee
   storage — added scope)?
2. **Manual-JWT vs service-role timing** (§9a, Phase 3): V1 uses manual JWT (existing
   `created_by = auth.uid()` RLS just works). Only relevant when cron is wanted, which
   forces the service-role attribution path.
3. **`notifications.type` for session notes** (§6, Phase 3): add a `recap`/`note` type or
   reuse an existing one for the session-bundle notifier.
