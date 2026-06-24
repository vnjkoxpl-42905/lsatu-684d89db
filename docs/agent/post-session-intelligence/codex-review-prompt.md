# Codex Review Prompt — Post-Session Intelligence Pipeline

Copy-paste the block below into Codex (running in the LSAT U repo) to red-team the
spec before any implementation.

---

You are reviewing a SPEC, not writing code. Do not implement anything. Do not modify
files except, if asked, to leave review notes.

Context: LSAT U is planning a post-session intelligence pipeline. After a Google Meet
tutoring session, Gemini Notes (Gmail → Google Doc → transcript) are ingested, matched
to an enrolled student by email AND name, synthesized into a polished student-facing
bundle, reviewed and approved per-part by the admin (Joshua), then published to the
student's Classroom with a notification and a chat message authored as Joshua. The
student profile becomes a tabbed dossier.

Read these planning files in `docs/agent/post-session-intelligence/`:
- `build-spec.md`
- `claude-implementation-plan.md`
- `repo-inspection-summary.md`

Then verify against the REAL repo and report findings. Specifically check:

1. **Repo accuracy.** Does the inspection summary match reality? Confirm the edge
   functions (`gmail`, `gdrive`, `gcal-list-calendars`, `gcal-sync-pull`,
   `gcal-event-write`) exist and proxy through the Lovable Connector Gateway. Confirm
   the tables and columns cited: `ai_ta_drafts` (draft_type/status enums),
   `student_sessions` (`transcript_id` FK), `student_context` (`context_type`
   includes `transcript`), `homework_assignments`, `classroom_items`,
   `conversations`/`messages`, `notifications`. Flag anything the spec got wrong or stale.

2. **Connector reality.** Do the Gmail/Drive scopes actually permit reading Gemini
   Notes emails and exporting the linked Doc body? Is `gcal-event-write` truly wired or
   a stub? If the spec overstates what the connectors can do, say so plainly.

3. **Matching safety.** Is matching by email AND name with a resolution-queue fallback
   sufficient to prevent cross-student leakage? Find any path where a transcript could
   attach to the wrong student or where a consultation could slip into the pipeline.

4. **Data model safety.** Is the proposed `session_ingestions` ledger correct and
   admin-only? Does it cover idempotency (re-scan dedup by Gmail message id + Doc id)?
   Are RLS policies consistent with the existing `has_role(auth.uid(),'admin')` pattern?
   Any column missing for the resolution queue or publish tracking?

5. **Phase sizing.** Are the three phases too broad? Should ingest+resolution be split
   from synthesis? Is anything in Phase 1 secretly student-visible (it must not be)?

6. **Teacher Workspace / dossier scope.** Is converting `TeacherStudentDetail.tsx` to a
   tab shell the right move, or does it collide with the existing desk
   (`TeacherDeskPreview.tsx`) IA in `docs/adr/0001` and `0003`? Is "real tabs only"
   (Overview/Sessions/Homework/Notes) the correct V1 cut?

7. **Reuse vs duplication.** Does the plan correctly reuse `ai_ta_drafts`,
   `useAITADrafts`, `adminConversation.ts`, `notifications`, `homework_assignments`,
   instead of duplicating them? Flag any accidental new system that should reuse an
   existing one.

8. **Approval gates.** Confirm the spec never applies a migration, deploys a function,
   or publishes student content without an explicit human approval step.

Output: a prioritized list of (a) factual corrections to the spec, (b) safety risks,
(c) scope/phasing concerns, (d) reuse opportunities missed. Be specific with file paths
and table/column names. Do not implement.
