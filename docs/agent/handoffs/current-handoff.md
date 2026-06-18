# Current Handoff

This is the live transfer between Joshua, Claude Code, and Codex.

## From

Codex + Joshua

## To

Claude Code

## Task

Teacher Desk visual/product inspection before the next edit pass.

## Route Or Surface

`http://localhost:8080/teacher`

This is the current local Teacher Desk implementation. It is the daily Teacher Workspace start page, not the full AI Teaching Assistant buildout.

## What Joshua Is Trying To Do

Joshua wants the old Teacher Workspace to stop feeling chaotic. The previous workspace felt overloaded because many things were competing at the same level: conversations, drafts, uploads, schedule, student watchlist, insights, command panels, assistant panels, and general navigation.

The chosen product direction is a focused Teacher Desk / Today page. It should help Joshua open the workspace and immediately know what teacher move comes next.

The final Today model is intentionally simple:

- Reply
- Review
- Assign

Everything else is supporting context.

## Decisions Already Made

- User-facing language should avoid `queue`; use task/task-list language.
- Top-level Teacher Workspace IA is `Today`, `Students`, `Assign`, `Teach`, `Admin`.
- Today contains only `Reply`, `Review`, and `Assign` as main task modes.
- Schedule is only a small `Next session` cue.
- Watchlist is not a standalone category. If a student needs attention, that should become a Reply, Review, or Assign task.
- Drafts belong in Review.
- Later-today information is quiet context, not a full section.
- The AI Teaching Assistant is a separate larger project. It can appear as supporting UI, but do not turn this task into the assistant memory/autonomy buildout.

## Visual Direction

Joshua selected a specific graphite instrument-panel reference as the visual model:

`/Users/joshuaf/Desktop/ui inspo/bb4ad2d81d4da4378dc4e497fb953d98.jpg`

Use it as a concrete UI reference, not a loose mood board.

Borrow:

- pale graphite canvas
- faint technical grid
- thin black linework
- compact left-side tools
- central wireframe/cube-inspired focal element
- restrained right-side controls
- small labels
- strong black selected state
- quiet futuristic precision
- almost no color

Avoid:

- dark sci-fi dashboard styling
- generic SaaS cards
- purple gradients
- fake analytics blocks
- noisy glass/glow effects
- huge dashboard sections
- decorative motion that does not improve workflow

## Current Goal

Do not redesign from scratch.

Inspect the current Soft Graphite Teacher Desk implementation and determine what still prevents it from feeling finished, premium, and useful.

Primary success test:

Joshua opens Today and understands the next three teacher actions in under 10 seconds.

The page should answer:

- what do I need to reply to?
- what do I need to review?
- what do I need to assign?

## Files To Inspect

Core implementation:

- `src/pages/teacher/desk/TeacherDeskPreview.tsx`
- `src/pages/teacher/desk/ModeList.tsx`
- `src/pages/teacher/desk/WorkSurface.tsx`
- `src/pages/teacher/desk/ActionContextPanel.tsx`
- `src/pages/teacher/desk/AssistantCommandLine.tsx`
- `src/pages/teacher/desk/DeskCube.tsx`
- `src/pages/teacher/desk/types.ts`
- `src/pages/teacher/desk/taskAdapters.ts`

Product/design references:

- `src/pages/teacher/CONTEXT.md`
- `docs/superpowers/specs/2026-06-16-teacher-workspace-redesign-design.md`
- `docs/superpowers/specs/2026-06-17-teacher-desk-page-audit.md`

## Current Known State

Codex previously fixed local `/teacher` access so the page can be inspected without the old Premium Content Locked blocker.

Recent pushed commit:

- `8dc92f90 fix: polish teacher desk preview`

Previous verification reported:

- desktop render checked at `1440x1000`
- mobile render checked at `390x844`
- no Premium Content Locked in local preview
- no `/auth` redirect in local preview
- no visible raw asterisks in inspected rendered text
- targeted ESLint passed
- typecheck passed
- production build passed with existing repo warnings

Verify the live page again instead of treating this as guaranteed current truth.

## Inspect For These Problems

- Does the page still feel too crowded or does it now feel too empty?
- Does it clearly show Reply, Review, Assign as the only main Today modes?
- Does any old category model leak back in: watchlist, schedule-heavy layout, drafts as separate mode, analytics block?
- Does the central cube help the workspace identity, or does it distract from the selected task?
- Is the selected task/work surface easy to understand?
- Are right-side controls useful and specific?
- Does the assistant line feel usable, secondary, or broken?
- Does mobile allow the full workflow surface to be reached?
- Are there raw markdown artifacts in visible text: `*`, `**`, `#`, backticks, markdown bullets?
- Is any copy too explanatory, demo-like, or product-tour-like?
- Do labels such as `Forms`, `Tools`, `Top 3`, or old queue language still need replacement?

## Exact Next Instruction For Claude

Inspect the route visually and technically. Do not implement yet.

Return a report with:

1. Overall visual read.
2. Whether the product workflow is clear.
3. Mismatches against the graphite reference image.
4. Mismatches against the approved Teacher Desk spec.
5. Prioritized fixes.
6. Files/components likely involved.
7. What Codex should verify next with browser screenshots, lint, typecheck, or build.

After Claude sends the report, Joshua plans to send it to Codex for examination before the next implementation pass.

## Do Not Touch

- Do not broaden Today beyond Reply, Review, Assign.
- Do not redesign the whole Teacher Workspace IA.
- Do not build the full AI Teaching Assistant memory/autonomy system in this task.
- Do not reintroduce queue language as the user-facing model.
- Do not add fake analytics or fake production data.
- Do not weaken production route security.
- Do not edit unrelated teacher subroutes unless the inspection proves they are directly involved.
