# Post-Session Intelligence Pipeline

**Status: SPEC ONLY. No implementation. No schema. No migrations. No production change.**

This folder holds the planning bundle for moving LSAT U toward a mostly hands-off
post-session intelligence pipeline: after a Google Meet tutoring session, the
Gemini Notes email → Google Doc → transcript is ingested, matched to the right
enrolled student, synthesized into a polished student-facing bundle, reviewed and
approved by Joshua, then published to the student's Classroom with a notification
and a chat message that reads as if Joshua wrote it. The student profile becomes a
richer dossier inside the Teacher Workspace.

## What this folder contains

| File | Purpose |
|------|---------|
| `README.md` | This overview. |
| `build-spec.md` | Full phased build spec: intent, flow, matching, review, publish, dossier, data model, Claude-vs-Lovable split, per-phase verification. |
| `claude-implementation-plan.md` | The 3-phase build sequence; what Claude builds directly, what waits for approval, what is out of scope now. |
| `codex-review-prompt.md` | Copy-paste prompt for Codex to red-team the spec against the real repo before any build. |
| `repo-inspection-summary.md` | The as-found map (edge functions, tables, hooks, Google connector reality, RLS/auth) so the spec is auditable. |
| `lovable-handoff-prompt.md` | The narrow Lovable asks only (connector scope/secret verification, later cron). Minimal, to preserve credits. |
| `SESSION_LOG.md` | Running log: inspected, decided, asked/answered, files touched, pending approvals. |
| `HANDOFF.md` | Cold-start handoff for a future Claude/Codex session. |
| `STATUS.md` | Phase checklist with state per phase. |

## The one correction the inspection forced

The source brief said "do not assume the integrations exist." After inspection:
**Google is already wired.** `gmail`, `gdrive`, `gcal-list-calendars`,
`gcal-sync-pull`, `gcal-event-write` edge functions proxy live through the Lovable
Connector Gateway, admin-gated. Half the data model also already exists and fits
(`ai_ta_drafts`, `student_sessions`, `student_context`, plus the publish rails
`homework_assignments` / `classroom_items` / `conversations` / `messages` /
`notifications`). So this is an **orchestration + dossier + publish-materialization**
build on existing rails, not a greenfield integration. See `repo-inspection-summary.md`.

## Decisions captured (this session)

1. **AI model** — Gateway now (Gemini), Claude later. Synthesis runs through the
   existing Lovable AI Gateway in V1, behind a single model-config indirection so it
   can swap to Claude later without touching the pipeline.
2. **Trigger** — Manual now, cron later. Ingest is a callable orchestrator; V1 wires
   a manual "Scan for new session notes" button; the scheduled poll comes after
   matching is trusted.
3. **Dossier scope** — Tab shell, real tabs only. Build the tabbed dossier shell but
   ship only data-backed tabs in V1 (Overview, Sessions/Transcripts, Homework, Notes).
   No placeholder tabs.
4. **Publish flow** — Approve, then publish separately. Each part is approved first;
   a distinct Publish action materializes approved parts into student-visible tables +
   notification + Joshua chat message.

## Next step

Send `build-spec.md` to Codex via `codex-review-prompt.md` for a red-team pass
**before** any implementation begins.
</content>
