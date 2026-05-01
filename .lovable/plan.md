# Bootcamp navigation — diagnosis + fix

## What's actually happening (live test results)

I just clicked through `/bootcamp/structure` in the preview. Routing **is** working:

- M1 "Lessons" card → `/bootcamp/structure/lessons` ✓ (page renders)
- Sidebar "Lessons / Reference / Drills / Simulator / Hard Sentences / Diagnostics" → all absolute paths, correctly mounted ✓
- Lesson 1.1 row → `/bootcamp/structure/lessons/1.1` ✓ (full lesson content renders)

So the routes themselves are fine. **What looks broken is the gating layer**: every lesson except 1.1 shows a 🔒 and is `pointer-events-none`, and several module entry points (Simulator, parts of Diagnostics) sit behind `<LockedRoute>`. To you that reads as "the buttons don't work" — but they're disabled on purpose by the progress system in `useModuleProgress`, which only seeds `/lessons/1.1` into `unlocked_routes` until a user "completes" 1.1.

### Why the M1–M6 cards looked dead before
The Module Index cards use **relative** `to="lessons"` links. Earlier sessions added a `/bootcamp/structure` prefix only to the *lesson rows*, not the cards — but React Router resolves the relative path against the index route's URL, so they actually do work. The two surfaces that were genuinely broken were the lesson rows, the command palette, and the diagnostics capstone link — all already fixed in the previous turn.

## What you're asking for

> "I want all of those in this bootcamp to be routed to info / base buttons and lesson and such"

Translation: every card on the index, every sidebar item, and every lesson row should actually take you somewhere with real content — no locks, no dead-ends — so you (and Joshua) can review the whole bootcamp end-to-end.

## Plan

### 1. Open all lessons by default
File: `src/bootcamps/main-conclusion/hooks/useModuleProgress.ts`
Seed `unlocked_routes` with every lesson path (`/lessons/1.1` … `/lessons/1.13`) plus the M2–M6 entry points, instead of only `/lessons/1.1`. Keep `completed_lessons` empty so the progress UI still reflects real completion.

### 2. Bypass `<LockedRoute>` while previewing
File: `src/bootcamps/main-conclusion/components/workspace-shell/LockedRoute.tsx`
Add an env / build-time flag (default ON for now) that lets the route render its children even when the gate isn't met. This unlocks Simulator, Trap Master, Hard Mode, etc.

### 3. Make the Module Index cards use absolute paths
File: `src/bootcamps/main-conclusion/modules/ModuleIndex.tsx`
Change `to: 'lessons'` → `to: '/bootcamp/structure/lessons'` (and the same for the other 5). They work today via relative resolution, but absolute paths are robust against any future re-mount and match the sidebar pattern.

### 4. Audit the remaining sub-indexes
Files: `ReferenceIndex.tsx`, `DrillsIndex.tsx`, `SimulatorShell.tsx`, `HardSentencesIndex.tsx`, `DiagnosticsIndex.tsx`
Spot-check each `<Link to=...>` and convert any stray relative paths to the `/bootcamp/structure/...` form so every button on every sub-page is guaranteed to land on a real route.

### 5. Verify in the browser
Click each M1–M6 card, each sidebar item, and at least one row inside each module. Confirm no 🔒, no 404, no "Navigate to /bootcamp/structure" bounce.

## Out of scope
- No changes to the data model, Supabase schema, or `students_safe`.
- No design changes — purely wiring/gating.
- The "complete a lesson to unlock the next" logic stays in code; we're just pre-seeding the unlock set so the whole bootcamp is walkable now.
