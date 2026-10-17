# Handoff — Activity Centre build (Negation Station reference)

**Date:** 2026-06-14
**Repo:** `~/Documents/Claude/02_PROJECTS/LSATU` (React 18 + Vite + TS + Tailwind + shadcn, Supabase, Lovable-hosted; main is canonical, fetch before push — Lovable lands parallel commits)

## What this is
Build a new, standalone, assignment-gated **Activity Centre** module — coach-led bespoke skill exercises ("Activities"), separate from the question-bank **Drill** engine. First Activity = **Negation Station** (reference implementation that sets the design format for all future Activities). Nothing is built yet; the design is fully specified and approved.

## Read these first (do NOT re-derive — already written)
- **Implementation spec / plan (approved):** `/Users/joshuaf/.claude/plans/lets-make-a-new-robust-harbor.md` — the build plan: design format, Coach edge function, 3-table data model, wiring, 5 build stages, verification.
- **Glossary:** `LSATU/src/features/activity-centre/CONTEXT.md` (+ registered in `LSATU/CONTEXT-MAP.md`) — locked vocabulary: Activity / Item / credited answer / Coach / Verdict. "Drill" is reserved for the MCQ engine, do not reuse it.
- **Decision record:** `LSATU/docs/adr/0002-activity-centre-separate-from-drill.md` — why it's its own context, not an extension of Drill or Homework.
- **Persistent memory:** `~/.claude/projects/-Users-joshuaf/memory/project_lsatu_activities_centre.md`.

## Source content for Negation Station (use verbatim, exclusively)
Joshua delivered two PDFs in-chat: the drill (30 free-text negation items, ordered easy→hard) and the answer key (credited negation + explanation per item). These are the seed for the `activities` row. The full 30 Q + answer key are in the conversation transcript; re-request from Joshua if not accessible.

## Locked decisions (don't re-litigate)
- Design format: **light editorial surface (always light, even in dark app)**, single **emerald** accent (`--state-correct`), quality bar = `LSATU/src/components/mainhub/SmartLRTrainingCard.tsx`. Title font = Georgia (already configured, no new webfont).
- Flow: intro/rules screen → per-item **two-panel** (left = statement, right = type answer + feedback) → completion summary. Mobile stacks.
- Feedback: Coach judges each submit → if not correct, **nudge + retry (cap 2)** → after cap or "show answer", reveal credited answer + explanation. Verdict (`correct`/`partial`/`incorrect`) drives score; never hard-blocks advancing. Polar-opposite answer = `partial` (the trap this drill teaches).
- Coach = new `supabase/functions/activity-coach` edge function modeled on existing `analyze-stem-response` (Lovable AI gateway, `google/gemini-2.5-flash`), but returns structured `{verdict, feedback}`.
- Data: 3 new tables mirroring the homework snapshot pattern — `activities`, `activity_assignments` (immutable per-student snapshot), `activity_item_responses`. Plus `has_activity_access` flag. Assignment-gated only.
- Deferred (design-for, do NOT build): AI item generation; analytics-driven activity suggestions.

## Key precedents to mirror (found during exploration)
- Feature folder shape: `LSATU/src/features/admin-inbox`.
- Assignment flow: `homework_sets`/`homework_assignments` migrations, `src/components/teacher/AssignmentBuilder.tsx`, `src/hooks/useStudentAssignments.ts` + `useAdminAssignments.ts`, `src/lib/classroomItems.ts` (`resolveItemRoute`, `createClassroomItem`).
- Permissions: `src/hooks/useUserPermissions.ts` (`ACCESS_FLAGS`), routing in `src/App.tsx` (`ProtectedRoute flag=...`).
- Free-text + AI judge precedent: `supabase/functions/analyze-stem-response/index.ts`.
- Design tokens: `src/index.css` (`--state-correct` emerald, `--state-incorrect`/`--state-again` rose, `--state-warn` amber; bronze is NOT a default).

## Working rules (Joshua's, must follow)
- No em dashes anywhere. Terse, opinionated. Audit-first, stage-by-stage with pauses; hand back a manual verification checklist.
- Errors never swallowed (throw/toast). No `(supabase as any)` — regen types: `supabase gen types typescript --local`. No `any` in new code. Granular feature flags, not role booleans.
- Git: commit + push to `main` (fetch first; never force-push). Conventional commits.
- Product/design/pedagogy context lives in the Obsidian vault, not the repo. Route student-facing copy through the warm-coach teaching voice.

## Suggested skills for the next session
- `/pickup` — load LSAT U vault state before starting (Session Start Protocol).
- `executing-plans` or `subagent-driven-development` — execute the approved plan with review checkpoints.
- `verification-before-completion` — before claiming any stage done.
- `run` / `webapp-testing` — drive the app for the end-to-end verification in the plan.
- `/wrapup` — close the session and update the vault ledger.

## Immediate next action
Start at the plan's **Stage 1**: schema migrations (`activities`, `activity_assignments`, `activity_item_responses`, `add_has_activity_access`) + Negation Station seed, then regen Supabase types. Pause for Joshua's review before Stage 2.
