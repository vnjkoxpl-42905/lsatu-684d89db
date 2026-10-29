# Click-to-Agent Handoff

- Created: 2026-06-18T01:46:53Z
- Target agent: Claude
- From: Codex + Joshua
- Active file: `/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU/docs/superpowers/specs/2026-06-17-teacher-desk-page-audit.md`
- Route to inspect: `http://localhost:8080/teacher`
- Related design spec: `docs/superpowers/specs/2026-06-16-teacher-workspace-redesign-design.md`
- Current audit: `docs/superpowers/specs/2026-06-17-teacher-desk-page-audit.md`
- Product glossary: `src/pages/teacher/CONTEXT.md`
- Visual reference image: `/Users/joshuaf/Desktop/ui inspo/bb4ad2d81d4da4378dc4e497fb953d98.jpg`

## Instruction For Claude Code

Inspect the current Teacher Desk page visually and technically. Do not redesign it from scratch and do not implement changes yet unless Joshua explicitly asks. Your job is to audit the current page against the already-approved direction, then send your findings back for Codex/Joshua review.

The expected output is a clear inspection report, not a code change:

- what currently matches the approved Teacher Desk direction
- what is visually or functionally wrong
- what is still too crowded, unclear, clipped, fake, or demo-like
- exact files/components likely responsible
- screenshots or viewport notes if useful
- a prioritized fix plan that preserves the approved direction

## What Joshua Did

Joshua started with a chaotic Teacher Workspace that felt like too many pages, tabs, panels, queues, watchlists, schedule blocks, draft areas, and dashboard pieces fighting at the same level.

Through interview and design clarification, Joshua made these product decisions:

- Rename the daily command surface to `Teacher Desk` / `Today`.
- Do not use the word `queue` in the user-facing model. Use task language instead.
- Keep top-level Teacher Workspace navigation simple: `Today`, `Students`, `Assign`, `Teach`, `Admin`.
- Inside Today, use only three task modes: `Reply`, `Review`, and `Assign`.
- Move everything else into supporting context instead of main navigation.
- Schedule appears only as a small `Next session` cue.
- Watchlist disappears as a category. A student needing attention becomes a Reply, Review, or Assign task.
- Drafts belong inside Review.
- Later today is quiet footer/context, not a full section.
- AI Teaching Assistant is related but separate. Do not accidentally turn this task into the full assistant memory/autonomy project.

Joshua then chose a specific visual direction from the graphite instrument-panel reference image:

- pale graphite canvas
- faint technical grid
- thin black linework
- compact left tool stack
- central wireframe/cube-inspired focal element
- restrained right controls
- strong black selected state
- quiet futuristic precision
- almost no color

The current implementation is the first real pass at that direction, now mounted at `http://localhost:8080/teacher`.

## Goal Of The Current Task

The goal is not to invent a new Teacher Workspace concept.

The goal is to finish the current Soft Graphite Teacher Desk direction so it becomes a usable premium tutoring operating desk centered on:

1. Reply
2. Review
3. Assign

Primary success test:

Joshua opens Today and knows the next three things to do in under 10 seconds.

Secondary success tests:

- The page feels calm, precise, and high-end, not like a generic SaaS dashboard.
- It does not show fake analytics or fake dashboard clutter.
- It does not bring back many categories at the same level.
- It does not feel like a design demo where the visual reference is copied but the product task is unclear.
- It works on desktop and has a reachable mobile layout.
- It has no visible markdown artifacts such as raw `*`, `**`, hashes, or backticks in task text.

## Guardrails

Do not broaden the Today model beyond Reply, Review, Assign.

Do not reintroduce:

- Watchlist as a standalone surface
- Schedule as a large section
- Drafts as a top-level mode
- Analytics as a dashboard block
- many equal category lists
- dark sci-fi dashboard styling
- purple gradients
- card-heavy SaaS layout
- generic stat panels
- fake data in shipped production behavior

Do preserve:

- the soft graphite visual language
- the central wireframe/cube identity
- the compact left tool stack
- the right-side action/context panel
- task-first workflow
- production route security
- local preview behavior only for localhost/dev
- real data first where available

## What Has Already Been Fixed

Codex already made the local `/teacher` route reachable for inspection without hitting the old Premium Content Locked blocker.

The current page has also already been checked for:

- desktop render at `1440x1000`
- mobile render at `390x844`
- no premium lock
- no `/auth` redirect in local preview
- no visible asterisks in the inspected rendered text
- targeted ESLint passing
- typecheck passing
- production build passing with existing repo warnings

Recent pushed commit:

- `8dc92f90 fix: polish teacher desk preview`

## Current Known Issues To Re-Inspect

Use the audit file as the baseline, but verify against the live page instead of trusting it blindly.

Known issues from the audit:

1. Local preview/data failure can feel misleading if the UI shows loading as if it is a task.
2. Mobile can clip core content if the viewport/root layout is too locked.
3. Desktop may still have too much empty space around the central work area.
4. Empty state copy can sound too explanatory or demo-like.
5. The right controls panel can feel dead when there is no selected task.
6. The bottom assistant line may feel disabled or unfinished.
7. Some labels may still be copied from the visual reference instead of teacher workflow language.
8. Task text must stay plain text with no raw markdown artifacts.
9. The page must feel like a finished teacher workspace, not only a visual prototype.

## Important Files To Inspect

- `src/pages/teacher/desk/TeacherDeskPreview.tsx`
- `src/pages/teacher/desk/ModeList.tsx`
- `src/pages/teacher/desk/WorkSurface.tsx`
- `src/pages/teacher/desk/ActionContextPanel.tsx`
- `src/pages/teacher/desk/AssistantCommandLine.tsx`
- `src/pages/teacher/desk/DeskCube.tsx`
- `src/pages/teacher/desk/types.ts`
- `src/pages/teacher/desk/taskAdapters.ts`
- `src/pages/teacher/CONTEXT.md`
- `docs/superpowers/specs/2026-06-16-teacher-workspace-redesign-design.md`
- `docs/superpowers/specs/2026-06-17-teacher-desk-page-audit.md`

## Requested Claude Output

Send back a compact but thorough report with:

1. Current visual read: what the page feels like right now.
2. Product read: whether Today clearly answers "what do I need to reply to, review, or assign?"
3. Mismatches against the graphite reference image.
4. Mismatches against the approved Teacher Desk spec.
5. Concrete fix list, prioritized.
6. Exact files/components likely involved.
7. Any issues Codex should verify with browser screenshots or tests.

Do not start broad implementation. Do not change the full inspection plan. The purpose is to give Codex/Joshua a second inspection pass that can be reviewed before the next edits.
