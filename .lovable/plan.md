## Problem

Clicking lesson 1.1 (or any lesson row) inside the Main Conclusion bootcamp navigates to `/lessons/1.1`, which hits the global 404 page. Same bug exists in the command palette (Cmd-K) lesson entries.

## Root cause

The bootcamp is mounted at `/bootcamp/structure/*` in `src/App.tsx`. Internally it tracks unlock state using **logical route IDs** like `/lessons/1.1` (see `lib/ordering.ts`, `useModuleProgress.unlocked_routes`). Two render sites mistakenly pass that logical ID directly to `<Link to>`/`href`, instead of prefixing it with `/bootcamp/structure`. React Router treats it as an absolute path → top-level 404.

The sidebar (`LeftRail.tsx`), `ModuleIndex.tsx`, and most other internal links are already correct (they use `/bootcamp/structure/...` or relative paths). Only two files are wrong, plus one helper that builds a recommendation `href`.

## Fix (3 small edits, no logic changes)

1. **`src/bootcamps/main-conclusion/modules/lessons/LessonsIndex.tsx`**
   - Line 31: change `to={`/lessons/${l.number}`}` → `to={`/bootcamp/structure/lessons/${l.number}`}`.
   - Keep line 27 unchanged (`unlocked_routes` stores the logical `/lessons/...` ID — that's correct).

2. **`src/bootcamps/main-conclusion/components/command-palette/CommandPalette.tsx`** (line 44)
   - Change `href: `/lessons/${l.number}`` → `href: `/bootcamp/structure/lessons/${l.number}``.
   - (Verify the palette's navigation handler does `navigate(href)` — if it does, this is the only change needed.)

3. **`src/bootcamps/main-conclusion/lib/diagnostics.ts`** (line 122)
   - Change `href: '/lessons/1.13'` → `href: '/bootcamp/structure/lessons/1.13'` so the "go to capstone" recommendation routes correctly.

## Out of scope (intentionally not changing)

- `lib/ordering.ts`, `useModuleProgress`, `WorkspaceShell.tsx` path-stripping, and `Lesson.tsx`'s `markLessonComplete(...)` call — these all use `/lessons/...` as a **logical ID** for progress/unlock storage. Renaming them would force a data migration of existing `unlocked_routes` rows. Leaving them alone.
- Test file `lib/__tests__/ordering.test.ts` — asserts the logical IDs, still valid.

## Verification

After the edits:
- Navigate to `/bootcamp/structure` → click "Lesson 1.1" → lands on `/bootcamp/structure/lessons/1.1` and renders the lesson (no 404).
- Locked lessons (1.2+) remain greyed out and non-clickable (unchanged).
- Cmd-K palette → search a lesson → opens the correct URL.
- Diagnostics "go to capstone" link routes to the capstone page.
