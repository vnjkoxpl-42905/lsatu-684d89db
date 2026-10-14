# Teacher Desk (page) — Context

The glossary for the Teacher Desk **page** itself (`/teacher`, the `desk/` surface): the named visual regions of the page and what each one is for. Scoped narrower than the teacher-workspace glossary ([../CONTEXT.md](../CONTEXT.md)), which defines the workspace's *concepts* (Today, the task modes, the AI Teaching Assistant, the pipeline). This file names the *boxes on the screen* so we can talk about changing them without ambiguity. It is a glossary, not a spec.

The page-level concept (what the desk is *for*) lives in the parent glossary under **Teacher Desk** and **Today**. This file does not restate that; it names the regions.

> **Update (chat-first desk):** the left rail's **Tools** section (Reply/Review/Assign mode list + Next cards) has been replaced by a ChatGPT-style saved-chats rail. The desk now reads: Workspace options → **New chat** → **Saved chats** (`DeskChatRail`); the center is a light assistant transcript + composer (`DeskChatPanel`); the right rail is a light task/to-do list (`DeskTodoRail`). The chat session is shared via `OperatorChatProvider`.
>
> Superseded (kept on disk, no longer imported, pending a cleanup decision): `ModeList.tsx`, `DeskCube.tsx`, `WorkSurface.tsx`, `ActionContextPanel.tsx`, `MiniChat.tsx`. The region glossary below still describes the pre-chat task surface for reference.

## Region glossary

### Desk Header
The top metadata line of the page. Contains exactly three things:
- **Operating day** (left): the weekday + date Joshua is operating on (e.g. "Thu — 18 June").
- **Status slot** (right): one contextual readout — "Preview data" when signed out locally, otherwise the **next-session cue** (the upcoming session), or empty when nothing is cued.
- **Close** (far right): leaves the desk and returns to `/mainhub`.

Borrowed from the instrument-panel reference's top metadata line. It is a readout + exit, not a place Joshua does teaching work.

### Workspace Tabs
The left-side global navigation labeled WORKSPACE: the top-level Teacher Workspace **areas** — the big places Joshua goes. These are deliberately distinct from the **Task Modes** (Reply/Review/Assign), which live *inside* the Today/Desk page. A Workspace Tab is a destination you leave the desk for; a Task Mode is work you do on the desk. No tab may duplicate a mode. (Renders as a vertical rail today; "tabs" is the chosen product term.)

**Ratified tab set (4):**
- Today → `/teacher` (the desk itself)
- People → `/teacher?ws=people`
- Inbox → `/teacher/conversations`
- Library → `/teacher/library`
- Student detail routes such as `/teacher/students/:studentId` remain deep profile routes, but the list/admin workspace is People.

Removed from the prior set:
- **Assign** — deleted as a tab. It duplicated **Assign mode** and made the page confusing; Assign now lives *only* as a desk Task Mode.
- **Teach** (`/teacher/whiteboard`) — dropped as a top-level tab. The whiteboard surface still exists and **moves under Library** (alongside assignments, recaps, activities). It is reached via Library, not the rail.

The old separate Students/Admin rail split was collapsed into People so roster context and access controls live together.

### Task Modes
The left-side list of the three Today task modes, each with a live count of items waiting. Selecting a mode changes what the Stage shows. These are the "Today Task Groups" from the parent glossary, rendered as the desk's mode selector.

The three modes are always named **Reply mode**, **Review mode**, and **Assign mode** — never "Reply task," "task group," or bare "Reply." The word "mode" is part of the canonical name.

**Prominence + label:** today this list is labeled "TOOLS," which both mislabels it (these are modes, not tools) and buries it. It must be the **clearest, most prominent thing** in the left sidebar — it is how Joshua chooses what he's working on. Relabel the section to name what it is (e.g. "MODES" / "TODAY"); do not call it "Tools." Since Assign is no longer a Workspace Tab, this is the *only* place Assign mode is reachable, so it cannot be visually secondary.

### Next Move
The left-side block labeled NEXT: the single suggested next teacher action (or "No current teacher move"). Whatever it surfaces is always a Reply-, Review-, or Assign-mode task. Sourced from `useNextSession`.

### Desk Cube
The centered wireframe cube plus the CURRENT MODE label naming the active mode (Reply / Review / Assign mode). Its only job is to show which mode is active; it carries no data the teacher acts on. (Tension to resolve later: the parent glossary's instrument-panel direction warns against "decorative cube visuals that do not serve teaching work.")

### To-Do Rail
The right column (`DeskTodoRail`): a light task/to-do list. **Today-scoped** — it belongs to the Today workspace only and must not render on other Workspace Tabs (Library, Students, Admin, Inbox). When a non-Today tab is active, the rail is absent and the desk content area takes its width. (Earlier behavior rendered it on every workspace; that was the bug.)

### Stage
The center column: the region that holds the currently selected task and the means to act on it. Today it contains a task card (title + preview) and the MiniChat beneath it. The shape of the Stage is the main thing under redesign.

### Assistant Chat
The AI Teaching Assistant (parent glossary) rendered as a chat inside the Stage. Today it contains: a transcript, the Draft Box, and a terminal-style command input. It stays inside the desk shell and never becomes a full-page chat. (Was called "MiniChat"; renamed because it is becoming the primary content of the Stage, not a mini add-on.)

### Draft Bubble
Replaces the old Draft Box. A **draft** is a piece of student-facing content the assistant produces (a reply, recap, or assignment message). It renders inside the Assistant Chat as a **distinct full-width document card** — NOT a chat speech bubble. It carries a header strip (draft-type label on the left, **Edit** + **Send** controls on the right) so it reads as an artifact you will send, visually separate from ordinary AI chatter.

- **Resting state.** Before any draft exists there is **no draft box at all** — the Stage shows the task card + the chat transcript + the Composer, nothing else. The old always-on empty white textarea is killed. (Decision: "Nothing but the composer.")
- **Appears only on `create_draft`.** The card shows up only when the assistant produces a draft. Ordinary assistant chatter — advice, clarifying questions — stays a plain left-aligned chat message with no Edit/Send.
- **Form.** Full-width card, header strip (`✦ DRAFT REPLY` style label + Edit/Send), body is the draft text. Plain chatter stays small bubbles; the draft card is deliberately heavier and wider so "this is the thing that goes to the student" is unmistakable.
- **Edit** makes the card body directly editable (rich text: bold, italic, links). Selecting text inside it pops an **Ask for Changes** toolbar, so Joshua can hand-edit or ask the AI to revise just that selection.
- **Send** lives on the card. Sending commits that exact text to the student. Because Send is per-card, the old right-panel Commit Button is **retired** for the draft modes (Reply, Review).

**Revision lifecycle.** Each AI revision is a new card. Only the **newest** card is full-size and editable; **older revisions collapse to a one-line chip** (`› v1 · superseded`) that can be expanded. This keeps the canvas from growing unbounded while preserving history. (Decision: "Collapse old, latest live.")

**Send behavior — confirm step.** Send is a two-tap commit: the first tap turns the button into **`Send to {student}?`** with confirm / cancel for ~3s; the second tap commits. On commit the card **locks to a receipt** — `✓ Sent to Maria · 2:14pm`, body no longer editable. This guards against misfiring student-facing messages. (Decision: "Confirm step," not one-tap, not undo-toast.)

### Composer
The bottom chat input on the Stage (ChatGPT's "Ask anything"). Joshua types **instructions** here ("be warmer," "shorten Monday"); the assistant responds, producing a new plain message or a new Draft Bubble. The Composer is for talking to the assistant, never the thing that sends to a student.

### Ask for Changes
The floating toolbar (ChatGPT's "Ask for changes ⌘K") that appears when Joshua selects text inside a Draft Bubble in Edit. It offers AI revision of the selection plus light formatting (link, bold, italic). A selection-scoped refine, distinct from the Composer's whole-message instructions.

**Built (`DraftEditor.tsx`).** The draft body is a plain-markdown textarea (drafts stay markdown end to end; no WYSIWYG / HTML round-trip). Selecting text pops the toolbar near the selection: **Bold / Italic** wrap the selection with markdown markers, **Link** wraps it as `[sel](url)`, and **Ask for changes ⌘K** opens an instruction input. The instruction + the selected fragment go to the `polish-message` edge function in **instruction mode** (a `instruction` param that branches to a revise prompt, returning only the revised fragment, no tools), and the result is spliced back over the selection. AI revise is disabled in local preview (unauthenticated); formatting still works there.

### Controls Cluster
The right-side region labeled CONTROLS. **Mode-conditional**: it only carries a commit action in **Assign mode**. In Reply and Review mode the commit action lives on the Draft Bubble's **Send**, so the Controls Cluster holds no commit button there (only secondary controls like Open drafts / Pin, if any). In Assign mode it holds the **Commit Button** (see below).

This is the resolution of the per-mode commit question (Region 9): student-facing **text** commits from the bubble; an **assignment** commits from a button.

### Commit Button
The primary commit action **in Assign mode only**. Its label states the real consequence — **Assign drill** (or the specific activity) — never a generic "Approve." It exists because Assign mode produces a *recommendation to assign a drill/activity*, not a paragraph of prose to wordsmith, so a Draft Bubble is the wrong shape: there is nothing to rich-text-edit and Send. Assign mode instead surfaces the recommended drill and commits it with this button.

In Reply and Review mode there is **no Commit Button** — Send on the Draft Bubble is the one and only commit. (This retires the old single always-present right-panel commit affordance.)

### Context Cluster
The right-side region labeled CONTEXT: the Student / Source toggle and the read-only facts about whichever is selected (e.g. student name, completion).
