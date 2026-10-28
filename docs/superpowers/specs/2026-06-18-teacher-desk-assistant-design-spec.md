# Teacher Desk — Embedded AI Assistant (final design spec)

- Date: 2026-06-18
- Author: Claude, with Joshua (grill session) + Codex (design input)
- Status: **Superseded in part — see correction below.**

> **CORRECTION (2026-06-18).** This spec's Layout A / "center = assistant" /
> "remove the work surface, cube, and per-mode editors" / "DeskActionCard"
> direction was **not** what Joshua wanted, and the first build (which followed it
> literally) wrongly stripped the desk. The shipped design keeps the **entire
> previous instrument-panel desk** (cube, Tools/Next rail, work surface, right
> Controls + Context with its action button) and changes **only one thing**: the
> white draft textbox inside the work surface becomes a compact **mini terminal
> chat** (`MiniChat`) that drafts/refines into the editable draft. The
> right-panel button stays the single commit. No full-page assistant, no separate
> approval cards. Sections 3–5 and 10 below are historical; treat the corrected
> behavior in [ADR 0003](../../adr/0003-teacher-desk-embeds-ai-assistant.md) as
> authoritative.
- Decision record: [ADR 0003](../../adr/0003-teacher-desk-embeds-ai-assistant.md)
- Inputs folded in: [gameplan](../plans/2026-06-18-teacher-desk-terminal-assistant.md), [Codex input](../../agent/handoffs/teacher-desk-assistant-codex-input.md), [Claude inspection](2026-06-18-teacher-desk-claude-inspection.md)
- Glossary: `src/pages/teacher/CONTEXT.md` (Command, Daily Command Sheet, AI Teaching Assistant updated)

## 1. Problem and goal

The Teacher Desk Review surface was low quality (raw markdown blob, duplicated text, clipped editor, no hierarchy). Rather than polish a static draft card, the desk is reworked around an **embedded, always-visible AI Teaching Assistant** that is the work surface for Reply / Review / Assign. Success test is unchanged: Joshua opens Today and knows the next 3 moves in under 10 seconds, and can act on them without leaving the desk.

The assistant is a **task execution console**, not a general chat destination. This is the single most important constraint: if it becomes "Ask me anything," Today degrades into another assistant page and loses its daily-command-sheet value.

## 2. Locked decisions

From the grill session and Codex review:

1. **Always-visible assistant on the Desk** (reverses the old "Desk is not the assistant page" IA; recorded in ADR 0003).
2. **Layout A** — left task lists, center assistant, right thin context strip. The decorative cube is removed.
3. **Task-first empty state.** At rest the center leads with the next move + priority chips, not a greeting. Freeform "ask" input and recent-chats are present but secondary.
4. **Work happens in the chat** as chip/task → seed → **editable approval card** → approve.
5. **Editable cards (option B).** Cards open with an AI draft but always expose **Start blank** so Joshua is never forced into AI wording.
6. **Backend = `teacher-operator-chat` via `useOperatorChat`.** One assistant, one shared history (`operator_messages`). NOT `tutor-chat`.
7. Manual per-mode editors (reply textarea, draft editor, assign picker) are removed from the desk; their function moves into cards.
8. **`/teacher/command` stays** as the expanded history/drafts view until the desk reaches parity.

## 3. Layout

Desktop grid (≥ lg): `left 300px / center fluid / right 320px`, with rules:

- **Left column — the canonical queue (authoritative).** Workspace rail + Reply/Review/Assign modes with counts + ranked task rows ("Next"). This stays the source of truth for "what needs attention." Reuse the existing `ModeList`.
- **Center — the assistant workbench.** Header names the selected task, or "Today queue" when nothing is selected. Task-first empty state. Priority chips → chat transcript → approval cards → command input. Set a **minimum useful width**; the right strip collapses before the card gets cramped.
- **Right — read-only evidence strip.** Student, source, recent completion, unread state, transcript/file provenance for the active task. **No action controls** (approval lives in cards). When no task is selected, it shows a compact Today summary or collapses.

The center never *rests* as a big chat hero; it rests as a task console.

## 4. Center panel behavior (the workbench)

### Empty state (nothing selected) — task-first
- Header: "Today queue".
- A prominent **Next move** row = the single highest-priority task (from `deskTasks` ranking).
- **Priority chips**: top cross-mode actions (e.g. "Approve Adriana's recap", "Reply to Meghan", "Assign Dakota"), plus an "Ask…" chip for freeform. Chips are top *priorities*, deliberately not a duplicate of the visible left rows (left = browse/mode-switch; chips = the few most important across modes).
- Transcript area quiet (no large generic greeting).
- Command input present but not the hero. Recent-chats affordance available.

### Seeded state (task or chip clicked)
1. Click a chip or a left task row.
2. The assistant **visibly inserts a seeded command** with source context attached (so the action is legible, not silent).
3. It drafts a **pending card** (visible pending/cancel state while drafting).
4. Joshua edits / approves / starts blank / discards.

Freeform chat stays available but visually secondary to task-seeded work.

## 5. DeskActionCard (new typed contract)

The existing `ActionCard` (reports tool results that already happened) is a **reference only**. Build a new typed `DeskActionCard` whose cards are **pending artifacts**:

- Explicit paths: **Approve**, **Edit**, **Start blank**, **Discard**. `Start blank` is visible in the card body/footer, not buried under Edit.
- **Consequence-accurate labels:** "Send to student" / "Post recap" / "Assign drill" / "Mark reviewed", never a generic "Approve."
- **Idempotent approval:** double-click, refresh, or a repeated assistant turn must not send/assign twice.
- **Stable linkage:** each card keeps task id, student id, source kind/id, and draft/action id.
- **Reconciliation:** after approve/discard, the corresponding left task row updates immediately (no split-brain).
- **Provenance:** transcript/recap cards show what transcript/note/file produced the draft, not just the text.
- Content rendered as **markdown** (fixes the original blob bug).

Card → action wiring reuses existing functions: Reply → message insert (`sendReply`), Review draft → `useUpdateDraftStatus`, upload → `external_work_uploads` update, Assign → `createAssignments` + `createClassroomItem` + `notifyStudentOfClassroomItem`.

## 6. Backend contract

Reuse `useOperatorChat` + `teacher-operator-chat` + `operator_conversations` / `operator_messages` + the admin gate. Gaps to address:

- **Typed context payload.** Stage 1 may prepend prose context to the seeded message, but the API contract reserves a typed field from the start:
  ```ts
  { messages, context: { surface: 'teacher_desk', taskId, mode, studentId, sourceKind, sourceId, sourcePreview } }
  ```
  Move off prose into this field quickly so history stays readable and the function can audit tool calls against the selected task.
- **Recent-chats picker.** `useOperatorChat` currently loads only the most recent conversation. Add listing/reopen of past `operator_conversations`.
- **Streaming.** Hook is non-streaming in practice; show an honest pending state (and add streaming later if needed).
- **Send race.** `sendMessage` builds history from the `messages` closure; rapid sends can race. Guard against concurrent sends.
- **`send_message` tool.** Route normal Reply/Review/Assign chips through approval cards; only send immediately when Joshua explicitly says "send now."
- **`create_draft` path.** Today it writes an `ai_ta_drafts` row and punts to `/teacher/command?tab=drafts`. The desk needs the editable artifact **inline**, so the tool result must carry enough data to render the card in place.

## 7. States

- **Loading / pending:** honest spinner on the card while drafting; cancelable.
- **Error:** surfaced on the card / input, never swallowed.
- **Empty:** task-first "Today queue" (section 4).
- **Local preview (unauthenticated localhost):** honest **disabled/mock** assistant state. Never fire a failing Supabase invoke (same discipline as the Assign-picker fix).

## 8. Mobile

Not a 3-column DOM stack. Assistant-first with drawers:
- Top: compact mode/count bar + selected-task chip.
- Main: assistant panel.
- Task list: bottom or drawer.
- Context: collapsible inline in the card, or a sheet from the selected task (not a full third section).

## 9. Risks to hold the line on

- **Chat gravity** — keep the left queue visually authoritative; the assistant is the workbench, not the hero.
- **Duplicate artifacts** — a seeded task creating an `ai_ta_drafts` row that also appears in the left Review queue must reconcile to one item.
- **History pollution** — get context out of prose and into the typed field fast.
- **Approval semantics** — cards label the real consequence.
- **Performance** — cap/virtualize transcript if history grows; Today must stay light.
- **Scope creep** — NO Teaching Profile, memory learning, transcript ingestion, or full assignment recommender in this slice. Prove one end-to-end task-seeded card first.

## 10. Build stages

1. **`DeskAssistant` shell (graphite).** New component driving `useOperatorChat`, graphite-styled (not the dark `OperatorChat` JSX). Task-first empty state, priority chips from `deskTasks` ranking, command input, recent-chats affordance. Honest loading/error/preview states.
2. **Rewire desk to Layout A.** `TeacherDeskPreview.tsx`: center renders `DeskAssistant` (remove `DeskCube` + `WorkSurface` editors). Keep left `ModeList`. Right becomes the read-only context strip with collapse behavior.
3. **`DeskActionCard` + wiring.** New typed pending-artifact card (section 5), idempotent approval, reconciliation, consequence labels, wired to the existing action functions. Selecting a task/chip seeds the assistant and produces a card.
4. **Backend contract.** Add the typed `context` field, recent-chats listing, send-race guard, inline `create_draft` data.
5. **Mobile.** Assistant-first + drawers (section 8).
6. **Verify.** Desktop 1440x1000 + mobile 390x844; real round-trip (chip → card → approve → action fires); idempotency (double-approve sends once); no duplicate left rows; no raw markdown; honest local preview; `npx tsc --noEmit -p tsconfig.app.json`, targeted ESLint, production build.

## 11. Out of scope

- `tutor-chat` / student drill chat.
- Retiring `/teacher/command` (stays as expanded view until parity).
- Teaching Profile / memory / autonomy / transcript ingestion / full recommender.
- New top-level categories; Reply/Review/Assign remain the only modes.

## 12. Cleanup

- Delete `public/desk-lab.html` (throwaway mockup) once Stage 2 lands.
