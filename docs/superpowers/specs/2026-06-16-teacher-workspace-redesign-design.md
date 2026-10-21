# Teacher Workspace Redesign Design Spec

Date: 2026-06-16
Status: Design approved for spec; implementation plan not started
Target preview route: `/teacher/desk-preview`

## Purpose

Redesign the Teacher Workspace into **Teacher Desk**: a calm, task-first daily operating surface for Joshua's teaching work.

Primary success test: Joshua opens Today and knows the next 3 things to do in under 10 seconds.

Secondary success tests:

- Joshua can complete one simple Reply, one simple Review, and one simple Assign task without leaving Today.
- The page feels like a premium tutoring operating desk, not a generic SaaS dashboard.
- The visual language closely follows the soft graphite instrument-panel reference: pale graphite canvas, faint grid, thin black linework, persistent cube, compact controls, strong black selected state, and restrained motion.

## Scope

This spec covers the **Teacher Desk / Today** redesign and its preview route.

In scope:

- New preview route at `/teacher/desk-preview`.
- Top-level teacher navigation model: Today, Students, Assign, Teach, Admin.
- Today task modes: Reply, Review, Assign.
- Task stack behavior, selected task work surface, right-side action/context panel, assistant command line, and supporting context rules.
- Real-data-first behavior using existing app signals where available.
- AI suggestions only where existing infrastructure can truthfully support them.

Out of scope:

- Replacing `/teacher` before Joshua explicitly approves the preview.
- Full AI Teaching Assistant memory/personality buildout.
- Full analytics dashboards.
- Full conversation, assignment, file, transcript, or student-detail builders inside Today.
- Destructive actions from Today.
- Fake data, fake analytics, or fake AI suggestions in shipped UI.

## Product Model

Teacher Desk is not a dashboard. It is a focused command surface for the next teacher actions.

Today has only three main modes:

- **Reply**: student messages requiring Joshua's response.
- **Review**: approval or judgment work, including assistant drafts, uploads, transcript recaps, and student work requiring approval.
- **Assign**: suggested next assignments and quick manual assignment.

Everything else is context:

- Schedule appears only as a tiny `Next session` cue.
- Watchlist does not exist as a category. A student needing attention becomes a Reply, Review, or Assign task.
- Drafts belong inside Review.
- Analytics appears only through compact right-side context, not as a default page module.
- Later-today information is quiet footer/context, not a section.

## Information Architecture

The persistent global rail stays visible:

```text
Today
Students
Assign
Teach
Admin
```

Inside Today, a slimmer internal tool list holds:

```text
Reply   3
Review  5
Assign  2
```

Counts are small and quiet. Urgent cross-mode work can show a tiny marker, but it does not automatically change the selected task or hijack the layout.

Each mode has a simple `View all` path:

- `View all Reply`
- `View all Review`
- `View all Assign`

The full list page uses the same soft graphite visual language and dense rows, but it does not need the central cube.

## Layout Anatomy

Desktop is the primary design target. Mobile only needs a clean fallback in v1.

```text
+----------------+---------------------------+--------------------------------+---------------------------+
| Global Rail    | Today Modes + Top 3 Tasks | Cube + Selected Work Surface   | Actions + Compact Context |
|                |                           |                                |                           |
| LSAT U         | Modes                     | Top metadata line              | Primary action            |
| Today          | - Reply 3                 | Persistent wireframe cube      | Secondary actions         |
| Students       | - Review 5                | Selected task title            | Context toggles           |
| Assign         | - Assign 2                | Student/context                | - Student                 |
| Teach          |                           | 2-3 line preview               | - History                 |
| Admin          | Top 3 task rows           | Light editor or picker         | - Analytics               |
|                | View all mode             | Assistant command line         | - Source                  |
+----------------+---------------------------+--------------------------------+---------------------------+
```

The central cube is persistent. It should be a real visual identity element, not a temporary decoration. It lightly communicates state through small changes such as a highlighted edge, small node, or orbit tick for selected mode, urgency, or completion. It must not become loud, colorful, or distracting.

The selected task work surface sits below or around the cube. It should not cover the cube or turn into a conventional dashboard card.

## Visual Direction

Use the soft graphite instrument-panel reference as the controlling visual direction.

Required qualities:

- Pale gray or blue-gray canvas.
- Faint technical grid.
- Thin black linework.
- Strong black selected state.
- Minimal icons for global nav, modes, and core controls.
- Small labels and compact typography.
- Small LSAT U / Teacher Desk mark.
- Top metadata line with date, workspace label, and optional next-session cue.
- Almost no color. One tiny amber or blue signal is allowed for urgency/status.

Avoid:

- Dark sci-fi dashboards.
- Purple gradients.
- Noisy glassmorphism.
- Oversized hero sections.
- Card-heavy SaaS grids.
- Decorative motion that does not help the work.
- Overly low-contrast text or tiny unreadable controls.

## Task Stack

Each selected mode shows 3 visible tasks.

Rows are dense, technical, and verb-first:

```text
Reply  | Meghan Mullins | Asked about contrapositives | 12m waiting
Review | Dakota Brown   | Upload received             | Today
Assign | Lydia Chen     | Next LR drill suggested      | Before 4:30
```

Row priorities:

1. Action verb.
2. Student or object.
3. Reason.
4. Plain timing/status label.

Rows should not show content previews. The selected task surface shows the preview.

Task ranking uses:

- Urgency.
- Student impact.
- Due time.
- Pending age.

Manual control:

- Joshua can pin a task into the top 3.
- No hide behavior in v1.
- `Defer` can move a task out of the immediate stack when appropriate.

Completion behavior:

- Complete, send, approve, assign, or mark done removes the task from the immediate stack.
- The next ranked task slides in.
- The selected task updates to the next best task in the current mode.
- No visible done counter or gamified completion state.

## Selected Task Work Surface

The selected task is a compact work surface, not just a description.

Shared hierarchy:

1. Action/title.
2. Student/context.
3. Plain source/reason label.
4. Two- to three-line content preview.
5. Light work controls.

Plain labels include:

- `Unread message`
- `Draft waiting`
- `Upload received`
- `Transcript ready`
- `Assignment suggested`

Do not expose system codes such as `MSG_UNREAD` or `DRAFT_PENDING`.

## Mode Details

### Reply

Scope: student messages only for v1.

Selected Reply task supports:

- Short message preview.
- Small inline text area for draft editing.
- Primary action: `Send reply` or `Approve reply`, depending on whether a draft exists.
- Secondary actions: `Open conversation`, `Ask assistant`, `Defer`.

Parent, admin, business, and generic inbox replies are out of scope for Reply v1.

### Review

Scope: approval and judgment work.

Included in the single Review stack:

- Assistant drafts.
- Uploaded student work.
- Transcript recaps.
- Student work requiring approval.
- Assignment drafts before sending, if they require Joshua's approval.

Review does not have subfilters in v1.

Selected Review task supports:

- Short source or draft preview.
- Small inline editor for draft/recap text.
- Uploads and student work can show summary and approve/mark-reviewed controls; full inspection opens source/detail.
- Primary actions: `Approve draft`, `Approve recap`, or `Mark reviewed`.
- Secondary actions: `Open source`, `Needs edit`, `Defer`.

Analytics concerns do not enter Review by themselves. If analytics produces a draft/action that needs approval, that item can enter Review.

### Assign

Scope: system-suggested next assignments and quick manual assignment.

Selected Assign task supports:

- Suggested material shown first.
- Compact material picker for switching the assignment.
- Inline due-date edit.
- Primary action: `Assign work`.
- Secondary actions: `Open Assign`, `Open student`, `Defer`.

The full assignment builder remains in the Assign section. Today only handles fast, common assignment decisions.

## Right Action And Context Panel

The right panel defaults to actions first.

Primary actions use direct teacher verbs:

- `Send reply`
- `Approve draft`
- `Approve recap`
- `Assign work`
- `Mark done`

Secondary actions include:

- `Edit`
- `Open student`
- `Open source`
- `Open conversation`
- `Open Assign`
- `Defer`

Compact context toggles:

- `Student`
- `History`
- `Analytics`
- `Source`

Only one context view opens at a time. Context opens inside the right panel and must not bury the main action controls. Larger inspection uses the relevant detail page.

No destructive actions are available on Today.

## Assistant Command Line

Today includes a quiet assistant command line under the selected task, bottom center.

Behavior:

- Default scope: `Task`.
- Optional scope: `Workspace`.
- Scope is shown with a compact `Task / Workspace` toggle.
- Task scope helps with the selected task.
- Workspace scope can answer broader questions such as what to handle next.

The command line is functional only if existing assistant plumbing supports it. If not, show a truthful disabled or empty state. It must not fake replies, fake suggestions, or fake memory.

The full AI Teaching Assistant remains a separate deeper surface.

## Data Requirements

The preview route is real-data-first.

Phase 1 task inputs may include existing app signals for:

- Student messages.
- Assistant drafts.
- Uploads.
- Assignment drafts or assignment needs.
- Student progress where already available.
- Session transcripts or recaps where already available.

AI-generated suggestions are allowed only if existing infrastructure can truthfully produce them from real signals. They must be approval-gated.

AI-suggested tasks appear in the same task stack as ordinary tasks and use the same ranking. They are lightly marked:

- Row label: `Suggested`.
- Selected task label: `Suggested by assistant` or `Suggested from progress`.

There is no separate AI suggestions section.

If a signal is not connected yet, the UI shows a truthful empty or not-connected state. Shipped UI must not contain fake sample tasks.

## Empty, Loading, Error, And Interaction States

Core states are part of v1.

Selected state:

- Strong black state for selected global rail item, selected Today mode, and selected task row.

Hover state:

- Subtle line or background change.
- No large motion.

Loading state:

- Quiet skeleton or technical loading line.
- No fake task content.

Empty states:

- `No replies waiting`
- `No reviews waiting`
- `No assignments suggested`

Each empty state may include one useful action, such as `Open students` or `Create assignment`.

Error/retry state:

- Plain error message and retry control.
- Preserve the rest of the page layout where possible.

Disabled state:

- Used for unsupported assistant command behavior or unavailable actions.
- Must explain truthfully why the action is unavailable.

Completion state:

- Brief saved/sent/approved feedback.
- Then the next ranked task enters the stack.

## Session Behavior

Fresh session:

- Open the mode with the highest-priority task.

Same-session return:

- Remember Joshua's last selected mode.

Urgent cross-mode task:

- Show a quiet marker on the affected mode.
- Do not force focus.
- Do not reorder the current selected task unless Joshua switches modes or completes the current task.

## Preview And Promotion

Build the redesign first at `/teacher/desk-preview`.

Rules:

- Existing `/teacher` stays intact during preview.
- The preview must stay under the same provider assumptions as the current teacher tree, including preserving `QuestionBankProvider` coverage for Guided Drills and question-bank wiring.
- Joshua reviews the preview in app.
- Replacing `/teacher` requires Joshua's explicit approval.

## Phasing

### Phase 1: Real-Data Teacher Desk Preview

Build `/teacher/desk-preview` with:

- Soft graphite instrument-panel layout.
- Persistent global rail.
- Today internal mode tool list.
- Top 3 ranked tasks for Reply, Review, Assign.
- Selected task work surface.
- Right action/context panel.
- Assistant command line if supported, otherwise truthful disabled state.
- Real app signals where available.
- Empty/not-connected states where data is not available.

### Phase 2: AI Suggestions And Assistant Depth

Deepen:

- AI-generated suggestions.
- Assistant memory and Teaching Profile behavior.
- Workspace-level summarization.
- More advanced transcript-to-recap-to-assignment flow.
- Stronger student-context reasoning.

Phase 2 does not block Phase 1 preview.

## Anti-Patterns

Do not build:

- Dashboard clutter.
- Fake analytics.
- Fake task data.
- Fake AI suggestions.
- Watchlist as a category.
- Schedule-heavy layout.
- Drafts as a separate main category.
- Giant AI chat panel.
- Card-heavy SaaS grid.
- Dark sci-fi panels.
- Purple gradients.
- Decorative animation with no work purpose.
- Destructive actions on Today.
- Mixed all-task dashboard that ignores Reply, Review, Assign modes.

## Implementation Planning Notes

When implementation planning starts, inspect the current teacher route structure and data hooks before choosing component boundaries. The design should preserve existing behavior and providers, especially the `/teacher` subtree's dependency on `QuestionBankProvider`.

Likely implementation units:

- `TeacherDeskPreview` route/page.
- Global rail shell reuse or adaptation.
- Today mode selector.
- Ranked task stack.
- Selected task work surface.
- Right action/context panel.
- Assistant command line shell.
- Task data adapter that normalizes existing app signals into Reply, Review, and Assign task objects.

Testing should focus on:

- Route loads without breaking existing `/teacher`.
- Existing `/teacher` remains available.
- Empty states render truthfully when no data exists.
- Top 3 task selection does not show more than 3 visible tasks per mode.
- Selecting/completing a task updates the stack predictably.
- No unsupported assistant or AI suggestion appears as functional.
