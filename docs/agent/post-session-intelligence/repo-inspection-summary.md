# Repo Inspection Summary — as-found state

Captured 2026-06-24 from three parallel Explore passes + direct reads of the core
migrations and `TeacherStudentDetail.tsx`. This is the ground truth the spec builds on.
Repo: `~/Documents/Claude/02_PROJECTS/LSATU`.

## Google integrations — REAL, wired via Lovable Connector Gateway

The source brief warned not to assume these exist. They do. All proxy through
`https://connector-gateway.lovable.dev/...`, admin-gated via `has_role(auth.uid(),'admin')`.

| Edge function | What it does |
|---------------|--------------|
| `supabase/functions/gmail/index.ts` | Admin Gmail proxy: list/read/send/modify; extracts parts + attachments. |
| `supabase/functions/gdrive/index.ts` | Admin Drive proxy: list/meta/thumbnail/download; exports GDoc → PDF/DOCX/HTML/text. |
| `supabase/functions/gcal-list-calendars/index.ts` | Lists calendars. |
| `supabase/functions/gcal-sync-pull/index.ts` | Incremental Calendar → `schedule_events` sync; supports cron (service role) or admin auth. **`schedule_events` stores no attendee emails** (only title/desc/location/start/end/html_link/status) — attendee corroboration needs a direct event fetch, see below. |
| `supabase/functions/gcal-event-write/index.ts` | Create/update events (verify completeness before relying on it). |

Frontend: Google Drive Picker at `src/lib/googleDrive.ts` (public client id/key,
scope `drive.file`), admin page `src/pages/admin/DriveFiles.tsx`, table `drive_files`.
Gmail admin inbox UI under `src/features/admin-inbox/gmail/`.

**Not present:** any direct Google Meet/Docs notes-extraction automation, and any
Gemini Notes → Doc import flow. That orchestration is what we build.

## AI infrastructure

- Everything runs through the **Lovable AI Gateway** (default `google/gemini-*`),
  via `teacher-operator-chat` and `ta-agent`. Auth: `LOVABLE_API_KEY`.
- **No Anthropic/Claude client and no OpenAI client wired anywhere.** The ModelPicker
  UI is selection-only. (Hence decision 1: Gateway/Gemini now, Claude later behind a
  config indirection.)

## Data model already in place (and fits the pipeline)

Core (read directly from migrations):

- **`ai_ta_drafts`** (`20260506000300_ai_ta_drafts.sql`): admin-only (no student SELECT
  policy). `draft_type` ∈ {`weekly_plan`,`next_assignment`,`session_recap`,
  `next_session_plan`,`classroom_update_bundle`,`message`}. `status` ∈ {`draft`,
  `approved`,`rejected`,`posted`}. Has `draft_json`, `draft_markdown`,
  `input_snapshot_json`, `approved_by`, `approved_at`, `posted_at`. **This is the
  review/approval queue already.**
- **`student_sessions`** (`20260424020000_create_student_sessions.sql`): `scheduled_at`,
  `status` ∈ {`scheduled`,`completed`,`cancelled`,`no_show`}, `duration_minutes`,
  `transcript_id` → `student_context(id)`, `notes`, `source`. Admin-only RLS.
- **`student_context`** (`20260424010000_create_student_context.sql`): `context_type` ∈
  {`file`,`screenshot`,`transcript`,`note`,`external_score`}, `content_text`,
  `file_path`, `source`, `metadata`. Bucket `student-context` (`...010001`).
  **Transcript storage already modeled.** **RLS nuance:** INSERT requires
  `has_role(auth.uid(),'admin')` **AND `created_by = auth.uid()`** — same for
  `student_sessions`. An edge function must run under the admin JWT (sets `created_by`
  to the actor) or, under service role, set `created_by` explicitly (see build-spec §9a).

Publish rails (all real, admin/service-role writable):

- `homework_assignments` (`20260421112209...`) — assign programmatically.
- `classroom_items` — student-visible items (via `useClassroomItems`).
- `conversations` / `conversation_participants` / `messages` / `message_attachments`
  (`20260416234013...`) — admin can author **as Joshua** via
  `getOrCreateAdminStudentConversation()` in `src/lib/adminConversation.ts`.
- `notifications` (`20260424000000_create_notifications.sql`) — types incl.
  `assignment`, `message`, `reminder`; admin/service-role INSERT, realtime to student.
- **`src/lib/classroomNotify.ts` — `notifyStudentOfClassroomItem`**: the real notifier.
  Sends inbox message + bell `notifications` row + Resend email, returns granular
  `NotifyResult` (never fakes success). **Copy is hardcoded "New assignment: …"** in all
  three channels (`assignmentType` default `"assignment"`). Correct for homework parts;
  must NOT be reused as-is for session notes / Joshua chat copy (build-spec §6). Has a
  reusable `findOrCreateThread` worth factoring out.
- `external_work_uploads` (`20260506000200...`) + bucket — existing upload/parse queue.

## Teacher Workspace (where this lands)

- Shell: `src/pages/teacher/TeacherShell.tsx` (gates non-admins). Desk:
  `src/pages/teacher/desk/TeacherDeskPreview.tsx` with Today/People/Inbox/Library.
- **Student detail is thin:** `src/pages/teacher/TeacherStudentDetail.tsx` = 4 stat
  cards + 4 action rows, keyed off legacy `profiles.class_id`. Loads
  `useStudentClassroomItems`, `useStudentExternalUploadsForStudent`,
  `useStudentWeeklyPlans`, `useAITADrafts`. **No tabbed dossier yet** — this is what
  the dossier shell extends.
- Roster component `HubStudentList` is reused across recaps/assignments/people.
- AI TA draft surface already exists: `useAITADrafts`, `useUpdateDraftStatus`,
  `OperatorChat`, `teacher-operator-chat`.
- Command surface `src/pages/teacher/desk/AssistantCommandLine.tsx` is honestly
  disabled (not faked).

## Reusable hooks (don't rebuild)

`useInbox`, `useNotifications`, `useStudentAssignments` / `useAdminAssignments`,
`useStudentContext`, `useStudentSessions`, `useExternalWorkUploads`, `useAITADrafts`,
`useClassroomItems`. Libs: `adminConversation.ts`, `assignmentEmail.ts`.

## RLS / auth pattern

`user_roles` table + `public.has_role(user_id, role)`. Admin tables use
`for all to authenticated using (has_role(auth.uid(),'admin'))`, **but INSERT on
`student_context` / `student_sessions` / `ai_ta_drafts` also requires
`created_by = auth.uid()`** — not just the role check. Edge functions: Bearer token →
`auth.getUser()` → admin check; service-role key for cron (bypasses RLS, so it must set
`created_by`/attribution explicitly). `session_ingestions` mirrors this and adds
`scan_requested_by` / `resolved_by` audit columns (build-spec §9).

## Roster / identity model (matters for matching)

- Roster = `useHubStudents` → `admin-manage-users` edge function → `HubStudentRow`,
  **keyed by `class_id`**, carrying `role`, `email`, `display_name`, and `has_*_access`
  flags. Real flags include `has_classroom_access`, `has_chat_access`, `has_ta_access`,
  `has_analytics_access`, `has_schedule_access`, etc. There is **no** generic "enrolled"
  flag — the matchable predicate is `role='student' AND has_classroom_access=true`
  (build-spec §3a).
- **ID duality — RESOLVED:** `student_context` / `student_sessions` /
  `ai_ta_drafts.student_id`, `notifications.user_id`, `conversation_participants.user_id`
  all key off **`auth.users(id)`**, while the roster keys off `class_id`. Inspection of
  `admin-manage-users/index.ts` shows **`profiles.class_id` IS the `auth.users.id`** —
  the same UUID stored as `text` (`class_id text PRIMARY KEY`; `auth.users.id uuid`):
  email is `emailMap.get(p.class_id)` keyed by `auth.users.id` (~L132/142), role is
  `roleMap.get(p.class_id)` keyed by `user_roles.user_id` (~L137/143). Existing app code
  already passes `class_id` into uuid FK columns via Postgres text→uuid cast. The
  pipeline still goes through a **safe resolver** (`resolveStudentAuthId`, build-spec §3b)
  that validates the UUID + confirms the `auth.users` row exists and **fails closed** on
  orphans (the `email==='unknown'` case `useHubStudents` already logs).

## Calendar reality (corrected)

`schedule_events` (`20260513111010...`) has **no attendee columns**. So attendee-email
corroboration is not available from the synced table; V1 corroborates by time+title
window, and attendee-email matching (if required) needs a direct Calendar event fetch or
an attendees-storage extension (build-spec §3d, `lovable-handoff-prompt.md`).

## Docs landscape

`docs/agent/` holds agent/build docs (`README.md`, `prompts/`, `handoffs/`,
`profiles/`). `docs/adr/` holds `0001-teacher-workspace-ia.md` and
`0003-teacher-desk-embeds-ai-assistant.md` (this initiative extends both). No prior
`docs/agent/post-session-intelligence/` existed before this pass.

## Gap = what we actually build

1. `session_ingestions` ledger (idempotency + resolution-queue state).
2. `scan-session-notes` orchestrator (detect→fetch→verify→match→store→synthesize).
3. `publish-session-bundle` materializer (approve→publish, separate action).
4. Dossier tab shell + Sessions/Transcripts tab.
5. Review-queue + resolution-queue UI (on top of `ai_ta_drafts`).
6. Manual Scan button now; cron later.
