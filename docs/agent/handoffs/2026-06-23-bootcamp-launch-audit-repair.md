# Bootcamp Launch Audit Repair Handoff

Date: 2026-06-23
Repo: `/Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU`

## Purpose

This handoff captures the Codex bootcamp launch audit so Claude Code can execute the repair pass without starting from a blank audit. Verify specific implementation details before editing, but do not spend the first pass re-auditing all five bootcamps from scratch. Treat this as the working repair plan.

The user wants practical launch readiness: truthful functionality, reliable progress/reporting, working routes/assets, and no fake stats or placeholder behavior. Do not redesign the bootcamps.

## Global Constraints

- Keep all five bootcamps active.
- Prioritize launch truth and progress reliability over full visual redesign.
- Keep edits scoped and additive.
- Preserve current route structure unless a route is stale/broken and this handoff explicitly calls it out.
- Use `npm`; `package-lock.json` is canonical.
- Do not edit Supabase generated types.
- Avoid database migrations unless existing tables cannot represent the needed state.
- After implementation and validation, stage intended files only, commit, and push to `origin main`.

## Current Ranking

1. Intro to LR: B. Strongest current product shape. Needs completion truth fixes.
2. Abstract: B-. Student access is solid. Teacher analytics/progress can lie.
3. Causation Station: C+. Drills work; progress is local/incomplete.
4. Flaw & Famous Flaws: C+. Route/drill handoff works; media and stats are disconnected.
5. Principle & Flaw: C+ pending live QA. Mature shell/content, but Today/Practice must be verified.

## Shared Launch Plumbing Findings

Files:
- `src/App.tsx`
- `src/lib/bootcamps.ts`
- `src/pages/Bootcamps.tsx`
- `src/components/hub/BootcampGate.tsx`
- `src/hooks/useBootcampProgress.ts`
- `src/components/teacher/bootcamps/topicRegistry.ts`
- `src/components/teacher/bootcamps/hooks/useBootcampMetrics.ts`
- `src/components/teacher/AssignmentBuilder.tsx`
- `src/lib/classroomItems.ts`

What is already good:
- `/bootcamps` already consumes shared `BOOTCAMPS` metadata from `src/lib/bootcamps.ts`.
- Shared bootcamp assignment matching exists through `classroomItemMatchesBootcamp`.
- Abstract assignment compatibility is present through `bootcampIdOverride="abstraction"` and `legacyRoutePaths={["/bootcamp/abstraction"]}`.
- `AssignmentBuilder` stores bootcamp route and `metadata.bootcamp_id`.
- `classroomItems` routes `bootcamp_module` assignments through `source_id`.
- `/drill` is inside the catch-all route block wrapped by `QuestionBankProvider` in `src/App.tsx`; do not assume `/drill` lacks provider context without reproducing a crash.

Shared risks:
- Several bootcamps still use browser-local progress for student-facing dashboard/journal features.
- Teacher analytics are inconsistent across bootcamps because some write shared `attempts`, some write bootcamp-specific tables, and some write only localStorage.
- `useBootcampProgress` exists but is not used by every bootcamp that needs assignment status updates.

Shared repair priorities:
1. Make progress/reporting truthful before polishing UI.
2. Ensure assigned bootcamp launch, first meaningful action, and completion status can be reflected in classroom/teacher surfaces.
3. Remove or label data that is local-only so the UI does not imply teacher-visible analytics.

## Abstract

Grade: B- / controlled beta.

Primary files:
- `src/topics/abstract/index.tsx`
- `src/topics/abstract/store/AppContext.tsx`
- `src/topics/abstract/lib/supabase-progress.ts`
- `src/topics/abstract/components/views/TimedFinalSet.tsx`
- `src/topics/abstract/data/finalSet.ts`
- `src/topics/abstract/components/layout/AppShell.tsx`
- `src/topics/abstract/components/layout/Sidebar.tsx`
- `src/components/teacher/bootcamps/topicRegistry.ts`
- `src/components/teacher/bootcamps/hooks/useBootcampMetrics.ts`

What works:
- Route is real: `/topics/abstract/*`.
- Legacy `/bootcamp/abstraction` redirects to `/topics/abstract`.
- `BootcampGate` accepts Abstract through `bootcampIdOverride="abstraction"` and legacy route matching.
- Assignment creation and classroom launch should work with route `/topics/abstract`.
- The Abstract UI shell is a full bootcamp experience with desktop/mobile navigation.

Launch blockers:
1. Teacher analytics mismatch.
   - Teacher bootcamp registry expects shared `attempts.mode` values such as `abstract:d1` through `abstract:d8`.
   - Abstract writes drill attempts to `abstract_drill_attempts.drill_type` via `src/topics/abstract/lib/supabase-progress.ts`.
   - `useBootcampMetrics` reads shared `attempts.mode`, so Joshua can see zero drill attempts even when students complete Abstract work.

2. Final set has two competing truths.
   - `src/topics/abstract/data/finalSet.ts` contains PT-specific TODO placeholder content.
   - `TimedFinalSet.tsx` uses an inline synthetic question array and labels it as a synthetic mixed-practice checkpoint.
   - Decide whether launch promise is synthetic checkpoint or real final set. Then delete/rename the stale TODO path or wire real content.

3. Module progress is partly local-only.
   - Module state, XP, streaks, badges, and unlock UI persist to localStorage in `AppContext.tsx`.
   - Server hydration restores some activity, but module gate rows can still be lost across devices.

Risks/polish:
- Teacher chapter completion denominator can be distorted. Registry expects 5 chapter sections, while Abstract mirrors many translator/gauntlet/module/lesson IDs into `chapter_progress`, so completion can exceed or distort 100%.
- `src/topics/abstract/index.tsx` has a dormant "Work In Progress" fallback. It should not normally render, but it is not launch-grade if an unknown view leaks.
- Abstract migrations have overlapping translator attempt table definitions. Avoid migration work unless needed, but be aware fresh Supabase setup may be noisy.

Repair tasks:
1. Fix teacher analytics by either:
   - mirroring Abstract drill attempts into shared `attempts.mode` using the registry's `abstract:d*` naming, or
   - updating `useBootcampMetrics` to also read `abstract_drill_attempts`.
2. Normalize teacher completion section IDs so only canonical Abstract sections count toward chapter completion.
3. Decide final-set truth and remove the contradictory data path.
4. Persist or derive module unlock/progress state from server-saved activity.
5. QA assigned student, unassigned student, and admin access for `/topics/abstract`.

## Intro To LR

Grade: B / launchable controlled preview.

Primary files:
- `src/pages/IntroToLrBootcamp.tsx`
- `src/bootcamps/main-conclusion/routes.tsx`
- `src/bootcamps/main-conclusion/content/introToLrPath.ts`
- `src/bootcamps/main-conclusion/lib/runner.ts`
- `src/bootcamps/main-conclusion/components/IntegratedPathRail.tsx`
- `src/bootcamps/main-conclusion/modules/lessons/notes/IntroNotesShell.tsx`
- `src/bootcamps/main-conclusion/modules/drills/introDrills.ts`
- `src/bootcamps/main-conclusion/modules/drills/DrillsIndex.tsx`
- `src/bootcamps/main-conclusion/data/practiceDrillPools.ts`
- `src/pages/GuidedDrillStart.tsx`
- `src/bootcamps/main-conclusion/data/references.generated.json`
- `src/bootcamps/main-conclusion/data/named-tools.generated.json`
- `src/bootcamps/main-conclusion/App.tsx`

What works:
- Canonical route is `/bootcamp/intro-to-lr/*` through `ProtectedRoute`, `BootcampGate`, `IntroToLrBootcamp`, and `BootcampRoutes`.
- Canonical path source is coherent: ordered actions in `introToLrPath.ts`.
- Current drill lab copy/counts are truthful: 3 drills, with counts 20/20/12.
- Signed-in persistence exists through `useModuleProgress`, `SupabaseSyncedPersistence`, and `bootcamp_kv`.
- Targeted path/drill tests were reported passing by the subagent.

Launch blockers/high risks:
1. Final practice cards are visible in the learner path but not tracked as completion.
   - Two final practice actions have no `completionId` in `introToLrPath.ts`.
   - `nextTrainingStep` only counts actions with `completionId`.
   - Result: after the three labs are complete, the homepage/path can imply core path cleared while not knowing whether final practice sets were completed.

2. There is a stale alternate practice route.
   - Current practice cards launch `/guided-drills/:slug` using frozen PT qids.
   - `routes.tsx` still defines `/practice-drills/:practiceSlug` using old `MC-SIM-Q*` IDs.
   - This can become a wrong-entry path and maintenance trap.

3. Note completion is explicit-click only.
   - Notes mark complete only when the bottom Continue card is clicked in `IntroNotesShell.tsx`.
   - Left-rail navigation, direct URLs, closing tab, or back navigation do not record completion.
   - This may be acceptable, but the UI should make the completion action unmistakable.

4. `IntegratedPathRail` completion is route-index based.
   - It marks previous steps complete based on current route position, not persisted progress.
   - This is a launch truth issue if students jump ahead.

5. Stale generated copy remains student-facing.
   - References include old phrases such as `Drill 3.4`, `Drill 3.7`, `legacy gateway`, old IDs, and old module assumptions.

6. `src/bootcamps/main-conclusion/App.tsx` is a stale null placeholder with misleading comments.

Repair tasks:
1. Add completion tracking for the two final practice sets or remove them from required/core-path completion logic.
2. Delete or redirect stale `/practice-drills/:practiceSlug` so there is one practice-launch system.
3. Make `IntegratedPathRail` use persisted `useModuleProgress` state instead of route index for completed state.
4. Keep explicit note completion if desired, but make the bottom Continue/complete affordance harder to miss.
5. Clean stale generated/reference copy.
6. Update/remove the stale `main-conclusion/App.tsx` placeholder.
7. Add a regression test proving path completion cannot skip required practice work.

## Causation Station

Grade: C+.

Primary files:
- `src/pages/CausationStation.tsx`
- `src/components/bootcamp/CSDashboard.tsx`
- `src/components/bootcamp/CSDrillPlayer.tsx`
- `src/components/bootcamp/CSQuestionCard.tsx`
- `src/components/bootcamp/CSJournal.tsx`
- `src/components/bootcamp/CSFlashcards.tsx`
- `src/data/causationStation/questions.ts`

What works:
- Route is registered and protected at `/bootcamp/causation-station`.
- Catalog registration exists.
- Drill flow has module intros, randomized banks, answer reveal, explanations, M4 source labels, and highlighting.
- Dashboard and journal are no longer static mocks; they read local attempt history.

Launch blockers:
1. No durable student progress or teacher-visible completion.
   - Drill progress and attempt history are localStorage-only.
   - `useBootcampProgress` exists but Causation Station does not use it.
   - Classroom cards can stay assigned/incomplete even after student work.

2. Module 2 and Module 3 attempts are not recorded.
   - Free-response modules reveal a model answer but do not append an attempt.
   - Dashboard and journal mostly reflect multiple-choice Modules 1 and 4.

3. Dashboard metrics are not fully honest.
   - "Seen" is attempts divided by available questions, not unique questions seen.
   - Reattempts can inflate progress.

4. Resume/reset modal state in `CSDrillPlayer` appears dead or duplicated.
   - The player auto-resumes saved progress.
   - Modal state variables exist but are not intentionally surfaced there; dashboard has separate working reset/resume handling.

5. Mobile/header layout is fragile.
   - `CausationStation.tsx` places title, nav buttons, logout, and theme toggle in one row.
   - Controls are not wrapped into a right-side group and may crowd at mobile widths.

6. Catalog visual identity says neon/punk, but live page uses generic `bg-background`/card styling.
   - Not a blocker if intentionally toned down, but it is a mismatch.

Repair tasks:
1. Define completion model: all 4 modules, all 90 questions, one full run per module, or assigned subset.
2. Wire to `useBootcampProgress` so first meaningful action marks `in_progress` and completion marks `completed`.
3. Record Module 2/3 free-response attempts as ungraded attempts with timestamps/module IDs.
4. Change dashboard to show unique seen count, module completion, attempts, and accuracy separately.
5. Decide whether localStorage-only history is acceptable for launch; if not, add user-scoped persistence.
6. Fix mobile/header layout.
7. Remove unreachable modal state or connect it intentionally.
8. Decide whether to restyle live app or adjust catalog metadata.

## Flaw & Famous Flaws

Grade: C+.

Active implementation:
- `src/bootcamps/fallacy-flaw-v2`

Legacy/drift areas:
- `src/bootcamps/fallacy-flaw`
- `src/components/bootcamp/FF*`

Primary files:
- `src/pages/FallacyFlawBootcamp.tsx`
- `src/bootcamps/fallacy-flaw-v2/FallacyApp.tsx`
- `src/bootcamps/fallacy-flaw-v2/components/Home.tsx`
- `src/bootcamps/fallacy-flaw-v2/components/MistakeJournal.tsx`
- `src/bootcamps/fallacy-flaw-v2/components/VideoCard.tsx`
- `src/bootcamps/fallacy-flaw-v2/components/FlawDrillLauncher.tsx`
- `src/bootcamps/fallacy-flaw-v2/components/LogicVisualizer.tsx`
- `src/bootcamps/fallacy-flaw-v2/data/videoAssets.ts`
- `src/bootcamps/fallacy-flaw-v2/lib/flawQuestionMapping.ts`
- `src/lib/drillRouteState.ts`
- `src/pages/Drill.tsx`

What works:
- `/bootcamp/fallacy-flaw` route is registered, protected, and listed in bootcamp metadata.
- Active app has expected surfaces: dashboard, intro, catalog, flashcards, guided drills, journal.
- `/drill` handoff is structurally sound:
  - `FlawDrillLauncher` navigates to `/drill?mode=type-drill&qids=...`.
  - `drillRouteState.ts` reconstructs selected qids.
  - `/drill` bypasses pool filtering when selected qids are supplied.
- One subagent reported heap-boosted build success with `NODE_OPTIONS=--max-old-space-size=6144 npm run build`.

Launch blockers:
1. Missing media assets.
   - `videoAssets.ts` references `/videos/...`.
   - `public/videos` does not exist.
   - Actual assets found: `public/fallacy-flaw/bootcamp-video.mp4`, `public/fallacy-flaw/bootcamp-audio.mp3`, `public/fallacy-flaw/bootcamp-infographic.png`.
   - `VideoCard.tsx` will show "Video unavailable" for referenced files.

2. Dashboard and journal do not reflect active drill outcomes.
   - `Home.tsx` and `MistakeJournal.tsx` read `localStorage.lsat_flaw_performance`.
   - Active drills persist through shared `/drill`/Supabase attempt flow.
   - No writer back to `lsat_flaw_performance` was found.
   - Result: students can complete questions while bootcamp dashboard/journal remain empty or stale.

3. Flaw category queues are thin/uneven.
   - Active mapping is in `flawQuestionMapping.ts`.
   - Local count against `public/data` found 226 renderable Famous-Flaws Flaw questions total, but some categories are very small:
     - `internal-contradiction`: 1
     - `sleight-of-hand`: 1
     - `sleazy-sales-pitch`: 2
     - `circular-reasoning`: 3
     - `inappropriate-appeal`: 3
     - `universal-desires-assumption`: 3
   - These should not be presented as robust drill queues without labeling or hiding.

Risks/polish:
- Dashboard copy says "Student Statistics" and "Method Mastery" but stats are bootcamp-local and disconnected from real attempts.
- `LogicVisualizer` implements four visuals and falls back to "currently in development" elsewhere. That fallback should not feel unfinished at launch.
- Old FF implementations increase drift risk. Do not edit legacy paths unless needed, but document active implementation clearly.

Repair tasks:
1. Fix `videoAssets.ts` to point to existing `/fallacy-flaw/...` assets, or add matching files under `public/videos`.
2. Wire dashboard/journal to real shared drill attempts, or remove claims that completed drills populate those stats.
3. Consider adding an origin parameter for FF drill launches and writing a bootcamp-specific summary when `/drill` completes.
4. Review thin flaw category mappings; hide, label "lesson only", or add more tagged questions for low-inventory categories.
5. Replace incomplete visual fallback copy with intentional launch-grade copy or hide unfinished visuals.
6. Add a short code comment/doc note that `fallacy-flaw-v2` is the active route implementation.

## Principle & Flaw

Grade: C+ pending live QA.

Important correction:
- A subagent reported a D+ grade because it thought `/bootcamp/principle-flaw` and `/drill` lacked `QuestionBankProvider`.
- Coordinator check found `src/App.tsx` imports `QuestionBankProvider`, wraps the catch-all route block with it, and `/drill` is inside that wrapped block.
- Do not assume provider crash is real without reproducing it.

Primary files:
- `src/pages/PrincipleFlawBootcamp.tsx`
- `src/bootcamps/principle-flaw/PrincipleFlawApp.tsx`
- `src/bootcamps/principle-flaw/components/TodayView.tsx`
- `src/bootcamps/principle-flaw/components/Practice.tsx`
- `src/bootcamps/principle-flaw/components/Learn.tsx`
- `src/bootcamps/principle-flaw/components/Schedule.tsx`
- `src/bootcamps/principle-flaw/components/ReviewLog.tsx`
- `src/bootcamps/principle-flaw/components/Profile.tsx`
- `src/bootcamps/principle-flaw/data.ts`
- `src/bootcamps/principle-flaw/lib/dayQuestions.ts`
- `src/pages/Drill.tsx`
- `src/contexts/QuestionBankContext.tsx`

What works:
- Primary learner route exists and is gated.
- Bootcamp catalog registration exists.
- AssignmentBuilder can assign it with `bootcamp_id`, route, and optional day subset.
- Classroom launch resolves to `source_id`.
- 14-day data and generated targets exist.
- Day completion persists locally and syncs to classroom metadata via `useBootcampProgress`.

Launch risks:
1. Today -> homework -> `/drill` must be live-tested.
   - `TodayView.tsx` launches generated qids via `navigate('/drill', { state: { mode: 'practice-set', ... } })`.
   - Because the provider concern was not confirmed, this is a live QA item, not a code change by default.

2. Practice tab must be live-tested.
   - `Practice.tsx` uses `useQuestionBank`.
   - If it works, no provider fix is needed.
   - If it crashes, fix route/provider wiring or load question bank safely inside the bootcamp.

3. Progress is coarse.
   - Day completion syncs to classroom, but per-question status, redo queue, review logs, flashcard state, and checklist state are mostly localStorage under `pf:` keys.
   - This may be acceptable for MVP, but decide explicitly.

4. Stale mobile-nav comment.
   - `PrincipleFlawApp.tsx` contains a comment saying mobile nav was suppressed, while mobile nav exists.
   - Clean the comment after verifying intended mobile behavior.

Repair tasks:
1. Run authenticated live QA for:
   - `/bootcamps` -> Launch Principle & Flaw
   - Today -> Start homework -> answer one question -> return
   - Practice tab -> inline open
   - Mobile width around 375px for bottom/top nav fit
2. Only if QA reproduces provider failure, patch provider/wrapper behavior.
3. Decide whether `pf:` localStorage-only review/flashcard/checklist state is acceptable for launch.
4. Clean stale comments and any copy drift discovered during QA.

## Validation Plan

Run after repairs:

```bash
npm run test -- src/components/teacher/bootcamps/__tests__/registry.test.ts
npm run test -- src/bootcamps/main-conclusion/content/__tests__/introToLrPath.test.ts src/bootcamps/main-conclusion/lib/__tests__/runner.test.ts
npx tsc --noEmit -p tsconfig.app.json
NODE_OPTIONS=--max-old-space-size=6144 npm run build
```

Manual QA with authenticated session:
- `/bootcamps` admin view.
- `/bootcamps` assigned-student view.
- Each Launch Bootcamp button.
- Locked/unassigned state for at least one bootcamp.
- Abstract assigned route and legacy `/bootcamp/abstraction` redirect.
- Intro path: notes -> lab -> final practice.
- Causation: one MC module, one free-response module, dashboard/journal after attempts.
- FF: video area, catalog flaw launch, `/drill` completion, dashboard/journal after return.
- Principle & Flaw: Today homework, Practice tab, mobile nav.

## Claude Code Execution Prompt

Use this prompt:

```text
You are working in /Users/joshuaf/Documents/Claude/02_PROJECTS/LSATU.

Read docs/agent/handoffs/2026-06-23-bootcamp-launch-audit-repair.md in full first. That file is the audit handoff. Do not begin by re-auditing all five bootcamps from scratch. Verify the specific files before editing, then execute the repair plan.

Goal: make the active bootcamps launch-truthful and reliable. Prioritize progress/reporting correctness, broken media/assets, stale route paths, and misleading dashboard/journal stats. Do not redesign the bootcamps.

Work in the priority order from the handoff:
1. Abstract analytics/progress mismatch.
2. Intro to LR completion/path truth.
3. Causation Station classroom progress and free-response attempts.
4. Flaw & Famous Flaws media and real drill outcome reporting.
5. Principle & Flaw live QA and only patch if the suspected issue reproduces.

Run the validation commands listed in the handoff. After implementation, stage only intended files, commit with a concise message, and push to origin main.
```
