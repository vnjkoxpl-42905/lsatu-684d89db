# Teacher Desk Assistant — Codex Design Input

- Date: 2026-06-18
- From: Codex
- Status: Design input only. No implementation in this pass.
- Context read: `teacher-desk-assistant-design-input.md`, ADR 0003, terminal assistant plan, Claude inspection, teacher glossary, current desk code, `useOperatorChat`, `OperatorChat`, `ActionCard`, `teacher-operator-chat`, and `public/desk-lab.html`.

## Short Position

I support embedding the assistant on the Desk, but only if the center is treated as a **task execution console**, not a general chat destination. The risk the old rule guarded against is real: if the assistant opens as a broad "What do you want to do?" chat with the task lists relegated to decoration, Today turns into another assistant page and loses its daily command sheet value.

The way to make the reversal work is to keep the Desk visibly task-first:

- Left column remains the authoritative queue: Reply, Review, Assign, counts, and ranked task rows.
- Center assistant is the workbench for the selected or seeded task.
- Right column is compact evidence, not another control surface.
- The assistant empty state should start from "Here is the next teacher move" rather than "Ask me anything."

So: **Layout A is the right desktop direction**, but the spec should harden the role boundaries before implementation.

## Pushback On The Big Call

Always-visible is defensible because Joshua wants the assistant where the work happens, and the glossary now explicitly says that. But always-visible creates two failure modes:

1. **Chat gravity:** the visual mass of the center panel can make the left task system feel secondary.
2. **Prompt ambiguity:** if the primary affordance is a blank command input, the Desk asks Joshua to formulate work instead of presenting the next move.

My recommendation: do not design the center as "chat + suggestions." Design it as **selected-task assistant mode**:

- Header names the selected task or says "Today queue" when nothing is selected.
- Priority chips are task chips, not generic suggestions.
- The transcript area should be quiet until a task is seeded; avoid a large generic assistant greeting.
- Freeform chat stays available, but visually secondary to task-seeded work.

This preserves Joshua's always-visible preference while avoiding the "Today became ChatGPT" problem.

## Layout A Critique

Layout A is the best of the three options in `desk-lab.html`. B loses the browsable task list; C is exactly the generic chat-app failure mode.

Refinements I would make before locking the spec:

- **Right strip earns space only while a task is selected.** On desktop, keep it because task cards need evidence: student, source, recent completion, unread state, and maybe transcript/file provenance. When no task is selected, it should show only a compact Today summary or collapse visually.
- **No action controls in the right strip.** The ADR already says approval moves into cards. Keep that line. Mixing right-panel approve buttons with chat cards will create two competing action models.
- **Chips and left list can coexist if their meanings differ.** Left list = browse and mode switching. Chips = top cross-mode commands or current-mode shortcuts. If chips simply duplicate the selected left rows, they will feel redundant.
- **Center width matters.** A 300 / fluid / 320 grid is fine at 1440px, but if the center gets too narrow, editable cards will feel cramped. Set a minimum useful assistant width and let the right strip collapse before the approval card becomes small.

## Interaction Model

The chip -> seed -> editable approval card -> approve model is strong. It matches the job: AI prepares, Joshua decides.

The card contract needs to be stricter than the current `ActionCard`:

- Cards should be **pending artifacts**, not just summaries of tool results that already happened.
- Every card needs explicit `Approve`, `Edit`, `Start blank`, and `Discard` paths.
- `Start blank` should be visible in the card body or footer, not buried behind "Edit." This is Joshua's escape hatch from AI wording.
- Approval should be idempotent. A double-click, refresh, or repeated assistant turn must not send the same message or assignment twice.
- A card should keep a stable link to the originating task, student, source, and draft/action id.
- After approval/discard, the left task row should reconcile immediately, or the Desk will feel split-brained.

I would avoid making chip click silently perform too much. A good pattern:

1. Click chip or left task.
2. Assistant inserts a seeded command visibly, with source context attached.
3. It drafts a pending card.
4. Joshua edits/approves.

For high-confidence tasks, sending immediately on chip click is acceptable, but there should be a visible pending state and a way to cancel while the assistant is drafting.

## Reuse Versus Build

Use `useOperatorChat` and `teacher-operator-chat` as the foundation, but do not treat the current `OperatorChat` / `ActionCard` JSX as drop-in.

What carries cleanly:

- Authenticated persistent operator history through `operator_conversations` and `operator_messages`.
- Existing `teacher-operator-chat` admin gate.
- Current tool set as an early operator loop.
- Markdown rendering for assistant text.
- File attachment extraction from the existing chat UI, if the Desk wants it later.

Gaps to address in the spec:

- `useOperatorChat` only loads the most recent conversation and has no recent-chat picker.
- `sendMessage` posts `{ messages }` only. Task context will be fragile if it is only prepended into prose.
- The hook is non-streaming in practice, despite the edge-function comment.
- Rapid sends can race because `sendMessage` builds history from the current `messages` closure.
- `ActionCard` currently reports that `create_draft` or `send_message` happened. It is not the editable approval-card primitive described in the plan.
- `teacher-operator-chat` has a `send_message` tool that can send immediately when Joshua explicitly asks. The Desk should still route normal Reply/Review/Assign chips through approval cards unless the user deliberately says "send now."
- The current `create_draft` path creates an `ai_ta_drafts` row, then punts review to `/teacher/command?tab=drafts`. The embedded Desk wants the editable artifact inline, so the tool result needs enough data for an inline card.

Recommendation: make a new graphite `DeskAssistant` shell and a new typed `DeskActionCard` contract. Reuse the hook and backend, then extend them where the Desk needs typed context and inline approval.

## Open Follow-Ups

### 1. Fate of `/teacher/command`

Keep it for now as the **expanded assistant and draft history view**, not a separate product concept. It should share the same `operator_messages` history and eventually the same card renderer.

Do not retire it in the first slice. It is useful as a larger workspace for long review sessions, history search, and draft queue management. But stop letting it be the only place where assistant-created drafts can be approved.

### 2. Per-task context injection

Prepending context to the seeded user message is acceptable for Stage 1, but the spec should name it as temporary.

Preferred next shape:

```ts
{
  messages,
  context: {
    surface: 'teacher_desk',
    taskId,
    mode,
    studentId,
    sourceKind,
    sourceId,
    sourcePreview,
  }
}
```

This avoids brittle prompt parsing, lets the function audit tool calls against the selected task, and gives future memory/profile logic a clean source of truth.

### 3. Mobile stacking

Do not simply stack left, center, right in DOM order with a long scroll. The assistant will bury the queue or the queue will bury the assistant.

Recommended mobile model:

- Top: compact mode/count bar and selected task chip.
- Main: assistant panel.
- Bottom or drawer: task list.
- Context: collapsible inline section inside the card or a sheet opened from the selected task.

On mobile, the right context strip should not be a full third section. It becomes card metadata or a drawer.

## Missing Risks

- **Transcript pipeline:** Review tasks from transcripts/recaps need source provenance. The approval card should show what transcript/note/file produced the recap, not just the draft.
- **Duplicate artifact risk:** If a seeded task creates an `ai_ta_drafts` row and the left Review queue also shows that row, the same item may appear twice unless task reconciliation is explicit.
- **History pollution:** If every chip click writes a verbose context block into the shared conversation, recent chats may become unreadable. Context should be metadata as soon as possible.
- **Approval semantics:** "Approve draft" is not the same as "send to student" for every draft type. Cards should label the real consequence: send message, post recap, assign drill, mark upload reviewed.
- **Preview/local state:** The Desk currently supports unauthenticated local preview data. The embedded assistant should have an honest local disabled/mock state, not a failing Supabase invoke.
- **Performance:** A large always-visible transcript plus desk queries can make Today feel heavy. Keep message rendering virtualizable or capped if history grows.
- **Scope creep:** Do not build the Teaching Profile, memory learning, transcript ingestion, and full assignment recommender in this slice. The first slice should prove one end-to-end task-seeded card.

## Recommended Spec Adjustment

I would amend the gameplan with these constraints:

1. The assistant center is a task workbench, not a general chat hero.
2. Chips are top priority actions; the left list remains the canonical queue.
3. Right strip is read-only evidence and collapses before the assistant card gets cramped.
4. A new typed `DeskActionCard` is required; existing `ActionCard` is only a reference.
5. Stage 1 may use prose context injection, but the API contract should reserve a typed `context` field.
6. `/teacher/command` remains as expanded history/drafts view until the embedded Desk has parity.
7. Mobile uses assistant-first with task/context drawers, not a three-column stack.

If those changes are added, I think the always-visible assistant is the right direction for Joshua's actual workflow rather than a violation of the Daily Command Sheet principle.
