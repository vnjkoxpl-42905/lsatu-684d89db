# Handoff — Post-Session Intelligence Pipeline

For a future Claude/Codex session or a fresh chat. Read this first, then `STATUS.md`,
then `build-spec.md`.

## Current goal

Plan (and later build) a mostly hands-off, approval-first post-session intelligence
pipeline for LSAT U: Google Meet session → Gemini Notes (Gmail → Google Doc →
transcript) → match to enrolled student (email AND name) → AI-synthesized
student-facing bundle → Joshua reviews/approves per part → publish to Classroom +
notification + chat message authored as Joshua. The student profile becomes a tabbed
dossier in the Teacher Workspace.

## Where things live

- **Repo:** `~/Documents/Claude/02_PROJECTS/LSATU`
- **Planning folder:** `docs/agent/post-session-intelligence/`
- **Product/decision layer (Obsidian):** `~/Documents/Obsidian Vault/` — product
  context `wiki/synthesis/intro-to-lr-product.md`, teaching voice
  `wiki/concepts/teaching-voice.md`.
- **Source brief:** `~/Downloads/lsatu_post_session_intelligence_claude_code_prompt (1).md`

## Current status

**Spec complete, revised after Codex red-team, and both pre-build blockers resolved.
Zero implementation.** No app code, no schema, no migrations, no production change.
**Phase 1 is split into 1A (buildable slice) and 1B.** 1A now has **no remaining
blockers** — ID mapping and transcript storage are decided. Awaiting Joshua's go to
build Phase 1A.

## Blockers resolved this pass

- **Student ID mapping (§3b):** `profiles.class_id` IS the `auth.users.id` (UUID as
  text) — confirmed in `admin-manage-users/index.ts`. Build a safe `resolveStudentAuthId`
  helper (validate UUID + confirm auth.users row + fail closed on orphans), don't raw-cast.
- **Raw transcript storage (§5a):** the `student-context` bucket is canonical/always;
  `content_text` is populated only when the transcript is < ~100 KB.

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

Build **Phase 1A** (manual single ingest from a known Gmail/Doc id → safe resolver →
store transcript → ledger; zero synthesis, zero student impact). No open decisions block
it.

## Remaining open decisions (deferred — do NOT block Phase 1A)

- Calendar corroboration depth (§3d, Phase 1B).
- Service-role / cron timing (§9a, Phase 3).
- `notifications.type` for session notes (§6, Phase 3).

## Blockers

- **None gating Phase 1A.** Both pre-build blockers resolved (see above).
- Soft prerequisite: confirm Gmail/Drive connector scopes can read Gemini Notes + export
  the Doc body (see `lovable-handoff-prompt.md`) — likely already true.

## Do NOT do yet

- Do not write app code, create UI, or add hooks.
- Do not apply any migration or create `session_ingestions` in the DB.
- Do not deploy or modify edge functions.
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
</content>
