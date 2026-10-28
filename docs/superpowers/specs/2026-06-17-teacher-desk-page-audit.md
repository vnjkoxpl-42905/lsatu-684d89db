# Teacher Desk Page Audit

Date: 2026-06-17
Route inspected: `http://localhost:8080/teacher`

## Purpose

This audit covers the current Soft Graphite Teacher Desk implementation before the next fix pass. The goal is not to redesign from scratch. The goal is to make the current direction usable, clean, and finished: a minimal teacher operating desk centered on Reply, Review, and Assign.

## Current Render

Desktop renders the Soft Graphite visual language: pale graphite canvas, faint floor grid, left tools, central cube, right controls, bottom assistant line.

Mobile renders the same surface but clips critical content. The work surface and assistant line are not reachable in the visible page because the root is locked to `h-screen overflow-hidden`.

Local unauthenticated preview now reaches the page, but teacher data requests still fail with 401/permission errors. That leaves the left task list in a misleading "Loading tasks" state.

## High-Priority Problems

1. Local preview data failure is not handled cleanly.

   Evidence: fresh local render logs repeated 401 errors from `useHubStudents` and `admin-manage-users`. The UI keeps showing "Loading tasks" even though the load has effectively failed. This makes the page feel broken and unfinished.

   Required fix: when local dev is unauthenticated, stop showing indefinite loading. Show a calm local preview state or a truthful "Preview mode" state with sample task rows. Do not expose console error noise as the primary user experience.

2. Mobile layout is clipped.

   Evidence: at 390px wide, the page shows header, forms, tools, partial "Top 3", cube, and controls. The work surface and assistant command line are not reachable.

   Required fix: mobile must use normal document scrolling or a dedicated stacked layout. Do not use a viewport-locked layout that hides main work areas.

3. Too much empty space on desktop.

   Evidence: desktop shows a large central blank floor. The cube is visually clear, but the actual work area is small and floats too low relative to available space.

   Required fix: make the center column feel like a usable desk: tighter vertical rhythm, selected task/work surface closer to the cube, and right controls aligned to meaningful content rather than floating in empty space.

4. Empty state copy is too explanatory.

   Evidence: "The desk is clear for this mode. Switch modes from the Tools list, or open the full surface to inspect more." reads like a product demo note, not a premium workspace.

   Required fix: replace explanatory copy with short operational copy. The UI should not explain how to use itself unless necessary.

5. "Loading tasks" is visually treated as a task.

   Evidence: the left "Top 3" section shows a bordered row with spinner and "Loading tasks" long after data has failed.

   Required fix: distinguish loading, error, empty, and preview states. The left rail should never imply a real task exists when it does not.

6. Right controls panel feels dead when no task is selected.

   Evidence: the panel contains only "Select a task to show controls." with no useful fallback.

   Required fix: when no task exists, the right panel should provide quiet context for the current mode: next session, full surface link, or preview/data status. It should not be an empty placeholder.

7. Bottom assistant line is not usable yet.

   Evidence: it is disabled and says "Assistant command line. Select a task first." On desktop it sits at the bottom edge; on mobile it is clipped away.

   Required fix: either make it clearly secondary and reachable, or remove it from the main composition until there is a real assistant interaction. It must not feel like a broken input.

8. Terminology still has old demo residue.

   Evidence: "Forms", "Tools", "Top 3", "DESK", and some all-caps labels are copied from the visual reference but are not all product-clear.

   Required fix: keep the visual grammar, but tune the language for a teacher workflow. "Tools" can stay if it refers to Reply/Review/Assign. "Forms" should probably become the compact top navigation without a label, or "Workspace". "Top 3" should become "Next" or "Current".

9. Asterisk/markdown artifacts must not appear in visible copy.

   Evidence: no visible asterisks appeared in the inspected empty state, but `stripMarkdown` exists because upstream task text can contain markdown. We need to preserve this invariant and scan rendered task rows after adding preview data.

   Required fix: task titles, previews, and assistant/draft text shown on this page must be plain text. No `*`, `**`, markdown bullets, raw hashes, or raw backticks in visible task rows.

10. The page is not yet a finished "teacher workspace" experience.

   Evidence: it currently works as a visual prototype, but with no data it becomes a quiet skeleton. A premium desk should still communicate structure and affordances in preview/local mode.

   Required fix: add a polished local preview mode and ensure authenticated data mode remains truthful.

## Fix Strategy

### Phase 1: Make The Page Stable

- Add a local preview/data mode for unauthenticated localhost so the page can be inspected without Supabase admin data.
- Stop indefinite loading when admin data fails.
- Suppress repeated user-facing error states in local preview, while keeping production/authenticated errors truthful.
- Ensure the rendered page has no visible markdown artifacts.

### Phase 2: Fix Layout And Responsiveness

- Replace `h-screen overflow-hidden` with a layout that allows mobile and small desktop scrolling.
- Keep desktop full-viewport composition only when content fits.
- Rebalance center content: cube, selected task surface, and assistant line should occupy a clear vertical stack.
- Make the right panel useful in empty and preview states.

### Phase 3: Tighten UX Copy

- Shorten empty state language.
- Replace demo labels that do not help the teacher workflow.
- Keep Reply, Review, Assign as the only main modes.
- Keep Schedule and Watchlist out of main navigation.

### Phase 4: Verify Like A Product Surface

- Desktop screenshot at 1440x1000.
- Mobile screenshot at 390x844.
- Check no horizontal overflow.
- Check no clipped core sections.
- Check no Premium Content Locked.
- Check no `/auth` redirect on local `/teacher`.
- Check no visible markdown asterisks or raw markdown symbols in page text.
- Run targeted lint/typecheck and production build.

## Acceptance Criteria

- `http://localhost:8080/teacher` renders the Teacher Desk in local preview without premium lock.
- The page does not stay stuck on "Loading tasks" when data is unavailable.
- Desktop has visible left modes, central cube, selected/empty work surface, right context, and assistant area without awkward clipping.
- Mobile can reach the full workflow surface by scrolling.
- Visible labels are polished and teacher-oriented.
- No visible raw markdown artifacts appear in the inspected surface.
- Console may still show expected unauthenticated network denials only if the UI is intentionally in local preview mode, but the page must not look broken.

## Implementation Notes

- Keep the route security model intact for production.
- Do not fake production analytics.
- Local preview data is acceptable only under Vite dev on localhost.
- Do not broaden the workspace back into many categories. The main model remains Reply, Review, Assign.
- Avoid large unrelated refactors of the teacher subroutes.
