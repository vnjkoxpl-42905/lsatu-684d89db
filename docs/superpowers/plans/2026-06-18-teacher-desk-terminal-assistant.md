# Teacher Desk — Terminal AI Assistant (gameplan)

Date: 2026-06-18
Author: Claude (interview with Joshua)
Surface: `http://localhost:8080/teacher` (Soft Graphite Teacher Desk)
Supersedes intent of: the disabled assistant-line + static draft-approve flow in the current desk.

## What Joshua decided (interview)

- The Review "draft + approve" card is low-tier and goes away as the centerpiece.
- Forget the Gmail-card idea completely.
- Turn the **bottom assistant command line into a real, working AI assistant**, styled as a **terminal** that fits the graphite instrument-panel look.
- Reuse the **existing** assistant backend, not build new.
- Review still lists student work; the terminal becomes how Joshua actually acts.

## Stage 0 — Audit findings (grounding)

The right backend already exists, and it is **not** `tutor-chat`:

- `tutor-chat` (edge fn) is student-and-question-specific: it validates `qid`, `stimulus`, answer choices, etc. Wrong fit for a teacher operator assistant.
- `teacher-operator-chat` (edge fn) + `useOperatorChat` (`src/hooks/useOperatorChat.ts`) is a complete teacher operator assistant: chat history, loading/error, `sendMessage`, `newConversation`, `conversationId`, messages persisted to `operator_messages`.
- `src/components/teacher/ai-ta/OperatorChat.tsx` already renders it with markdown (`ReactMarkdown`), file attachments, and **tool actions queued for approval** via `ActionCard` (`tool_results`). Suggestions like "List my students", "Draft a session recap for", "Message", "Summarize how" already work.
- The operator is already used by the Command/AITA page (`/teacher/command`, `TeacherAITA.tsx`).
- The desk (`src/pages/teacher/desk/`) does **not** import any of this yet. Its `AssistantCommandLine.tsx` is a truthful disabled stub.
- `teacher-operator-chat` request body is `{ messages: history }` only — no explicit student/task context field today.

Bonus: routing content through the operator's `ReactMarkdown` renderer **fixes the original complaint for free** (raw `**` / `+` blobs render as real formatting instead of a stripped run-on).

Recommendation: **reuse `useOperatorChat` + `teacher-operator-chat`**, restyle the presentation to the graphite terminal aesthetic. Do not reuse `OperatorChat.tsx`'s JSX wholesale (it is dark zinc/amber, wrong palette for the pale graphite desk) — reuse the **hook** and `ActionCard`, build a desk-specific terminal view.

## Decisions to confirm before Stage 1

- **D1 (backend):** Use `teacher-operator-chat` (recommended) instead of the `tutor-chat` you named. Confirm.
- **D2 (approve-draft fate):** When a Review draft is selected, do we (a) keep a small "Approve" quick-action next to the terminal, or (b) fold approval entirely into the assistant ("approve this draft")? Recommend (a) for the first slice so nothing regresses; drafts still exist in the DB either way.
- **D3 (terminal height):** The bottom line expands upward into a scrollable terminal transcript over the work surface, collapsing back to a prompt line. Confirm this over a full-height takeover of the center column.

## Guardrail note (intentional override)

The 2026-06-16/17 desk spec said keep the full AI assistant **separate** and ship the command line **disabled**, to avoid scope-creeping into the assistant project. This gameplan **intentionally overrides** that, on Joshua's explicit direction. We keep it bounded by reusing the existing operator (no new autonomy/memory work in this pass).

## Build stages

### Stage 1 — Terminal assistant component (graphite)
- New `src/pages/teacher/desk/DeskTerminal.tsx` (replaces `AssistantCommandLine.tsx` in `TeacherDeskPreview.tsx`).
- Drives `useOperatorChat`. Collapsed state = a single graphite command-prompt line (keeps the calm desk). Focus/submit expands it upward into a scrollable terminal transcript: thin black linework, pale canvas, monospace prompt, strong-black selected/active states. No dark zinc, no amber.
- Render assistant messages with `ReactMarkdown` (reuse the operator's markdown treatment, restyled). Reuse `ActionCard` for `tool_results` so approval-gated actions still surface.
- Honest states preserved: loading spinner, error line. No fake output.

### Stage 2 — Task/student context
- When a desk task is selected, scope the assistant to it. First slice (low risk): prepend a compact context preface to the first `sendMessage` for that task (student name, mode, task title/source). No edge-fn change needed.
- Optional follow-up (only if needed): extend `teacher-operator-chat` body with an explicit `context` object instead of prefacing. Defer unless the preface proves weak.

### Stage 3 — Rework Review mode
- Remove the heavy inline draft editor + "Approve draft" centerpiece from the Review `WorkSurface`.
- Keep the Review task list (drafts/uploads still appear as tasks). Show selected draft as a compact, **properly rendered** read view (markdown, not stripped run-on).
- Per D2, either keep a small Approve quick-action or route it through the terminal. Verify `useUpdateDraftStatus` / draft data still works regardless.

### Stage 4 — Verify
- Desktop 1440x1000 and mobile 390x844: terminal reachable, expands/collapses, no clipping.
- Real round-trip to `teacher-operator-chat` with a logged-in admin; streamed/pending → rendered reply.
- A tool action (e.g. "list my students") returns an `ActionCard`; destructive actions stay approval-gated.
- No raw markdown artifacts anywhere (now rendered, not stripped).
- `npx tsc --noEmit -p tsconfig.app.json`, targeted ESLint, production build.

## Files in play

- `src/pages/teacher/desk/AssistantCommandLine.tsx` → replaced by `DeskTerminal.tsx`
- `src/pages/teacher/desk/TeacherDeskPreview.tsx` — swap the assistant slot; pass selected task context
- `src/pages/teacher/desk/WorkSurface.tsx` — strip the Review draft editor centerpiece (Stage 3)
- `src/hooks/useOperatorChat.ts` — reused as-is (maybe extended in Stage 2)
- `src/components/teacher/ai-ta/ActionCard.tsx` — reused for approval-gated actions
- `supabase/functions/teacher-operator-chat/` — reference only (optional Stage 2 context field)

## Out of scope (do not pull in)

- New autonomy/memory for the assistant beyond what `teacher-operator-chat` already does.
- Reply and Assign mode redesigns (scope is Review + the assistant line).
- Touching `tutor-chat` or the student drill chat.
- New top-level categories. Reply / Review / Assign stay the only modes.
