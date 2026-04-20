# Scan 2 — Drill Surface

**Scope.** `src/pages/Drill.tsx` (2,194 lines), `src/components/drill/*` (21 files, ~8,029 lines), `src/lib/adaptiveEngine.ts` (681 lines), `src/lib/drillIntelligence.ts`, `src/lib/questionLoader.ts` (542 lines), `src/lib/questionPoolService.ts`, `src/lib/questionTimer.ts`, `src/contexts/QuestionBankContext.tsx`, `src/contexts/TimerContext.tsx`, `supabase/functions/generate-micro-drill/index.ts`.

## Executive Summary

Drill is where the old playbook's diagnoses are most accurate and most urgent. Four of the 9 original issues live here (#2 dark mode, #3 channel sprawl, #4 error swallowing, #8 decomposition, #9 edge-function migration), and a scan of the actual code reveals a fifth structural problem not in the old playbook: the question bank loads via 83 sequential `fetch()` calls with `await` inside a for-loop. That is a startup tax every user pays on every cold session, and on mobile it is brutal.

`Drill.tsx` is not 2,194 lines of tangled spaghetti. It is 2,194 lines of reasonably organized logic that has outgrown a single component. Forty `useState` hooks and two `useRef`s at the top, ten separate `useEffect` blocks, four DB-write paths, and zero of those write paths surface failures to the user. The 40/40/20 Smart Drill logic, the 70/20/10 adaptive-sequence logic, ability calculation, and weak-area analysis all run in the browser. The edge function that was supposed to replace this (`generate-micro-drill`) is a 39-line placeholder returning fake `qid: "micro-${Date.now()}-1"` strings.

Drill's dark-mode lifecycle is actually correct. The old playbook's Issue #2 belongs elsewhere (see Scan 5 F5.1).

## Deep Findings

### F2.1 — Question bank load is a startup-performance emergency
**Evidence.** `src/lib/questionLoader.ts:408-411`. `for (const filename of JSON_FILES) { const response = await fetch(filename); ... }`. 83 JSON files totaling 3.0MB in `public/data/`. `QuestionBankProvider` in `src/contexts/QuestionBankContext.tsx` awaits the entire chain before rendering any question-bank-dependent page.
**Behavior.** At 100ms per request that is 8.3 seconds of serial network time. On 3G mobile, 30+ seconds. No loading skeleton, no progressive reveal, no partial-bank fallback. Failures on individual files silently `continue`.
**Severity: 9/10.** Single biggest UX violation in the repo against the premium-feel benchmark.
**Fix.** Replace the for-loop with `await Promise.all(JSON_FILES.map(fetch))`. Add a progressive `loadedCount / total` callback for a loading bar. Or move to a server-side RPC returning a compact index with lazy question-body fetch. The VitePWA `CacheFirst` runtime cache on `/data/*.json` (`vite.config.ts:37-45`) helps on repeat visits but not cold starts.

### F2.2 — `saveAttemptToDatabase` silently swallows errors
**Evidence.** `src/pages/Drill.tsx:499-544`. Called from 7 sites (lines 553, 632, 681, 744, 930, and twice inside `handleSubmit`). `if (error) { console.error(...) }` returns void identically to success. Outer try/catch also just logs.
**Behavior.** Every caller proceeds as if the write succeeded. Session state updates, adaptive engine records the attempt, `QuestionPoolService.markQuestionSeen` fires, `setShowSolution(true)` runs. User sees green. DB got nothing. On a dropped connection mid-drill, the entire session's telemetry is lost silently and analytics reports less work than the student did.
**Severity: 9/10.** The bug that quietly damages the product's core promise.
**Fix.** Change the function signature to return `{ ok: boolean, error?: unknown }`. Let callers decide whether to retry. Surface persistent failures via `toast.error('We could not save your last answer — tap to retry.')`.

### F2.3 — Error-swallowing is a pattern, not a single site
**Evidence and severity per callsite:**
- `saveBRResults` (`Drill.tsx:1474-1546`) — one try/catch around the entire insert loop. Partial-failure mid-loop leaves a mix of saved and unsaved rows. Severity **8/10**.
- `handleWAJSave` (`Drill.tsx:586`) — `catch (error) { console.error('Failed to log to WAJ:', error); }` and proceeds to set state as if it worked. Severity **7/10**.
- `handleToggleFlag` (`Drill.tsx:1231, 1249`) — logs, does not rollback. Optimistic UI will stay toggled while DB is not. Severity **6/10**.
- `handleFinishPracticeSet` (`Drill.tsx:931`) — nested try/catch around per-question WAJ writes inside a loop. Each failure logs and continues. Severity **7/10**.

**Fix.** Introduce a `db.ts` wrapper (or TanStack Query mutation hooks) that enforces: every mutation returns a typed result, every failure surfaces by default, opt-out is explicit. Apply across all four sites.

### F2.4 — `Math.random` usage in Drill
**Evidence.** Session ID at `Drill.tsx:1478`: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` for `blind_review_sessions`. Three Fisher-Yates shuffles at lines 264, 283, 303. Two more in `adaptiveEngine.ts`.
**Behavior.** The session ID is a DB row ID, not a WebSocket channel name — so the old playbook's "channel sprawl" framing for Issue #3 does not apply here (it applies to `useInbox.ts`, see Scan 3 F3.2). The `substr` method is deprecated. No collision detection.
**Severity: 4/10** in isolation.
**Fix.** Replace line 1478 with `crypto.randomUUID()`. Extract a single `shuffle(arr)` helper into `src/lib/utils.ts` and replace the five duplicated Fisher-Yates loops.

### F2.5 — `Drill.tsx` decomposition is overdue
**Evidence.** 2,194 lines, 40 `useState`, 10 `useEffect`, 7 DB-write callsites, embedded JSX for question view + post-section flows + exit dialogs.
**Natural seams visible in the code:**
- `useDrillSession(mode, config, classId)` — session init, adaptive/non-adaptive selection, `advanceToken` pattern, `handleNext`/`handlePrevious`.
- `useAttemptPersistence(classId, user)` — wraps the 4 DB-write paths with proper error returns.
- `useQuestionView(question, user, classId)` — flag check, pool tracking, highlight state.
- `useBlindReview(session, user)` — BR marking, selection, `saveBRResults`.
- `<DrillPostSection>` — the `postSectionScreen` switch block currently rendering SectionComplete / EnhancedBlindReview / LRSectionResults / PracticeSetResults through an if-chain.

**Target: ~400-line page composition.**
**Severity: 7/10.** Not a crash, but a velocity drag.

### F2.6 — Adaptive engine is entirely client-side
**Evidence.** `src/lib/adaptiveEngine.ts` (681 lines). `generateSmartDrill()` (lines ~410–540) calls `supabase.from('attempts').select(...)` directly. `analyzeWeakAreas()` (lines ~260–400) same. `hydrateFromDB()` (lines ~56–95) same. Three algorithm variants (40/40/20 smart drill, 70/20/10 adaptive sequence, scoring-based next-question) ship to the client. Tuning constants (`0.40` mastery threshold, `0.75` strong threshold, `1.5` breadth bonus, `exp(-idx / 80)` decay) are baked into the bundle. `new AdaptiveEngine()` module-level singleton at `Drill.tsx:55`. `hydrated = true` is a one-shot flag — new attempts in other tabs do not trigger re-hydrate.

Meanwhile: `supabase/functions/generate-micro-drill/index.ts` is a 39-line placeholder with an inline comment "For now, return placeholder questions. In production, this would query the question bank for similar questions." It returns `[{ qid: "micro-${Date.now()}-1", pt: 120, section: 2, qnum: 5 }, ...]`.

**Severity: 7/10.** Not broken today, but blocks iteration speed on the core product mechanic.
**Fix.** Build `supabase/functions/generate-smart-drill/` taking `{ classId, poolFilter, count }`, running the 40/40/20 against the DB via service-role client, returning qids. Client invokes via `supabase.functions.invoke`. Tuning constants become env vars. Kill or repurpose `generate-micro-drill`.

### F2.7 — Dark mode enforcement on Drill is correct
**Evidence.** `Drill.tsx:70-77`. Adds/removes `light` class on `document.documentElement`, with a cleanup that restores the original state only if it was `light` pre-mount. No `document.documentElement.classList.add('dark')` anywhere in Drill.
**Behavior.** Correct pattern. The base stylesheet is already dark; `light` is the override.
**Severity: 0 (positive confirmation). Old playbook Issue #2 relocates to Scan 5 F5.1.**

### F2.8 — `classId` fetch is duplicated
**Evidence.** `Drill.tsx:141-162` fetches `class_id` from `students` with its own fallback. `useUserPermissions` fetches equivalent data via the RLS fallback. `AuthContext.provisionStudentRecord` inserts the `students` row.
**Behavior.** Three places, one concept, none coordinating.
**Severity: 5/10.**
**Fix.** Absorb into `PermissionsContext` from F1.1. Kill `Drill.tsx:141-162`.

### F2.9 — `QuestionTimer` is thoughtful but orphaned
**Evidence.** `src/lib/questionTimer.ts` (192 lines) tracks segments, answer changes, and revisit counts with pause/resume semantics. Used only in practice-set mode (`isPracticeSetMode`). Other modes use naive `performance.now() - questionStartTime`. Instance is a `useRef`, created once per Drill mount, never persisted, never flushed to DB.
**Behavior.** Richer timing signal (revisits, pauses, answer-change events) is generated and thrown away on unmount.
**Severity: 4/10.** Latent value.
**Fix.** Either unify all modes to use `QuestionTimer` and persist richer timing data, or delete the module.

### F2.10 — The timer-start effect is dependency-buggy
**Evidence.** `Drill.tsx:1311-1316`. `useEffect(() => { if (hasTimer && timer && !timer.running) { timer.start(); } }, [hasTimer, timer]);`.
**Behavior.** `timer` comes from `useTimerContextSafe()`, stable only if the provider is not re-rendering. React Strict Mode double-invoke can race this in dev.
**Severity: 3/10.**
**Fix.** Use a stable ref or rewrite with an explicit start-once guard.

### F2.11 — Four near-identical save sequences
**Evidence.** `handleSubmit` / `handleSubmitNonAdaptive` / `handleWAJSave` / `handleFinishPracticeSet`. Each: save attempt → mark view answered → update session → record adaptive engine attempt → mark question seen → set UI state. 30–50 lines of near-copy-paste each, with subtle differences (adaptive vs non-adaptive, WAJ integration, practice-set timing metric).
**Behavior.** A regression in one path is easy to miss in the others.
**Severity: 6/10.**
**Fix.** Extract `commitAttempt(session, question, answer, mode, timeMs, reviewData?)` returning `{ session: newSession }`.

### F2.12 — `handleToggleFlag` optimistic UI is inverted
**Evidence.** `Drill.tsx:1227-1260`. Function does DB write first, then sets `isFlagged` state.
**Behavior.** Lag between tap and UI update — the opposite of premium feel. Same anti-pattern as F3.3 but inverted (here: no optimism where needed; there: no optimism where needed).
**Severity: 5/10.**
**Fix.** Optimistic set first, write in background, rollback + toast on failure. The AdminDashboard pattern (F4.10) is the template to copy.

## Scores (Scan 2 slice)

| Axis | Score |
|---|---|
| Architecture quality | 52 / 100 |
| Maintainability | 48 / 100 |
| UI/design consistency | 74 / 100 |
| Product vision alignment | 70 / 100 |
| Bug/risk level | 38 / 100 |

## Next Actions (ranked)

1. `Promise.all` in `questionLoader.load()`. One-line change, highest user-visible impact.
2. `saveAttempt` wrapper returning `{ ok, error }`, applied across all 4 DB-write paths.
3. Replace `new AdaptiveEngine()` module singleton with Edge Function. Kill the placeholder `generate-micro-drill`.
4. Extract `Drill.tsx` into `useDrillSession` + `useAttemptPersistence` + `useQuestionView` + `useBlindReview`. Target 400 lines.
5. Single-source `classId` via `PermissionsContext` (F1.1 dependency).
6. `crypto.randomUUID()` at `Drill.tsx:1478`.
7. Extract `shuffle(arr)` to `src/lib/utils.ts`.
8. Flip `handleToggleFlag` to optimistic-first + rollback.

## Known Open Questions

- Playbook Issue #2 ("the `.dark` class bug") is not in Drill — resolved in Scan 5 F5.1.
- How does the current production question bank size compare to the 83-file count if new PTs are added? The `JSON_FILES` array is a hand-maintained list in `questionLoader.ts:51-150`. Risk: new PTs silently missing from the bank because someone forgot to extend the list.
