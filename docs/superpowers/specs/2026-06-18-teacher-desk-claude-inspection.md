# Teacher Desk — Claude Second-Pass Inspection

Date: 2026-06-18
Inspector: Claude (handoff from Codex + Joshua)
Route: `http://localhost:8080/teacher`
Method: static source inspection of the live route + components. Did not start a browser; findings are code-level and should be confirmed with screenshots where noted.

## 0. Handoff accuracy note

The handoff's "Important Files To Inspect" list is stale. `types.ts` and `taskAdapters.ts` do not exist. The real desk lives in `src/pages/teacher/desk/`:
`TeacherDeskPreview.tsx`, `ModeList.tsx`, `WorkSurface.tsx`, `ActionContextPanel.tsx`, `AssistantCommandLine.tsx`, `DeskCube.tsx`, `GlobalRail.tsx`, `deskTasks.ts`, `useNextSession.ts`. Types and task adapters all live in `deskTasks.ts`.

Most of the 2026-06-17 audit's ten problems are already fixed in the current code (local preview mode, mobile scroll via `min-h-screen` + `lg:h-screen`, short empty copy, "Workspace"/"Next" relabels, `stripMarkdown`). This pass focuses on what is still open and on new issues the audit predates.

## 1. Current visual read

Reads as the intended Soft Graphite instrument panel: pale `#c3cace` canvas, perspective floor grid, three-column `300px / 1fr / 320px` desktop layout, thin-line wireframe cube as the focal element, strong black selected state on modes and tasks. The grammar matches the reference. The remaining gap is that several surfaces are inert placeholders, which keeps it reading as a prototype rather than a finished desk (see 4 and 5).

## 2. Product read — does Today answer "reply / review / assign?"

Mostly yes. The Tools list shows the three modes with live counts and an urgency dot; "Next" shows the top-3 ranked tasks; selecting one drives the center work surface and the right controls. The 10-second success test is achievable in the authenticated path. Two things weaken it: the primary CTA is dead in the most common inspection state (5d), and 3 of the 4 right-panel context tabs are explanatory prose, not data (5a).

## 3. Mismatches against the graphite reference

Minor. Decorative residue copied from the reference that adds no product value: the vertical "DESK" label in the right column footer (`TeacherDeskPreview.tsx:556`) and the `BrandMark` "LSAT U / Teacher Desk" box (`:566`). Both are pure reference mimicry and lean the page toward "design demo." Recommend dropping or demoting.

## 4. Mismatches against the approved spec

No category regressions. Reply/Review/Assign is preserved; no Watchlist, no Schedule section (only the `Next session` cue), no analytics dashboard block, no purple/dark styling. Guardrails are intact. The mismatches are quality/finish, not scope.

## 5. Concrete fix list (prioritized)

### P1 — real bug: Assign mode fires an erroring network call in local preview
`TeacherDeskPreview.tsx:204-216` — the materials effect calls `listGuidedDrills()` whenever `mode === 'assign'`, with no `localPreview` guard. On unauthenticated localhost (the inspection path), this hits Supabase, 401s, and pops a `toast.error('Could not load guided drills')`. That directly violates the "calm local preview, no error noise" goal. Guard the effect with `if (localPreview) return;` and seed `materials` with preview options (or hide the picker) in preview mode.

### P1 — structural: duplicate `/teacher` route + self-inconsistent "Today" nav
There are two `/teacher` routes. The standalone one at `App.tsx:263` renders `TeacherDeskPreview` bare (no `TeacherShell`). The `TeacherShell`-wrapped index at `App.tsx:340-351` also renders `TeacherDeskPreview`. React Router scores the static `/teacher` higher than the `/*` splat, so `/teacher` renders the bare desk while `/teacher/students`, `/teacher/desk-preview`, etc. render inside `TeacherShell`. Meanwhile `GlobalRail`'s active "Today" item points to `/teacher/desk-preview` (`deskTasks.ts:94`), not `/teacher`. Result: clicking the highlighted "Today" from the canonical desk navigates into a *different chrome* (shell-wrapped duplicate of the same desk). Two visually different "Today" surfaces for one concept.
Fix: pick one canonical Today route. Either point the rail's Today at `/teacher` and delete the `desk-preview` child route, or drop the standalone `:263` route and let the shell-wrapped index own `/teacher`. Confirm which chrome is intended (full-bleed desk vs. inside TeacherShell) before deleting.

### P2 — dead primary CTA in the inspected state
`primaryDisabled` is hard-`true` whenever `localPreview` (`:417-423`), so the big black "Send reply / Approve draft / Assign work" button is permanently greyed for anyone inspecting on localhost without login. Truthful, but it reads as a broken CTA. Options: show a small "Preview — actions disabled" caption next to the button in preview, or render the CTA as a non-button status chip in preview so it doesn't look like a dead control.

### P2 — right-panel context tabs are 3/4 placeholder prose
`ActionContextPanel.tsx` `ContextBody`: only the `student` tab shows real data. `history`, `analytics`, and `source` render explanatory paragraphs ("Analytics opens elsewhere. If it produces work needing judgment, it should arrive here as a Review task."). That is design-note copy in a control surface, and it's three of four tappable quadrants. This is the strongest remaining "demo-like" signal and brushes the "no actions users cannot perform" rule. Recommend: either wire these to real per-task data, or reduce the context grid to the tabs that carry real content (Student + Source) and drop History/Analytics until they have data.

### P3 — duplicated empty-state message
When a mode is empty the same string renders twice: `ModeList.tsx:79-80` (left rail) and `WorkSurface.tsx:38-41` (center), both showing `MODE_META[mode].empty` + "No current teacher move." Pick one home for it; the doubled message looks unfinished.

### P3 — empty right panel still a flat placeholder
`ActionContextPanel.tsx:45-51` no-task state is "No task selected / This panel opens when a teacher move is selected." Audit item 6 asked for quiet useful context here (next session cue, count summary). `nextSessionCue` already exists in the parent but isn't passed down. Low effort to make the empty panel carry the next-session line and per-mode counts.

### P3 — decorative residue
Drop or demote the vertical "DESK" label (`:556`) and the `BrandMark` box (`:566`). See section 3.

### P4 — assistant command line
`AssistantCommandLine.tsx` ships an honest disabled state ("Assistant is not connected to the desk yet"). Compliant with the no-fake rule, so not a bug. Decide whether a permanently-locked input belongs in the main composition or should be demoted to a thin status line until the assistant is wired. Low priority.

## 6. Files involved

- `src/App.tsx:263-269` and `:340-351` — duplicate `/teacher` routes (P1 structural)
- `src/pages/teacher/desk/TeacherDeskPreview.tsx:204-216` — preview Assign network call (P1 bug); `:417-423` — preview primary disable (P2); `:556`,`:566` — residue (P3)
- `src/pages/teacher/desk/deskTasks.ts:94` — Today rail path mismatch (P1 structural)
- `src/pages/teacher/desk/ActionContextPanel.tsx:45-51`,`119-172` — placeholder context tabs + empty panel (P2/P3)
- `src/pages/teacher/desk/ModeList.tsx:77-81` + `WorkSurface.tsx:36-43` — duplicated empty copy (P3)
- `src/pages/teacher/desk/AssistantCommandLine.tsx` — disabled assistant (P4)

## 7. For Codex to verify with screenshots/tests

1. Switch to Assign mode on local `/teacher` (unauthenticated) and confirm whether the "Could not load guided drills" toast fires. Expected: it currently does (P1 bug).
2. From the bare desk at `/teacher`, click the highlighted "Today" in the Workspace rail and confirm the chrome changes (lands on shell-wrapped `/teacher/desk-preview`). Expected: chrome changes (P1 structural).
3. Desktop `1440x1000`: confirm whether the center column still floats low with a large empty floor (audit item 3) now that work surface uses `lg:mt-auto` on the assistant line — verify the cube-to-work-surface gap visually.
4. Mobile `390x844`: scroll the full stack and confirm the work surface and assistant line are now reachable (audit item 2 should be resolved by `min-h-screen` + `lg:overflow-hidden`).
5. Confirm no raw markdown artifacts in any rendered task row after preview data is shown (`stripMarkdown` covers real data; preview strings in `PREVIEW_TASKS` are already plain).

## Scope note

Inspection only, no code changed. Recommend tackling the two P1 items first (both small) before any visual rebalancing, since the routing decision affects how the rail and chrome should behave.
