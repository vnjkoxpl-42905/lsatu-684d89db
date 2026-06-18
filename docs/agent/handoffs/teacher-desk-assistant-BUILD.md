# BUILD HANDOFF — Teacher Desk embedded AI assistant

- Created: 2026-06-18
- From: Claude + Joshua
- To: **a fresh Claude Code chat** (or any agent) — cold start, no prior chat context needed
- Status: **Design is LOCKED. This is the implementation handoff. Build it.**

You are a new Claude Code session picking this up cold. Everything you need is in the repo. Follow the steps in order; do not skip the read phase.

## Step 0 — Load full context (read in this order)

1. **The spec (source of truth):** `docs/superpowers/specs/2026-06-18-teacher-desk-assistant-design-spec.md` — read it fully; it has 12 sections and is self-contained.
2. Decision record: `docs/adr/0003-teacher-desk-embeds-ai-assistant.md`
3. Codex design input already folded into the spec: `docs/agent/handoffs/teacher-desk-assistant-codex-input.md`
4. Glossary (updated): `src/pages/teacher/CONTEXT.md` (Command, Daily Command Sheet, AI Teaching Assistant)
5. Original inspection: `docs/superpowers/specs/2026-06-18-teacher-desk-claude-inspection.md`
6. Project rules: `CLAUDE.md` / `AGENTS.md` (commit+push to main; no em dashes; errors never swallowed; no `any`; reuse existing patterns).
7. Code touchpoints (read before editing):
   - Desk: `src/pages/teacher/desk/` — `TeacherDeskPreview.tsx`, `ModeList.tsx`, `WorkSurface.tsx`, `DeskCube.tsx`, `AssistantCommandLine.tsx`, `deskTasks.ts`
   - Engine: `src/hooks/useOperatorChat.ts`, `src/components/teacher/ai-ta/OperatorChat.tsx`, `ActionCard.tsx` (reference only)
   - Edge fn: `supabase/functions/teacher-operator-chat/`
   - Routing: `src/App.tsx` (see gotcha below)
8. Live throwaway mockup of the chosen layout: `http://localhost:8080/desk-lab.html` (`public/desk-lab.html`).

## Critical constraints (do not violate)

- The center is a **task execution console**, NOT a general chat. **Task-first empty state** ("Today queue" + next move + priority chips), chat secondary. No "Ask anything" greeting as the hero.
- **Layout A** only (left task lists / center assistant / right read-only context strip). Cube removed. The left queue stays visually authoritative.
- Backend is **`teacher-operator-chat` via `useOperatorChat`**. Do NOT use `tutor-chat`.
- Build a **new graphite `DeskAssistant`** and a **new typed `DeskActionCard`** — do not drop in the dark `OperatorChat`/`ActionCard` JSX. Reuse the hook + backend + action functions only.
- **Scope guardrail:** NO Teaching Profile / memory learning / transcript ingestion / full recommender in this slice. Prove ONE end-to-end task-seeded card.

## Routing gotcha (will bite you)

There are two `/teacher` route entries in `src/App.tsx`. The **standalone** route is canonical and renders the desk full-bleed under `ProtectedRoute` (which has a localhost dev bypass, so local preview is reachable). `TeacherShell` has a stricter `is_admin` gate with no bypass. **Keep the desk on the standalone route; do not route it through `TeacherShell`** or unauthenticated local preview breaks. `/teacher/desk-preview` and the shell `/teacher` index both redirect to `/teacher`.

## Build steps (spec §10) — do them in order, verify each

- [ ] **Stage 1 — `DeskAssistant` shell (graphite).** Drives `useOperatorChat`. Task-first empty state, priority chips from `deskTasks` ranking, command input, recent-chats affordance. Honest loading/error/**local-preview disabled** states (no failing Supabase invoke).
- [ ] **Stage 2 — Rewire to Layout A.** `TeacherDeskPreview.tsx`: center = `DeskAssistant` (remove `DeskCube` + `WorkSurface` editors). Keep left `ModeList`. Right = read-only context strip that collapses when no task is selected. **Then delete `public/desk-lab.html`.**
- [ ] **Stage 3 — `DeskActionCard` + wiring.** Typed pending-artifact card: Approve / Edit / **Start blank** / Discard; **idempotent** approval; consequence-accurate labels ("Send to student"/"Post recap"/"Assign drill"/"Mark reviewed"); stable task/student/source/draft linkage; **left row reconciles** after approve/discard; markdown-rendered; provenance on transcript/recap cards. Wire to existing actions (`sendReply` / `useUpdateDraftStatus` / `external_work_uploads` update / `createAssignments`+`createClassroomItem`+`notifyStudentOfClassroomItem`).
- [ ] **Stage 4 — Backend contract.** Add typed `context` field (`{surface:'teacher_desk', taskId, mode, studentId, sourceKind, sourceId, sourcePreview}`); recent-chats listing/reopen; send-race guard; inline `create_draft` data so the card renders in place.
- [ ] **Stage 5 — Mobile.** Assistant-first + drawers (task list bottom/drawer, context as card metadata/sheet). Not a 3-column stack.
- [ ] **Stage 6 — Verify** (see below).

Pause for Joshua's review between stages with material decisions (per CLAUDE.md stage-by-stage workflow).

## Acceptance / verification (spec §10)

- Desktop 1440x1000 and mobile 390x844: no clipping; left queue authoritative; right strip collapses when idle.
- Real round-trip: chip/task → seeded command → drafted card → approve → the real action fires.
- **Idempotency:** double-click/refresh/repeat does NOT send or assign twice.
- No duplicate left rows after a seeded task creates a draft (reconciliation works).
- No raw markdown artifacts anywhere.
- Honest local-preview state (no failing invoke).
- `npx tsc --noEmit -p tsconfig.app.json` clean; targeted ESLint clean; production build passes (`NODE_OPTIONS=--max-old-space-size=6144 npm run build` if memory-constrained).

## Done = 

All six stages landed, verification green, `public/desk-lab.html` deleted, committed and pushed to `main`. Report what changed and anything deferred.
