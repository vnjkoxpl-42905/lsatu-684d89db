# Teacher Desk — Embedded AI Assistant (gameplan)

Date: 2026-06-18
Author: Claude (grill-with-docs session with Joshua)
Surface: `http://localhost:8080/teacher` (Soft Graphite Teacher Desk)
Decision record: [ADR 0003](../../adr/0003-teacher-desk-embeds-ai-assistant.md)
Glossary updated: `src/pages/teacher/CONTEXT.md` (Command, Daily Command Sheet, AI Teaching Assistant)

## Locked design (resolved in grilling)

The Teacher Desk embeds the AI Teaching Assistant as a permanent center panel. Three zones (**Layout A**):

```
┌ left (300px) ─────┬─ center: assistant ──────┬─ right (320px) ─┐
│ Workspace rail    │ AI TEACHING ASSISTANT     │ CONTEXT         │
│ Reply / Review /  │ [priority chips row]      │ student + stats │
│ Assign lists      │ chat transcript           │ source          │
│ + Next            │ + approval action cards   │ (no actions)    │
│                   │ ❯ command input           │                 │
└───────────────────┴───────────────────────────┴─────────────────┘
```

Resolved decisions:
1. **Assistant on the desk, always visible** (not summoned, not a separate tab). Reverses the old IA. Glossary updated.
2. **Layout A** — left task lists kept, assistant in center, thin context strip right. Cube removed.
3. **Work happens in the chat.** Priority **chips** above the input are the top desk tasks; clicking one (or a left-list task) seeds the assistant. The assistant drafts/proposes; result is an **approval-gated card** in the chat.
4. **Every card is editable (option B).** Cards open with an AI draft but have a blank-and-write escape hatch, so Joshua is never forced to send AI words. Applies to Reply, Review (recap), Assign.
5. **Manual per-mode editors removed** from the desk (reply textarea, draft editor, assign picker). Their function moves into cards.
6. **Backend = `teacher-operator-chat` via `useOperatorChat`** (NOT `tutor-chat`, which is student/question-specific). One assistant, one shared history (`operator_messages`), reopenable recent chats.
7. Routing draft content through markdown rendering **fixes the original raw-`**`-blob bug** for free.

Visual ref (throwaway): `public/desk-lab.html` (layout toggle A/B/C). Delete after build.

## Open follow-ups (not blocking Stage 1)

- **Dedicated assistant page** (`/teacher/command`, `TeacherAITA` + `OperatorChat`): becomes the expanded/full-screen view of the same assistant, or is retired. Must share the one history either way.
- **Per-task context injection:** `teacher-operator-chat` body is `{ messages }` only. First slice prepends task/student context to the seeded message; add an explicit `context` field later only if the preface proves weak.
- **Mobile:** the 3-zone desk must stack to a reachable single column (assistant + a way to get at the task lists).

## Audit findings (grounding)

- `useOperatorChat` (`src/hooks/useOperatorChat.ts`) → `teacher-operator-chat`. Returns `{ messages, isLoading, error, sendMessage, newConversation, conversationId }`; persists to `operator_messages`.
- `OperatorChat.tsx` already renders chat + `ReactMarkdown` + file attach + `ActionCard` (approval-gated `tool_results`). Wrong palette (dark zinc/amber) for the graphite desk — reuse the **hook + ActionCard logic**, not the JSX.
- `ActionCard.tsx` is the approval card primitive to reuse.
- Desk components live in `src/pages/teacher/desk/`. The bottom `AssistantCommandLine.tsx` is the disabled stub being replaced; `WorkSurface.tsx` holds the manual editors being removed; `DeskCube.tsx` is the cube being dropped.

## Build stages

### Stage 1 — Desk assistant panel (graphite)
- New `src/pages/teacher/desk/DeskAssistant.tsx` driving `useOperatorChat`, styled to the graphite language (pale canvas, thin black linework, small uppercase labels, monospace command input, strong-black active states). Reuse a graphite-restyled `ActionCard` for `tool_results`.
- Priority chips row above the input, sourced from the desk's existing task ranking (`deskTasks` priority) — top N tasks as chips, plus a freeform "Ask" chip. Clicking a chip calls `sendMessage` seeded with that task's context.
- Honest states: loading, error, empty. Markdown-rendered assistant content.

### Stage 2 — Rewire the desk to Layout A
- `TeacherDeskPreview.tsx`: center column renders `DeskAssistant` (remove `DeskCube` + the `WorkSurface` editors). Left column keeps `ModeList` (Reply/Review/Assign + Next). Right column becomes a thin read-only context strip (student + source), no action buttons.
- Selecting a task in the left list seeds the assistant (same path as a chip).

### Stage 3 — Action cards replace manual flows
- Reply / Review / Assign each resolve as an editable approval card in the chat: Approve (send/approve/assign), Edit (blank-and-write), Discard. Wire to the existing actions (`sendReply`, `useUpdateDraftStatus`, `createAssignments`/`createClassroomItem`).
- Verify drafts/recaps/uploads/assignments still function end-to-end through the card path.

### Stage 4 — Verify
- Desktop 1440x1000 and mobile 390x844: 3-zone on desktop, reachable stacked layout on mobile, no clipping.
- Real round-trip to `teacher-operator-chat` (logged-in admin); seeded chip → drafted card → approve → action fires.
- No raw markdown artifacts anywhere (now rendered).
- `npx tsc --noEmit -p tsconfig.app.json`, targeted ESLint, production build.

## Out of scope

- New autonomy/memory beyond what `teacher-operator-chat` already does.
- Reply/Assign mode *concept* changes — still the only three modes.
- Touching `tutor-chat` / student drill chat.
- New top-level categories.
