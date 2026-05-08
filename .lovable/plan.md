## Audit — what's wrong with `/teacher/*` today

I walked the workspace. The honest read:

**1. Sidebar is bloated and unranked.** 11 top-level tabs, all equal weight: Today, Students, AI Teaching Assistant, Weekly Plans, Schedule, Smartboard, Assignments, Bootcamps, Uploads, Recaps, Analytics Bridge. Half overlap (Weekly Plans vs Schedule, Assignments vs Recaps vs AI TA drafts). Nothing tells you what to do *first*. This is the main "low quality / over-saturated" feeling.

**2. The floating graduation-cap button (AdminChatHub).** It hovers over every page including `/teacher/*`. It duplicates what should be a single "Conversations" tab inside the workspace. Confusing and visually noisy. → **Remove.**

**3. AI TA page is a passive draft queue, not an operator.** It's a list of pending text blobs with a manual "New draft" form. You have to hand-write what you want. It doesn't *do* anything for you. This is what you want to flip.

**4. No single source of truth for "where is each student".** Today, Students, Recaps, Weekly Plans all show fragments of the same student state. Status lives in 4 places.

**5. Visual system is dim zinc-on-zinc with one amber accent.** Functional but flat — doesn't match the premium glass / bronze identity used in `/foyer`. Feels like an admin panel instead of *your* workspace.

**6. Mobile is an afterthought.** Sidebar collapses to a horizontal scroll strip — usable but not designed.

**7. No global command surface.** No ⌘K, no search across students/assignments/recaps. For an "operator" workspace this is the biggest miss.

## The fix — one premium hub, chat-first

```
┌─ Teacher Workspace ──────────────────── ⌘K ── back to Foyer ─┐
│                                                              │
│  Sidebar (5 items, ranked):                                  │
│    ▸ Assistant     ← default route, the operator chat        │
│    ▸ Students      ← roster + per-student drill-down         │
│    ▸ Conversations ← single tab for all student chats        │
│    ▸ Schedule      ← unified calendar (sessions + plans)     │
│    ▸ Library       ← Assignments + Recaps + Uploads + Boot.  │
│                                                              │
│  Header:                                                     │
│    Workspace name · ⌘K command bar · notifications · profile │
└──────────────────────────────────────────────────────────────┘
```

Eleven tabs → five. Everything else is reachable via the Assistant ("show me Maya's recaps"), Library tab subviews, or ⌘K.

## Detailed changes

### Removals
- **Delete** `<AdminChatHub />` mount from `App.tsx`. Floating button gone for admins.
- **Drop** standalone `Weekly Plans`, `Smartboard`, `Assignments`, `Bootcamps`, `Uploads`, `Recaps`, `Analytics Bridge` from the sidebar. The pages themselves stay (still routable) but they live under **Library** and **Schedule** subviews and the Assistant can deep-link to them.

### New: AI Teaching Assistant as the operator (default tab)
Same plan as before, with these confirmed answers carrying over (assumed defaults — say the word if you want different):

- `assign_homework` → assistant proposes question list, you approve before it sends
- `send_message` → posts directly into the existing 1:1 thread once you confirm in the action card
- Operator chat is **admin-only**

Components to add:
- `src/components/teacher/ai-ta/OperatorChat.tsx` — message list + streaming + action cards, uses `PromptInputBox`
- `src/components/teacher/ai-ta/ActionCard.tsx` — inline tool result (View / Approve / Undo)
- `src/hooks/useOperatorChat.ts` — SSE streaming + tool-event handling
- `supabase/functions/teacher-operator-chat/index.ts` — Lovable AI Gateway with tool calling: `find_students`, `create_draft`, `assign_homework`, `send_message`, `schedule_session`, `post_classroom_item`, `summarize_student`
- Tables `operator_conversations` + `operator_messages` (admin-only RLS) for persistent chat history

The current Drafts queue + `NewAIDraftCard` move to a secondary tab inside the Assistant view (`Chat | Drafts | History`) so nothing is lost.

### New: Conversations tab
- Route `/teacher/conversations`
- Renders the same thread list + view that `AdminChatHub` was floating, now full-page with proper layout
- One tab, no floater. Replaces three surfaces (floater, inbox, in-page hub).

### Schedule (unified)
- Route `/teacher/schedule`
- Single calendar showing booked sessions **and** weekly plan items
- Weekly Plans builder becomes a side panel inside Schedule, not its own tab

### Library (one tab, four subviews)
- `/teacher/library/assignments` (current `TeacherAssignments`)
- `/teacher/library/recaps` (current `TeacherRecaps`)
- `/teacher/library/uploads` (current `TeacherUploads`)
- `/teacher/library/bootcamps` (current `TeacherBootcamps`)
- Subnav inside Library; Smartboard becomes a launch button on the Assignments subview where it actually belongs

### ⌘K command palette
- New `src/components/teacher/CommandPalette.tsx` (uses `cmdk`, already in shadcn)
- Searches: students by name, assignments, recaps, recent conversations
- Actions: "Open Assistant", "New homework", "New recap", jump to any student
- Bound globally inside `TeacherShell`

### Visual upgrade
- Move from flat zinc-950 to the premium glass + bronze tokens from `index.css` already used on `/foyer`
- Sidebar becomes a thin glass rail with bronze active indicator
- Chat surface uses dark glass card matching `PromptInputBox`
- Markdown rendered via `react-markdown` (consistent with `TutorChatModal`)

### Mobile
- Sidebar collapses to a bottom tab bar (5 icons) with safe-area padding
- Operator chat keeps `PromptInputBox` sticky bottom, full-bleed messages

## Out of scope for this pass
- Migrating analytics into the Assistant (kept as a future "ask the assistant" capability)
- Voice mode in `PromptInputBox` (icon stays, no-op for now)
- Cross-cohort bulk operations beyond ~25 students at once

## Open call-outs
- I'll keep all old routes alive as redirects so existing bookmarks don't 404
- `Smartboard` is the one tool I'm not 100% sure where it belongs — putting it under Library/Assignments unless you want it surfaced higher