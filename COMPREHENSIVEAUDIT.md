# LSAT U Comprehensive Code Audit

**Date:** 2026-07-09
**Scope:** Entire codebase (src/, supabase/functions/, build config, data layer). Security explicitly excluded (handled by a separate pipeline).
**Method:** 10 parallel deep-review agents (one per subsystem), every critical/high finding adversarially re-verified against the actual code by an independent agent. The scripts-tests subsystem and the two build-perf highs were re-run/re-verified on 2026-07-09 after their original agents failed mid-run; all 10 subsystems now have full deep-review coverage. 155 findings survived.
**Total: 155 findings: 4 critical, 30 high, 72 medium, 49 low.**

---

## Executive summary

The app's biggest systemic problem is not any single bug: it is that **Supabase mutation errors are ignored across the entire codebase**. supabase-js v2 never throws on DB errors; it returns `{ error }`. Dozens of call sites `await` the builder and discard the result, so RLS failures, constraint violations, and outages are invisible: drills report saved results that were never saved, streaks celebrate progress that never persisted, admin role changes report success on failure. This directly violates the repo's own "DB mutations never swallow errors" rule. Roughly 45 of the 155 findings are instances of this one pattern.

The second systemic problem is **performance at boot**: the main bundle is 3.7MB (1.03MB gz) because heavy pages (Drill at 3.5k lines, Auth, Intro to LR bootcamp) are eagerly imported, and QuestionBankProvider fires ~156 JSON fetches (~6MB) on every cold load for every route, even ones that never use questions.

Third: **read-modify-write races** on counters (daily stats, xp_total, times_seen, view_count) lose increments under normal drill usage.

Notably clean code that should be the template for fixes: `journalService.ts` and `questionExposure.ts` (proper throw-on-error), the main-conclusion bootcamp's content pipeline, and the Gmail feature's TanStack Query usage.

### Scripts, tests, and tooling (scripts-tests subsystem)
- `npx tsc --noEmit -p tsconfig.app.json`: **1 real error**, a guaranteed runtime crash in the hub (C145). Vite builds do not typecheck, there is no typecheck script, no CI, and no pre-commit gate (M152), so this shipped to main undetected.
- `npm run lint`: **2747 errors, 518 warnings**, but the count is dominated by vendored reference repos under `references/` and Deno edge functions linted with browser globals (H146). Product-code signal (including a real rules-of-hooks violation, M147) is buried; lint is not usable as a gate until the ignores are fixed.
- Test suite: **73 files, 375 passing, 1 skipped** (~56s). adaptiveEngine and questionLoader are well covered, but five core progression engines (drillIntelligence, wajService, achievementEngine, gamification, streakSystem) have zero specs (M151).
- Content-import pipeline: drift is warned but never fails the build despite the file's own "drift = build error" contract (M148); the header documents npm scripts and flags that do not exist (M149); the vite parity-check plugin is dead code watching nonexistent paths (M150).

---

## Execution plan, ranked by leverage

Each phase is sized to be a single focused session. Work top to bottom. Every fix's step-by-step detail is in the findings sections below (referenced by ID).

### Phase 0 — Stop-the-bleeding (hours, do first)
1. **C145** Fix the `formatRelativeShort` crash (`src/components/hub/StudentOverview.tsx:379`), a one-line import.
2. **C1** Blind Review results silently fail to save (`Drill.tsx:2418,2443`) — check errors, toast on failure.
3. **C2** LRSectionResults section-history insert silent failure + **H (duplicate rows)** — check error AND fix the empty-deps save effect.
4. **C3** Main-conclusion cross-device hydration race that can clobber cloud progress with a default row.
5. **H** gemini-proxy: unauthenticated + 768-dim embeds vs vector(3072) (semantic search silently broken, unbounded LLM spend). Two-line-class fixes, large impact.
6. **H** tutor-chat fire-and-forget insert never executes (lazy thenable never awaited) — add `await` or `.then()`.

### Phase 1 — The swallowed-error sweep (the big one)
Create one shared helper (e.g. `src/lib/dbResult.ts`):
```ts
export async function must<T>(q: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
```
Then convert every unchecked mutation site to `must(...)` (or explicit `if (error) throw`), and make callers surface failures via toast. Sites, all itemized below: questionPoolService (H2), gamification.updateDailyStats (H3), streakSystem (H4), achievementEngine.awardAchievements (H5), useInbox (H6-H8), useUserPermissions (H9), useSmartboardAutosave (H10), wajService (H), Practice.tsx stats (H), plus the ~25 medium/low error-handling findings. Pattern per site: destructure `{ error }`, throw, toast at the UI boundary. Use `journalService.ts` as the reference implementation.

### Phase 2 — Atomic counters
Replace read-modify-write increments with Postgres RPCs (`ON CONFLICT ... DO UPDATE SET x = t.x + 1`): daily_stats (H3), xp_total (H5), times_seen (M), wajService history (L), abstract view_count (L). One migration adding 3-4 RPCs, then swap call sites.

### Phase 3 — Boot performance
1. Lazy-load Drill, Auth, Intro to LR bootcamp, and every heavy route in `App.tsx` (H, build-perf); fix the inline `React.lazy` for /trust.
2. Make QuestionBankProvider lazy: load only on routes that use questions, and bundle the 155 JSON section files into one (or a few) merged files at build time via the existing scripts pipeline (M, data-layer).
3. Remove unused deps: 6 @tiptap packages, gsap/@gsap/react; consolidate framer-motion vs motion; audit the icon triple-stack.
4. Move the 82MB fallacy-flaw media out of `public/` (Supabase storage or CDN).
5. Remove the render-blocking Google Fonts `@import` in `main-conclusion/styles/scoped.css` (already linked in index.html).
6. Fix the build OOM (add `NODE_OPTIONS=--max-old-space-size=4096` to the build script; shrinking the bundle in steps 1-4 is the real fix).

### Phase 4 — Correctness bugs
- inferTypeFromStem regex-in-includes dead branches (H, questionLoader).
- achievementEngine `timestamp` → `timestamp_iso` column (H1) + exact-equality milestone checks (M).
- UTC vs local-time day boundaries in streaks (3 places: streakSystem, principle-flaw, abstract).
- filterQuestionPool ignores allowRepeats (M).
- VoiceCoachModal cluster: fabricated fallback feedback, stale-closure auto-stop, mic never released, invalid `.order().limit(1)` UPDATE.
- useStudyChat SSE chunk-split parser + stale tabs closure.
- Abstract bootcamp: DB write inside setState updater (H).
- Fallacy-v2: duplicate drill names inflating stats; GuidedDrills silent random-flaw fallback.

### Phase 5 — Dead code purge
Delete: fallacy-flaw v1 tree (68 files, 440KB) + FF* components + src/data/fallacyFlaw; unrouted pages (Dashboard, Landing, Index, Memory); flawMatcher.ts, ExtractionWorkspace.tsx, MethodsDrill.tsx; ~1,000 dead lines in fallacy-flaw-v2 drills.ts; FloatingMessenger dead admin branches; debug console.logs in App.tsx; Lovable-branded social meta in index.html.

### Phase 6 — Hygiene and hardening
- N+1 and unbounded queries: BR insert loop → batch insert; Practice/Analytics fetch-all-attempts → count/aggregate queries; useInbox previews → single query with lateral/last-message view; select('*') narrowing.
- Edge functions: process-email-queue log/DLQ integrity, gcal-sync-pull unchecked upserts, send-transactional-email CORS on throw, remove generate-micro-drill fake questions, voice-coach-respond canned-reply fallback.
- Decompose Drill.tsx (3,539 lines, ~50 useState) behind a reducer; do this only after Phases 0-4 so diffs stay reviewable.
- Lint debt: fix the eslint ignores first (**H146**) so lint measures product code only, then fix the 38 auto-fixables and ratchet (error-level only on changed files). Re-enable no-unused-vars as warn (**L153**).
- Tooling gates: add a typecheck script and wire it into `.claude/safe-push.sh` (**M152**); fail the content-import pipeline on drift (**M148**); fix or delete the dead parity-check vite plugin (**M150**) and the import-content.ts doc drift (**M149**, **L155**); make bank-repair scripts report unparseable banks and exit nonzero (**L154**).
- Test coverage: add specs for the five untested progression engines (streakSystem, achievementEngine, gamification, drillIntelligence, wajService, **M151**) after Phases 1-2 land so tests assert the fixed behavior.

---

# Findings by severity

IDs are sequential across the report. "[verified against code]" means an independent adversarial agent confirmed the finding by reading the cited code.

## CRITICAL (4 findings)

*Findings numbered 145+ were added 2026-07-09 when the scripts-tests subsystem review was completed; they are appended per section to keep earlier IDs stable.*

### C1. Cross-device hydration race can clobber cloud progress with a fresh default row
**File:** `src/bootcamps/main-conclusion/persistence/SupabaseSyncedPersistence.ts:44 and src/bootcamps/main-conclusion/hooks/useModuleProgress.ts:57-71`  |  **Category:** data-integrity  |  **Subsystem:** bootcamp-mc [verified against code]

**Problem:** All claims verified with one minor path fix: recordPracticeCompletion.ts lives at src/bootcamps/main-conclusion/lib/recordPracticeCompletion.ts, not hooks/. Also, the hydrate() fire-and-forget call is at line 44 as cited; the default fabrication in useModuleProgress.ts is at lines 58-72.

**Fix plan:** 1) Make hydration a hard gate before first read: expose a `ready: Promise<void>` on SupabaseSyncedPersistence set from the constructor's hydrate() call, and add `await (persist as any).ready` semantics via a new `Persistence.ready(): Promise<void>` method (V1Persistence returns Promise.resolve()). 2) In useModuleProgress, useUser, useDiagnostics, and recordPracticeDrillCompletion, `await persist.ready()` before the initial get(). 3) In useModuleProgress, if get() still returns null after hydration, only then create the default row. 4) Additionally implement the documented merge: in hydrate(), compare row.data.updated_at against the local record's updated_at and keep the newer one, so a queued local write made pre-hydration is not lost. 5) Add a test in persistence tests simulating: cloud row exists, local empty, hook mounts, assert flush never upserts a default row over the cloud row.

### C2. Section history insert failure is silent: supabase error object never checked
**File:** `src/components/drill/LRSectionResults.tsx:183-201`  |  **Category:** data-integrity  |  **Subsystem:** components [verified against code]

**Problem:** Minor line offset only: the insert spans lines 184-202 (finding cited 183-201). Behavior is exactly as claimed. Note the catch still works for genuinely thrown errors (e.g. network fetch rejection or the wajService dynamic import), but not for returned PostgREST errors.

**Fix plan:** Change to `const { error } = await supabase.from('section_history').insert({...}); if (error) throw error;`. Do the same inside logWrongAnswer calls if wajService does not already throw (verify wajService returns/throws on error; if it returns an error object, check it and throw). Keep the existing catch that toasts.

### C3. Blind Review results silently fail to save (Supabase errors never checked)
**File:** `src/pages/Drill.tsx:2418 and 2443`  |  **Category:** data-integrity  |  **Subsystem:** pages [verified against code]

**Problem:** In the BR save handler, `await supabase.from('blind_review_sessions').insert({...})` and the per-question `await supabase.from('attempts').insert({...})` inside the loop never destructure or check the returned `error`. Supabase JS v2 does NOT throw on DB errors; it resolves with `{ error }`. The surrounding try/catch (line 2465, `toast.error('Failed to save blind review results...')`) therefore only catches synchronous JS exceptions, never actual insert failures (RLS rejection, constraint violation, network via fetch still resolves with error object). A student can finish a full blind review and lose every row with zero feedback, directly violating the repo rule that DB mutations never swallow errors.

**Fix plan:** 1) Change line 2418 to `const { error: brSessionError } = await supabase.from('blind_review_sessions').insert({...}); if (brSessionError) throw brSessionError;`. 2) In the loop at 2443, collect results: `const { error: attemptError } = await supabase.from('attempts').insert({...}); if (attemptError) throw attemptError;` (or push to an errors array and throw after the loop with a count). 3) The existing catch already toasts, so throwing surfaces it. 4) Optionally keep partial-success info in the toast message.


### C145. ReferenceError crash: formatRelativeShort used without import in StudentOverview
**File:** `src/components/hub/StudentOverview.tsx:379`  |  **Category:** bug  |  **Subsystem:** scripts-tests [verified against code 2026-07-09]

**Problem:** AssignmentRow calls `formatRelativeShort(assignment.assigned_at)` at line 379 but the file never imports or defines it. TS strict mode off plus no typecheck in the build means Vite ships it anyway; at runtime, rendering any assignment row with a non-null `assigned_at` throws `ReferenceError: formatRelativeShort is not defined`. Verified reachable: StudentOverview is rendered unconditionally by `HubWorkspace.tsx:65`, and AssignmentRow renders for each assignment from `useAdminTAAssignmentsForStudent`, so the hub crashes whenever a student has assignments with dates. Confirmed by `tsc` TS2304. The function exists at `src/lib/time.ts:17` and is imported correctly by ~10 other files (e.g. `HubAssignments.tsx:16`, `StudySidecar.tsx:63`).

**Fix plan:** In `src/components/hub/StudentOverview.tsx`, add to the existing import block: `import { formatRelativeShort } from '@/lib/time';`. Run `npx tsc --noEmit -p tsconfig.app.json` and confirm zero errors. Manually verify the hub student overview renders assignment rows with dates.

## HIGH (30 findings)

### H4. useDiagnostics has zero error handling: any persistence failure leaves loading=true forever
**File:** `src/bootcamps/main-conclusion/hooks/useDiagnostics.ts:50-72`  |  **Category:** error-handling  |  **Subsystem:** bootcamp-mc [verified against code]

**Problem:** One nit: Dashboard.tsx does not itself call useDiagnostics; the direct consumers are MistakeProfile, SrsQueue, TraitProfile, Recommendations, RrReview, and DiagnosticsAnalyticsSurface. Otherwise the finding is accurate as stated.

**Fix plan:** 1) Wrap the body in try/catch. 2) Add an `error: string | null` field to DiagnosticsState. 3) On catch, if !cancelled, setState({ ...initial, loading: false, error: message }) and console.error with context. 4) Update the 6 consumer surfaces in modules/diagnostics/ to render an error state (simple Card with retry) when error is set instead of an infinite skeleton.

### H5. Supabase sync failures are permanently swallowed with console.warn; user never told progress is not syncing
**File:** `src/bootcamps/main-conclusion/persistence/SupabaseSyncedPersistence.ts:69,117,131,137`  |  **Category:** data-integrity  |  **Subsystem:** bootcamp-mc [verified against code]

**Problem:** One wording nuance: failed flushes are not permanently dropped, they retry indefinitely via re-queue plus a beforeunload/visibilitychange flush. The real defect is that failures are permanently silent (no cap, no backoff, no UI surfacing), and a persistent failure like an RLS rejection loops forever while the student believes progress syncs cross-device.

**Fix plan:** 1) Add a retry counter per PendingWrite; after N (e.g. 5) failed flushes with exponential backoff, stop retrying that write and invoke an onSyncError callback. 2) Add a module-level subscriber API (onSyncStatusChange) that the bootcamp shell (WorkspaceShell) subscribes to and shows a persistent toast/banner: 'Progress is saving locally but not syncing to your account'. 3) On hydrate failure, set a hydrateFailed flag, retry hydrate with backoff, and block default-row creation until hydration definitively succeeds or the user is warned.

### H6. Flashcard review DB write depends on side effect inside a setState updater (write silently skipped when updater is not eagerly evaluated)
**File:** `src/topics/abstract/store/AppContext.tsx:485-517`  |  **Category:** bug  |  **Subsystem:** bootcamps-other [verified against code]

**Problem:** rateCard (AppContext.tsx:485-539) computes `next`/`nextReviewCount` inside the setBootcampState functional updater and then uses them synchronously for the insertFlashcardReview DB write, guarded by `if (!user || !next) return { ok: true }`. This relies on React's undocumented eager-updater optimization; whenever the provider fiber already has a pending update in the same batch, `next` is null at the check and the review insert is silently skipped with a fake success. The updater is also impure (persistCardsCache call plus outer-variable mutation) under an app that renders in React.StrictMode. Correction to the trigger scenario: the only current caller (Flashcards.tsx:83 handleRate) does not fire updateCardReview/addXp/bumpStreakActivity before rateCard in the same event, so the bug is latent/intermittent (dependent on any coincident pending provider update) rather than reliably triggered by those named functions. Fix: compute next/nextReviewCount from the current state outside the updater (or restructure so the DB write does not depend on updater side effects).

**Fix plan:** 1) Compute the next review OUTSIDE the updater: read the current card from a ref or from bootcampState via a functional read helper. Concretely: before setBootcampState, do `const currentCard = bootcampStateRef.current.cards[cardId] ?? {cardId, status: 'unseen', reviewCount: 0}` (add a `bootcampStateRef` kept in sync via useEffect, or restructure rateCard to use the reducer pattern). 2) Compute `next = computeNextReview(rating, currentCard.intervalDays ?? 0, currentCard.reviewCount)` and `nextReviewCount = currentCard.reviewCount + 1` as plain locals. 3) Pass those precomputed values into a pure setBootcampState updater that only builds nextCards. 4) Move persistCardsCache out of the updater into a useEffect keyed on bootcampState.cards. 5) Then always call insertFlashcardReview when `user` exists (no `!next` guard needed).

### H7. Legacy fallacy-flaw v1 bootcamp tree (68 files) plus FF* components and src/data/fallacyFlaw are fully dead code
**File:** `src/bootcamps/fallacy-flaw/FallacyFlawApp.tsx:1`  |  **Category:** dead-code  |  **Subsystem:** bootcamps-other [verified against code]

**Problem:** One minor inaccuracy: src/data/fallacyFlaw/questions.ts and constants.ts do not import from src/bootcamps/fallacy-flaw/; they only reference it in migration comments. So the dead-code chain is even cleaner than claimed: v1 tree (68 files) has zero external importers at all, and data/fallacyFlaw plus the four FF* components form a separate dead island. Everything else in the finding checks out.

**Fix plan:** 1) Confirm with `grep -rn "bootcamps/fallacy-flaw/" src | grep -v '^src/bootcamps/fallacy-flaw/'` (only src/data/fallacyFlaw hits) and `grep -rn 'FFJournal\|FFFlashcards\|FFDashboard\|FFDrillPlayer' src | grep -v components/bootcamp` (no hits). 2) Delete src/bootcamps/fallacy-flaw/ entirely, src/components/bootcamp/FFJournal.tsx, FFFlashcards.tsx, FFDashboard.tsx, FFDrillPlayer.tsx, and src/data/fallacyFlaw/. 3) Run `npx tsc --noEmit -p tsconfig.app.json` and `npm run build` to verify nothing else referenced them. 4) Remove the now-obsolete 'legacy tree' warning comment in fallacy-flaw-v2/FallacyApp.tsx.

### H8. Main entry bundle is 3.7MB (1.03MB gzipped) because heavy student surfaces are eagerly imported in App.tsx
**File:** `src/App.tsx:15-37,82`  |  **Category:** performance  |  **Subsystem:** build-perf [re-verified against code 2026-07-09]

**Problem:** Verified by production build: dist/assets/index-0SvvEA64.js is 3,717,309 bytes (1,034,645 gz), plus 467KB CSS (68KB gz), all render-blocking before first paint of any route including /auth. Cause: App.tsx statically imports Practice, SavedSets, AcademyMainhub, Drill (136KB single file, statically imports @rrweb/record at src/pages/Drill.tsx:77), FlaggedQuestions, Analytics, Profile, SettingsLayout, Classroom, CausationStation, Schedule, Bootcamps, Inbox, and IntroToLrBootcamp, which at src/pages/IntroToLrBootcamp.tsx:20 statically imports the entire 2.3MB-source main-conclusion bootcamp (216 files) via '@/bootcamps/main-conclusion/routes'. AcademyMainhub also statically imports recharts via src/components/mainhub/AnalyticsStage.tsx:13, so recharts lands in the entry chunk too. Admin/teacher routes are correctly lazy (App.tsx:42-84), as are some student surfaces (Abstract/PrincipleFlaw/FallacyFlaw bootcamps, Journal, ActivityCentre); the heavy student surfaces listed above are not (Inbox is static at App.tsx:82).

**Fix plan:** 1) Convert the heavy eager page imports in src/App.tsx to React.lazy with the same Suspense fallback pattern already used for teacher routes: IntroToLrBootcamp, Drill, CausationStation, Analytics, Classroom, Practice, SavedSets, Schedule, Inbox, FlaggedQuestions. 2) Keep Auth, Onboarding, AcademyMainhub, StudentShell eager (first-paint surfaces). 3) In AcademyMainhub, lazy-load AnalyticsStage (React.lazy + Suspense around line 608 usage) so recharts leaves the entry chunk. 4) Rebuild and confirm the entry chunk drops well under ~500KB gz. 5) Verify each converted route in the browser per the repo verification rule.

### H9. Production build OOMs Node's default 2GB heap
**File:** `vite.config.ts:1`  |  **Category:** maintainability  |  **Subsystem:** build-perf [re-verified against code 2026-07-09: build re-run at default heap, OOM reproduced]

**Problem:** `npm run build` (plain `vite build`, no NODE_OPTIONS override in package.json; no manualChunks or memory settings in vite.config.ts) dies at default heap (~2.1GB on node v26) with 'FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory' after ~150s of transforming (Mark-Compact at 2029MB/2056MB). Reproduced on 2026-07-09. Any CI/deploy environment with <=2GB node heap will fail the build. Root cause is the app graph itself: ~1,057 TS/TSX files in a single entry with no manualChunks (H8). Correction from re-verification: the vendored reference repos at repo-root `references/` (408MB) are NOT in the Vite graph and are not a driver; the only copy under src/ (`src/references/bootcamps/causation-station`, 708KB) is negligible.

**Fix plan:** 1) Short term: change the build script in package.json to `"build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"` (use cross-env if Windows support matters; it does not here). 2) Real fix: land the H8 route code-splitting, which shrinks the module graph and memory footprint. 3) Verify `npm run build` completes without the env override afterward.

### H10. Duplicate section_history rows: save effect has empty deps and an ineffective savingToHistory guard
**File:** `src/components/drill/LRSectionResults.tsx:154-238`  |  **Category:** bug  |  **Subsystem:** components [verified against code]

**Problem:** The save runs in `React.useEffect(..., [])`. In React 18 StrictMode dev this runs twice, and the guard `if (!user || savingToHistory) return; setSavingToHistory(true);` does not prevent it: both invocations read the same stale `savingToHistory === false` closure before either setState commits. There is also no idempotency key on the insert, so a remount (route re-entry, hot reload) inserts a second identical section_history row and re-logs all wrong answers to the WAJ.

**Fix plan:** Replace the state guard with a ref: `const savedRef = useRef(false); if (savedRef.current) return; savedRef.current = true;` at the top of the effect before any await. Optionally add a client-generated session id column or unique constraint on (class_id, pt, section, created_at-window) server-side for true idempotency.

### H11. Fabricated coach feedback shown when voice-coach edge function fails
**File:** `src/components/drill/VoiceCoachModal.tsx:169-173`  |  **Category:** ux-correctness  |  **Subsystem:** components [verified against code]

**Problem:** processTranscript's catch sets `setCoachReply('Your reasoning shows good effort. Look closely at what the stem is actually asking...')` and transitions to the 'coach-response' phase. The student sees a canned, generic reply presented as if the coach actually analyzed their spoken reasoning. This violates the repo rules 'no fake placeholder data that looks real' and 'errors never swallowed'. Note the same catch also fires when the DB insert at line 157 fails AFTER a successful coach reply, overwriting the real reply with the fake one.

**Fix plan:** 1) In the catch, set an error phase/state instead: setError('Could not process your explanation. Please try again.') and setPhase('idle'). 2) Move the voice_coaching_sessions insert out of the same try block (or wrap it separately) so a logging failure cannot clobber a successful coachReply; check its returned `error` and toast on failure.

### H12. Stale closure in VoiceCoachModal: auto-stop after 20s reads empty transcript and stale stopRecording
**File:** `src/components/drill/VoiceCoachModal.tsx:43-135`  |  **Category:** bug  |  **Subsystem:** components [verified against code]

**Problem:** The stale-closure bug is real, but path (a) is misdescribed: there is no onend handler in the file. The mount-time useEffect assigns recognitionRef.current.onerror (line 66), which calls the first-render stopRecording (line 75) with transcript ''. Path (b), the 20s setInterval auto-stop calling a stale stopRecording, is exactly as described and is the main student-facing bug.

**Fix plan:** Keep the live transcript in a ref: `const transcriptRef = useRef('')`; update it in onresult alongside setTranscript. In stopRecording read transcriptRef.current instead of the state variable. Also route the interval and onend through a stable ref: `const stopRef = useRef(stopRecording); stopRef.current = stopRecording;` and call `stopRef.current()`.

### H13. Flag toggle mutations fail silently in blind review (console.error only, no toast, no state rollback)
**File:** `src/components/drill/BlindReviewFlow.tsx:186 and src/components/drill/EnhancedBlindReview.tsx:199`  |  **Category:** error-handling  |  **Subsystem:** components [verified against code]

**Problem:** Both toggleFlag handlers wrap flagged_questions insert/delete in try/catch with only `console.error('Error toggling flag:', err)`. Per repo rules console.error alone is a swallowed error. In EnhancedBlindReview (line 196) the optimistic `setFlaggedQuestions(prev => new Set([...prev, currentQid]))` runs inside the try after the awaits, but if supabase-js returns `{ error }` without throwing (the normal DB failure mode), the code likely proceeds as success anyway; verify whether the insert result is destructured. Either way the user gets no feedback and the UI can show a flag state that was never persisted.

**Fix plan:** In both files: destructure `const { error } = await supabase.from('flagged_questions')...`; if error, `toast.error('Could not update flag')` and revert the local flag state (setIsFlagged(prev) / remove qid from the Set). Keep console.error for debugging but add the toast.

### H14. inferTypeFromStem uses regex syntax inside String.includes, so several branches can never match
**File:** `src/lib/questionLoader.ts:625`  |  **Category:** bug  |  **Subsystem:** data-layer [verified against code]

**Problem:** Four checks pass regex source strings to `.includes()`, which does literal substring matching: line 625 `lower.includes('most (strongly )?supported')`, line 630 `lower.includes('main (point|conclusion)')` and `lower.includes('expresses the (main )?conclusion')`, line 640 `lower.includes('claim.*figures')`, line 661 `lower.includes('point.*issue')`. No real LSAT stem contains the literal text 'main (point|conclusion)', so these branches are dead. Consequence: questions with a missing/corrupted questionType whose stem says 'most strongly supported', 'main point/conclusion', 'claim ... figures', or 'point at issue' fall through to later weaker branches or to 'Unknown', misclassifying qtype which drives drill filters, manifest counts, and adaptive selection. Also note line 604's `includes('supports')` fires before these, so an MSS stem like 'most supports' is misclassified as Strengthen.

**Fix plan:** In inferTypeFromStem, replace the four literal includes calls with real regex tests: (1) line 625: `if (/most (strongly )?supported/.test(lower) || lower.includes('most justifies')) return 'Most Strongly Supported';` (2) line 630: `if (/main (point|conclusion)/.test(lower) || /expresses the (main )?conclusion/.test(lower)) return 'Main Conclusion';` (3) line 640: `if (lower.includes('role') || /claim.*figures/.test(lower)) return 'Role';` (4) line 661: `if (lower.includes('disagree') || /point.*issue/.test(lower) || lower.includes('dispute')) return 'Agree/Disagree';`. Additionally move the Main Conclusion and Most Strongly Supported checks ABOVE the Strengthen check (line 604) so 'most strongly supported' and 'main conclusion...supported' stems are not swallowed by `includes('supports')`. Verify with `npx vitest run src/lib/questionLoader.test.ts` and add a test asserting inferTypeFromStem('Which one of the following most accurately expresses the main conclusion...') === 'Main Conclusion'.

### H15. wajService discards read errors before write decisions: a transient select failure corrupts or silently skips journal writes
**File:** `src/lib/wajService.ts:64`  |  **Category:** data-integrity  |  **Subsystem:** data-layer [verified against code]

**Problem:** logWrongAnswer (line 64), ensureJournalEntry (line 133), and logCorrectAnswer (line 189) destructure only `{ data: existing }` and never check `error` from the preceding select. If that select fails (network blip, RLS, 401), `existing` is null and: (a) logWrongAnswer takes the insert branch, which either duplicate-inserts or throws a unique-violation, losing the appended history item either way; (b) logCorrectAnswer silently does nothing, so a correct re-attempt after prior misses is never recorded and last_status stays 'wrong'; (c) ensureJournalEntry inserts a fresh neutral entry that races the real one. Additionally, the update path (read history_json, append, write whole array back at lines 73-86 and 206-217) is a non-atomic read-modify-write: two concurrent attempts drop one history item.

**Fix plan:** 1) In all three functions, destructure `{ data: existing, error: readError }` and `if (readError) throw readError;` immediately, before branching. 2) For the concurrency issue, either accept and document it, or replace the read-modify-write with a Postgres RPC (e.g. `append_waj_history(class_id, qid, item jsonb)`) that does `UPDATE ... SET history_json = history_json || item, revisit_count = jsonb_array_length(history_json), last_status = ...` atomically; add the function in a new migration under supabase/migrations/. Step 1 alone is the minimum fix and is a 6-line change.

### H16. QuestionPoolService swallows every failure; resetPool's throw is dead code so pool reset can silently fail
**File:** `src/lib/questionPoolService.ts:143`  |  **Category:** error-handling  |  **Subsystem:** data-layer [verified against code]

**Problem:** supabase-js v2 returns errors in the result object and does not throw, so: markQuestionSeen (lines 37-54) awaits update/insert and never reads `.error` — failures are completely invisible, not even logged; markViewAnswered (line 93) same; resetPool (lines 143-158) awaits the delete without checking `.error`, meaning its `catch { throw error }` can never fire for a DB failure: the UI's 'reset pool' action reports success while zero rows were deleted (user keeps seeing 'pool exhausted'). getQuestionUsage (line 134-137) catches and console.errors, returning an empty Map, which silently disables dedupe so students get repeats with no signal. All of this violates the repo rule that DB mutations never swallow errors.

**Fix plan:** 1) resetPool: capture `const { error } = await query;` and `if (error) throw error;` (remove the useless try/catch or keep it only to rethrow). Callers already expect a throw. 2) markQuestionSeen and markViewAnswered: check `.error` on each update/insert result; since these are fire-and-forget telemetry, either throw and let callers `.catch` with a toast, or at minimum `console.warn` with a comment matching the documented silent-skip pattern in questionExposure.ts, but resetPool and getQuestionUsage are behavior-affecting and must throw. 3) getQuestionUsage: remove the catch-return-empty-Map; rethrow so the caller can surface 'dedupe unavailable' instead of silently serving repeats.

### H17. Semantic search silently broken: gemini-proxy embeds at 768 dims but DB expects vector(3072)
**File:** `supabase/functions/gemini-proxy/index.ts:53`  |  **Category:** bug  |  **Subsystem:** edge-functions [verified against code]

**Problem:** mapEmbedModel() hardcodes every embedding request to 'text-embedding-004' (768 dimensions): `function mapEmbedModel(_model) { return "text-embedding-004"; }`. But the content index migration (supabase/migrations/20260619233835...sql:13,38) declares `embedding vector(3072)` and `match_lsatu_content(query_embedding vector(3072), ...)`, built for gemini-embedding-001. Callers teacher-link-search/index.ts:203 and teacher-operator-chat/index.ts:1124 explicitly request 'google/gemini-embedding-001' but get a 768-dim vector back. Passing it to match_lsatu_content raises a Postgres 'different vector dimensions' error, which is only console.warn'd (teacher-link-search:223, teacher-operator-chat:1157), so EVERY semantic find_link/link-search call silently degrades to FTS/route fallbacks. Same mismatch applies to memory OS vector(3072) columns if this proxy is used to embed.

**Fix plan:** 1. In gemini-proxy mapEmbedModel, map 'gemini-embedding-001' (and the 'google/gemini-embedding-001' alias) to Google's 'gemini-embedding-001' endpoint and pass outputDimensionality if needed; only fall back to text-embedding-004 when explicitly requested. 2. In handleEmbeddings, honor body.model instead of discarding it. 3. Verify one call end to end: embed a query, call match_lsatu_content via SQL, confirm no dimension error. 4. Upgrade the console.warn in both callers to include the error in the response diagnostics so a future regression is visible.

### H18. gemini-proxy is fully unauthenticated (verify_jwt=false, no in-function auth): unbounded third-party LLM spend
**File:** `supabase/functions/gemini-proxy/index.ts:357`  |  **Category:** bug  |  **Subsystem:** edge-functions [verified against code]

**Problem:** config.toml sets `[functions.gemini-proxy] verify_jwt = false`, and the function performs no authorization of its own: it reads GEMINI_API_KEY from env and forwards any POST body to Google. Internal callers pass various headers (Authorization: Bearer LOVABLE_API_KEY, or Lovable-API-Key) but none are checked. Anyone who discovers the public URL `https://<ref>.supabase.co/functions/v1/gemini-proxy/chat/completions` can run unlimited Gemini generations and embeddings on Joshua's API key. This is a direct cost/quota bug (reporting as cost, not security, per scope).

**Fix plan:** 1. Add a shared-secret check at the top of serve(): require a header (e.g. X-Internal-Key) equal to a new EDGE_INTERNAL_KEY secret, or accept only the service-role JWT / LOVABLE_API_KEY compared with constant-time equality. 2. Update every internal caller (tutor-chat, ta-chat, study-chat, teacher-operator-chat, teacher-link-search, activity-coach, analyze-stem-response, motivation-engine, parse-drill-request, polish-message, voice-coach-respond, synthesize-session-bundle) to send that header; they already send LOVABLE_API_KEY in some form, so normalizing on one header name is a small diff. 3. Return 401 otherwise. Keep verify_jwt=false since callers use non-JWT credentials.

### H19. tutor-chat 'fire and forget' events insert never executes (supabase-js builders are lazy thenables)
**File:** `supabase/functions/tutor-chat/index.ts:498`  |  **Category:** bug  |  **Subsystem:** edge-functions [verified against code]

**Problem:** `supabaseClient.from('events').insert({...}); // Fire and forget - don't await` — supabase-js PostgrestBuilder only issues the HTTP request when the builder is awaited or .then() is called. With neither, the coaching_request event is NEVER written. All tutor usage analytics from this path are silently missing, and no error is ever surfaced.

**Fix plan:** Change to `runInBackground(supabaseClient.from('events').insert({...}).then(({ error }) => { if (error) console.error('events insert failed', error); }));` using the existing runInBackground helper at line 90. Then verify a row appears in `events` after one tutor request.

### H20. admin-manage-users set_role: upsert/delete errors ignored, returns success on failure
**File:** `supabase/functions/admin-manage-users/index.ts:223`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions [verified against code]

**Problem:** In the set_role branch, `await admin.from('user_roles').upsert(...)` (line 224) and the `.delete()` (line 228) never destructure or check `error`; the function unconditionally returns `{ success: true }` (line 234). If the mutation fails (constraint, RLS, transient), the admin UI shows the role changed when it did not. This directly violates the repo rule 'DB mutations never swallow errors'. Note: verifyAdmin's role lookup (line 41) also ignores its error, but that fails closed, so it is only a UX issue.

**Fix plan:** Destructure `const { error } = await ...` for both the upsert and delete in set_role; `if (error) throw error;` so the existing catch returns a 500 with the message. Add the same check to the role lookup in verifyAdmin (distinguish DB failure from 'not admin' if desired, or keep fail-closed but log).

### H21. process-email-queue: email_send_log inserts unchecked; a failed 'sent' log breaks dedup and retry accounting
**File:** `supabase/functions/process-email-queue/index.ts:274`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions [verified against code]

**Problem:** Finding is accurate except the 'loops forever / unbounded cost' claim: the TTL check at lines 200-217 moves messages exceeding auth/transactional TTL to the DLQ regardless of failed-attempt accounting, so a permanently broken message with unrecorded failures is retried only until its TTL expires, not indefinitely. The duplicate-send risk and broken retry accounting are real as described.

**Fix plan:** 1. For the 'sent' log insert: check `error`; if the insert fails AND the queue delete fails, do not treat the message as done — log loudly and consider re-attempting the delete once. At minimum: `const { error: logErr } = await ...insert(...); if (logErr) console.error('CRITICAL: sent-log insert failed', { message_id, logErr });` and surface it in the function response payload (e.g. a `log_failures` counter). 2. For the 'failed' log insert: check error; on failure, fall back to using msg.read_ct for the retry budget for that message so retries stay bounded. 3. Apply error checks to the DLQ and rate_limited inserts as well.

### H22. useInbox loads every message in every conversation to compute last-message previews
**File:** `src/hooks/useInbox.ts:107-113`  |  **Category:** performance  |  **Subsystem:** hooks-contexts [verified against code]

**Problem:** One nuance: the full message fetch is not used only for last-message previews; message IDs also feed the attachment-presence check (lines 124-136). But that check needs only IDs, not full bodies, and the unbounded download plus unfiltered realtime re-fetch is accurately described.

**Fix plan:** Replace the unbounded messages query with a per-conversation latest-message fetch: either (a) create a Postgres view/RPC `get_latest_messages(conv_ids uuid[])` using DISTINCT ON (conversation_id) ... ORDER BY conversation_id, created_at DESC and call it via supabase.rpc, or (b) at minimum add `.limit(convIds.length * 5)` as a stopgap. Same for the message_attachments presence check: move it into the same RPC or add a `has_attachments` boolean maintained by trigger. Keep the returned shape { body, created_at, sender_id } so the enrichment code is unchanged.

### H23. useInbox realtime channel listens to unfiltered messages INSERT and triggers full reload per message; hook is also mounted per-consumer
**File:** `src/hooks/useInbox.ts:174-190 and src/hooks/useHubStudents.ts:139`  |  **Category:** performance  |  **Subsystem:** hooks-contexts [verified against code]

**Problem:** Line refs slightly off: the realtime effect is useInbox.ts:171-185 and the useInbox() call inside useHubStudents is line 131, not 139. Also, Supabase realtime respects RLS, so non-admin students only refire on their own conversations; the multiplied-full-reload problem is worst for the admin, exactly as the finding claims.

**Fix plan:** 1) Convert useInbox's conversation list to a TanStack Query with key ['inbox', user?.id] so all mounts share one cache; realtime handlers call queryClient.invalidateQueries instead of loadConversations. 2) Move the realtime subscription into a singleton (module-level subscribe-once helper or a context provider mounted once in App) keyed by user id. 3) In useHubStudents, consume only the derived unread data (e.g. expose a useInboxUnreadStudents() selector over the shared query) instead of the whole hook.

### H24. useInbox swallows every Supabase error; failed queries render an empty inbox silently
**File:** `src/hooks/useInbox.ts:60-160 (loadConversations), 205-240 (useConversationMessages.load), 252-259 (mark-as-read)`  |  **Category:** data-integrity  |  **Subsystem:** hooks-contexts [verified against code]

**Problem:** Every query in loadConversations and useConversationMessages destructures only `data` and ignores `error` (e.g. `const { data: myParts } = await supabase.from('conversation_participants')...`). A failed RLS/network call produces `data = null`, which flows through as an empty inbox / empty thread with loading=false: the student sees 'no messages' instead of an error. The mark-as-read update ends with `.then(() => {})`, discarding its error entirely. This violates the repo rule that DB errors are never swallowed. Messaging is a real product surface, so silently-empty is a truthful-UI violation too.

**Fix plan:** In loadConversations, destructure `error` from each call; on any error, set a new `error` state string (add `const [error, setError] = useState<string|null>(null)` and return it from the hook), keep prior conversations instead of setting [], and console.error with context. Do the same in useConversationMessages.load. For the mark-as-read effect, replace `.then(() => {})` with an async IIFE that checks `error` and console.errors + retries on next open. Update consumers (FloatingMessenger/ThreadList) to render the error state.

### H25. useUserPermissions swallows non-401 fetch errors and serves all-false permissions
**File:** `src/hooks/useUserPermissions.ts:118-136`  |  **Category:** error-handling  |  **Subsystem:** hooks-contexts [verified against code]

**Problem:** Slightly worse than described: since the queryFn returns successfully rather than erroring, query.error is never set for non-session failures, so even the console.error at line 149 never fires; the failure is completely silent. Also note the null-profile-means-denied behavior is intentionally documented (lines 47-48) for RLS 403s, but that rationale does not cover transient network/5xx errors, which are still converted to all-false permissions.

**Fix plan:** After the isSessionDeadError checks, add `if (profileErr) throw profileErr;` and `if (roleErr) throw roleErr;` so TanStack Query records an error instead of caching bogus flags. Set `retry: 2` (excluding SessionExpiredError: use `retry: (count, err) => !(err instanceof SessionExpiredError) && count < 2`). In the return, treat `query.isError && !(query.error instanceof SessionExpiredError)` as loading=false but expose an `error` field so ProtectedRoute can show a retry state rather than LockedModule.

### H26. useSmartboardAutosave marks a scene as saved before the save succeeds, permanently skipping retries after a failure
**File:** `src/hooks/useSmartboardAutosave.ts:74-77`  |  **Category:** bug  |  **Subsystem:** hooks-contexts [verified against code]

**Problem:** performSave sets `lastSignatureRef.current = signature` BEFORE awaiting `save.mutateAsync`. If the mutation throws (offline, RLS, transient error), status becomes 'error' but the signature remains recorded as saved. Every subsequent bumpChange/saveNow with the same scene content hits `if (signature === lastSignatureRef.current) return;` and silently does nothing. The teacher's whiteboard content is never persisted until they draw something new, i.e. real data loss on the smartboard used in live tutoring sessions.

**Fix plan:** Move the signature assignment to after the successful mutateAsync: capture `const signature = ...; if (signature === lastSignatureRef.current) return;` then in the try block, after `sessionIdRef.current = result.id;` add `lastSignatureRef.current = signature;`. In the catch block do NOT update lastSignatureRef (and optionally schedule a retry: setTimeout(() => void performSave(), debounceMs)).

### H27. Achievement query orders by nonexistent 'timestamp' column, silently breaking perfect_10 achievement
**File:** `src/lib/achievementEngine.ts:162`  |  **Category:** bug  |  **Subsystem:** lib-core [verified against code]

**Problem:** checkAccuracyAchievements runs `.from('attempts').select('correct').order('timestamp', { ascending: false })`. The generated types (src/integrations/supabase/types.ts, attempts Row) show the table has only `timestamp_iso`, no `timestamp` column. PostgREST returns an error, `recentAttempts` is null, and the guard `if (recentAttempts && ...)` silently skips, so the 'perfect 10' achievement can never be awarded. The error is never checked or surfaced.

**Fix plan:** 1) Change `.order('timestamp', { ascending: false })` to `.order('timestamp_iso', { ascending: false })`. 2) Destructure `error` from the query result and throw (or at minimum surface it to the caller) instead of relying on the null-data guard. 3) Add a small vitest that mocks supabase and asserts the order column is timestamp_iso.

### H28. questionPoolService mutations never check Supabase errors; try/catch is dead code and resetPool reports success on failure
**File:** `src/lib/questionPoolService.ts:24-159`  |  **Category:** data-integrity  |  **Subsystem:** lib-core [verified against code]

**Problem:** supabase-js never throws on DB errors; it returns `{ error }`. markQuestionSeen (lines 37-54) does `await supabase...update(...)` / `.insert(...)` without reading the result, so RLS or constraint failures are fully silent; the surrounding try/catch + console.error can only catch network-layer throws and is otherwise dead. markViewAnswered (93-96) same. resetPool (145-158) does `await query;` without checking `.error`, then a catch that rethrows, but a failed DELETE never enters the catch, so 'Reset pool' reports success while usage rows remain. This directly violates the repo rule 'DB mutations never swallow errors'.

**Fix plan:** For each mutation: destructure `const { error } = await ...` and `if (error) throw error;`. In markQuestionSeen also check the initial select's error. Remove the console.error-only catches (or rethrow after logging) so callers can toast. In resetPool: `const { error } = await query; if (error) throw error;`. Update callers to catch and show a toast where they currently assume void success.

### H29. updateDailyStats: read-modify-write race plus ignored mutation errors corrupt daily stats and streak inputs
**File:** `src/lib/gamification.ts:124-161`  |  **Category:** data-integrity  |  **Subsystem:** lib-core [verified against code]

**Problem:** updateDailyStats reads the row, then writes `questions_answered: existing.questions_answered + 1` etc. Two attempts answered in quick succession (very common in a drill: each answer triggers this) read the same snapshot and one increment is lost, undercounting questions_answered/xp_earned, which feeds updateStreak's goalReached check. Additionally neither the `.update()` nor the `.insert()` result is checked: `await supabase...update(...)` discards `{ error }`, so a failed write is invisible. The initial `.single()` also errors (PGRST116) when no row exists, and that error is used as the 'insert new' signal only implicitly via null data.

**Fix plan:** 1) Replace read-then-write with an atomic upsert: create a Postgres RPC (e.g. `increment_daily_stats(class_id, date, xp, time_ms, correct)`) doing `INSERT ... ON CONFLICT (class_id, date) DO UPDATE SET questions_answered = daily_stats.questions_answered + 1, ...`, and call it via supabase.rpc. 2) Check and throw on the rpc error. 3) Change function signature to Promise<void> that rejects; update callers to surface failures via toast.

### H30. streakSystem.updateStreak ignores profile update result and all query errors; returned streak may be fiction
**File:** `src/lib/streakSystem.ts:79-88`  |  **Category:** data-integrity  |  **Subsystem:** lib-core [verified against code]

**Problem:** The profile update writing streak_current/longest_streak/last_practice_date discards its result entirely (`await supabase.from('profiles').update({...}).eq(...)` with no error check). If it fails, the function still returns newStreak/streakIncreased as if persisted, the UI celebrates a streak that was never saved, and the next session recomputes from stale data. All three preceding `.single()` reads also ignore `error` (single() errors when 0 rows, which is the normal 'no stats today' case, so real errors are indistinguishable from empty).

**Fix plan:** 1) Use `.maybeSingle()` for daily_stats/profile reads and check `error`, throwing on real failures. 2) Capture `const { error } = await supabase.from('profiles').update(...)` and throw on error so the caller can toast and not show a phantom streak. 3) Consider moving the read-check-write streak logic into a single RPC to avoid the concurrent-tab race on streak_current.

### H31. awardAchievements: insert and XP update errors swallowed, plus xp_total read-modify-write race
**File:** `src/lib/achievementEngine.ts:194-226`  |  **Category:** data-integrity  |  **Subsystem:** lib-core [verified against code]

**Problem:** The `user_achievements` insert result is discarded (`await supabase.from('user_achievements').insert(userAchievements as any)`), so a failed insert still returns the achievements to the caller, which will show 'achievement unlocked' toasts for badges that were never persisted (fake UX state). The xp_total update is a read-then-write (`profile.xp_total + totalXP`) racing with any concurrent XP grant, and its error is also unchecked. Also uses an `as any` cast, which the repo forbids.

**Fix plan:** 1) Check errors on both the insert and the update; throw so checkAndAwardAchievements can decide whether to return the achievements. 2) Replace the xp_total read-modify-write with an atomic RPC (`UPDATE profiles SET xp_total = xp_total + $1 WHERE class_id = $2`). 3) Remove the `as any` cast by typing userAchievements against the generated Insert type.

### H32. Practice hub stats load swallows errors and shows a false 'No attempts yet' state
**File:** `src/pages/Practice.tsx:259-282`  |  **Category:** ux-correctness  |  **Subsystem:** pages [verified against code]

**Problem:** `loadStats` destructures only `data` from the attempts query (`const { data: attempts } = await supabase.from('attempts').select('correct, timestamp_iso').eq('class_id', classId)`); the `error` is discarded with no toast, no console, nothing. On any failure it then calls `setStatsLoaded(true)` with `attempts` undefined, so the page renders '0 Practiced / 0% Accuracy' plus the 'No attempts yet. Start your first drill' empty-state CTA (line 602) to a student who may have hundreds of attempts. This is both a swallowed error and fabricated-looking data, violating two repo rules at once.

**Fix plan:** 1) Destructure `{ data: attempts, error }`. 2) If `error`, set an error state (e.g. `setStatsError(true)`), toast.error('Could not load your stats'), and do NOT set statsLoaded to true (or add a distinct statsError flag). 3) Gate the empty-state CTA at line 602 on `statsLoaded && !statsError && stats.totalAttempted === 0`. 4) Render a small honest fallback ('Stats unavailable') in the All Time band when statsError is true.


### H146. ESLint lints vendored reference repos and Deno edge functions, burying real errors (3,265 problems)
**File:** `eslint.config.js:8`  |  **Category:** config  |  **Subsystem:** scripts-tests [verified against code 2026-07-09]

**Problem:** The flat config's only ignore is `["dist"]` and the lint script is `eslint .`, so lint covers: (a) vendored repos under `references/notion-high-end/` (a single BlockNote subdirectory alone yields 220+ errors, including errors for rules that don't exist in this config like `jest/valid-title`), (b) `supabase/functions/` Deno code linted with browser-only globals (26 errors in tutor-chat alone), (c) `scripts/out` artifacts. Total: 2,747 errors / 518 warnings (~2,508 `no-explicit-any`, 380 `react-refresh/only-export-components`, 63 `exhaustive-deps`, 6 `rules-of-hooks`). Real product-code signal (including the rules-of-hooks violation in M147) is invisible; lint is unusable as a quality gate and very slow.

**Fix plan:** In `eslint.config.js` change the first config object to `{ ignores: ['dist', 'references/**', 'scripts/out/**', 'supabase/functions/**'] }` (or add a separate config block for `supabase/functions` with Deno globals if edge functions should stay linted). Re-run `npm run lint`, then triage the remaining product-code errors, starting with the rules-of-hooks violations (M147).

## MEDIUM (72 findings)

### M33. beforeunload flush cannot complete: async supabase.upsert is killed on tab close, losing up to 800ms of writes
**File:** `src/bootcamps/main-conclusion/persistence/SupabaseSyncedPersistence.ts:47-53`  |  **Category:** data-integrity  |  **Subsystem:** bootcamp-mc

**Problem:** flush() performs an async fetch via supabase-js; in a beforeunload handler the page is torn down before the request completes, and browsers do not guarantee non-keepalive fetches fire at all. Any write made in the last FLUSH_DEBOUNCE_MS (800ms) window before closing the tab (e.g. finishing the last question then closing) is lost from the cloud. The visibilitychange handler mitigates for tab-switches but not direct closes. Data survives locally, but cross-device sync silently misses the final writes.

**Fix plan:** 1) In the beforeunload/pagehide path, serialize pending upserts and send them with fetch(supabaseRestUrl + '/bootcamp_kv', { method: 'POST', keepalive: true, headers: { apikey, Authorization: Bearer <session access token>, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(rows) }) since keepalive requests survive unload. 2) Prefer 'pagehide' over 'beforeunload' (more reliable, works on mobile Safari). 3) Keep the existing visibilitychange flush as-is.

### M34. unlockNext is never given milestone ids it can match: markMilestoneComplete unlock path is dead code
**File:** `src/bootcamps/main-conclusion/hooks/useModuleProgress.ts:201-203 and src/bootcamps/main-conclusion/lib/ordering.ts:96-109`  |  **Category:** dead-code  |  **Subsystem:** bootcamp-mc

**Problem:** markMilestoneComplete calls unlockNext(milestoneId, shape) with a comment 'We'll update the logic in unlockNext to handle milestones.' unlockNext only matches /^\/lessons\/1\.(\d+)$/ or the exact string '/drills/conclusion-type-lab'; a milestone id like 'MC-MIL-x' matches nothing and always returns []. So milestones can never unlock any route despite the code shape implying they do. Either milestones genuinely gate nothing (then the unlockNext call and comment are dead and misleading) or intended unlocks are silently missing.

**Fix plan:** Decide which: if milestones gate nothing, delete the unlockNext call and the stale comment in markMilestoneComplete and just append to completed_milestones. If milestones should unlock routes, add a MILESTONE_UNLOCKS map in ordering.ts and branch in unlockNext on ids starting with 'MC-MIL-'. Add a unit test in lib/__tests__ covering the chosen behavior.

### M35. useModuleProgress initial-load errors are rethrown into the void; progress stays null and LockedRoute renders blank forever
**File:** `src/bootcamps/main-conclusion/hooks/useModuleProgress.ts:74-80 and src/bootcamps/main-conclusion/components/workspace-shell/LockedRoute.tsx:26`  |  **Category:** error-handling  |  **Subsystem:** bootcamp-mc

**Problem:** The initial-load effect catches, console.errors, then `throw e` inside a floating async IIFE: this becomes an unhandled promise rejection that no error boundary sees. progress remains null, and LockedRoute's `if (!progress) return <></>` renders an empty screen indefinitely with no loading or error affordance. Every gated route in the bootcamp goes blank on a load failure.

**Fix plan:** 1) In the hook, add error state: `const [error, setError] = useState<Error | null>(null)`; on catch, setError(e) instead of rethrowing (rethrow inside an unawaited IIFE is useless). 2) Return error from the hook. 3) In LockedRoute, render a distinguishable loading state (spinner/skeleton) while progress is null and error is null, and an error card with retry when error is set.

### M36. 8+ components each run their own useModuleProgress load; concurrent mounts can race to create the default progress row
**File:** `src/bootcamps/main-conclusion/hooks/useModuleProgress.ts:49-85 (consumers: components/IntegratedPathRail.tsx, components/workspace-shell/LockedRoute.tsx, modules/ModuleIndex.tsx, modules/simulator/SimulatorShell.tsx, modules/lessons/Lesson.tsx, modules/lessons/LessonsIndex.tsx, modules/lessons/notes/IntroNotesShell.tsx, modules/drills/DrillsIndex.tsx)`  |  **Category:** performance  |  **Subsystem:** bootcamp-mc

**Problem:** Each consumer instantiates its own hook state, its own get() on mount, and, when no row exists, its own create-default-and-set() (lines 58-72). Several of these mount simultaneously (LockedRoute wraps the page that also uses the hook, plus IntegratedPathRail in the shell), so first-run users trigger multiple concurrent creates of the same row (benign only by luck of identical content) and every completion write in one component is invisible to the others until remount, since state is per-hook, not shared. Also redundant persistence reads on every navigation.

**Fix plan:** 1) Create a ModuleProgressProvider context mounted once in WorkspaceShell that owns the single load/create and the mark* mutators, sharing one state object. 2) Reimplement useModuleProgress as useContext(ModuleProgressContext) keeping the same return signature so no consumer changes. 3) This also fixes stale-progress inconsistency between LockedRoute and page content after a completion.

### M37. useUser writes the users row (and queues a Supabase sync) on every mount of every consumer
**File:** `src/bootcamps/main-conclusion/hooks/useUser.ts:33-58`  |  **Category:** performance  |  **Subsystem:** bootcamp-mc

**Problem:** 30 files call useUser(). Each mount runs the effect, which always writes: either creates the user row or rewrites it with a new last_seen (persist.set on both branches). With SupabaseSyncedPersistence every one of these queues a cloud upsert. Navigating through the bootcamp produces a steady stream of pointless users-row upserts. Also each mount is subject to the same pre-hydration race as module_progress (can recreate a default user row and clobber the cloud copy's name/settings). No error handling on the IIFE either (unhandled rejection if set throws, e.g. localStorage quota).

**Fix plan:** 1) Move user loading into a single provider (or piggyback on the ModuleProgressProvider from the other finding) so the load+last_seen write happens once per session, not per mount. 2) Throttle last_seen updates (e.g. only write if more than 5 minutes since the stored value). 3) Wrap the async body in try/catch and surface errors via state. 4) Await persistence hydration before the null check that creates the row.

### M38. useIntroLrAttempts renders a fake-empty diagnostics state on query failure
**File:** `src/bootcamps/main-conclusion/hooks/useIntroLrAttempts.ts:58-63`  |  **Category:** ux-correctness  |  **Subsystem:** bootcamp-mc

**Problem:** On Supabase error the hook does console.warn then setState({ ...EMPTY, loading: false }): the Diagnostics surface then shows 0 attempts / 0% accuracy as if the student genuinely has no history. Per repo rules this is both a swallowed error and misleading placeholder-looking data; a student with hundreds of attempts sees an empty dashboard with no hint anything failed. Also the hard limit(1000) silently truncates rollups for heavy users with no indication.

**Fix plan:** 1) Add `error: string | null` to IntroLrAttemptsSummary; set it on error and keep attempts empty. 2) In the consuming diagnostics component, branch: error → 'Could not load your attempt history' card with retry; genuinely empty → the existing empty state. 3) For the 1000-row cap, either page with .range() until exhausted or do the aggregation server-side (rpc / select with count) and note truncation in a comment.

### M39. IndexedDBPersistence.get() is not user-scoped: any record fetched by id bypasses the user_id partition
**File:** `src/bootcamps/main-conclusion/persistence/IndexedDBPersistence.ts:45-49`  |  **Category:** data-integrity  |  **Subsystem:** bootcamp-mc

**Problem:** The DB ('mc-bootcamp') is shared across all users on the machine; list() filters via scope(rec.user_id === this.userId) but get() returns whatever row matches the id regardless of owner. Additionally, SupabaseSyncedPersistence.hydrate() writes user A's cloud rows into the same shared stores keyed only by record id; if two accounts are used on one browser and any record id collides (or code fetches by a deterministic id), one user reads/overwrites the other's local rows. remove() likewise deletes without ownership check.

**Fix plan:** 1) In get(), after db.get, apply the same scope() check and return null when rec.user_id exists and mismatches. 2) In remove(), get first and no-op if scoped to another user. 3) Better long-term: include userId in the DB name (`mc-bootcamp:${userId}`) like LocalStoragePersistence does with its key prefix, and migrate by reading old stores once. Option 3 also isolates hydration writes per user.

### M40. Corrupted localStorage progress row is silently treated as missing, triggering a full progress reset
**File:** `src/bootcamps/main-conclusion/persistence/LocalStoragePersistence.ts:17-25`  |  **Category:** data-integrity  |  **Subsystem:** bootcamp-mc

**Problem:** get() returns null on JSON.parse failure with a bare catch. module_progress lives in localStorage (V1Persistence LS_TABLES). If the row is ever corrupted (partial write on quota, external tampering), useModuleProgress sees null, creates a fresh default progress row, persists it, and syncs it to Supabase, wiping the student's unlocks/completions cloud-wide. The corruption is never logged or surfaced.

**Fix plan:** 1) In the catch, console.error with the key and quarantine the bad value (copy raw to `${key}::corrupt` before returning null) so it is recoverable. 2) Combined with the hydration-gate fix, a corrupt local row should fall back to the cloud copy (hydrate re-writes it) rather than a default; ensure the create-default path only runs when both local and cloud have no row.

### M41. Intro to LR bootcamp is statically imported into the main bundle while every other bootcamp is lazy
**File:** `src/App.tsx:36`  |  **Category:** performance  |  **Subsystem:** bootcamp-mc

**Problem:** `import IntroToLrBootcamp from "./pages/IntroToLrBootcamp"` is a static import, whereas AbstractBootcamp, PrincipleFlawBootcamp, FallacyFlawBootcamp, and most pages use React.lazy. IntroToLrBootcamp pulls in routes.tsx, which statically imports ~50 module components (all lesson, drill, simulator, hard-sentences, diagnostics surfaces) plus ~250KB of generated JSON in src/bootcamps/main-conclusion/data/ (lessons 52K, manifest 44K, simulator 32K, calibration 24K, references 24K, etc). The entire 216-file flagship ships in the initial bundle for every visitor, including ones who never open the bootcamp.

**Fix plan:** 1) Change to `const IntroToLrBootcamp = React.lazy(() => import("./pages/IntroToLrBootcamp"))` and ensure the route is already inside the existing Suspense boundary (match the pattern used for PrincipleFlawBootcamp on the adjacent line). 2) Verify no other file statically imports from src/bootcamps/main-conclusion outside the bootcamp itself (grep for '@/bootcamps/main-conclusion' in src/pages and src/components); recordPracticeCompletion is imported by src/pages/Drill.tsx, so consider dynamic import there too or accept that small chunk. 3) Run npm run build and confirm the main chunk shrinks.

### M42. Abstract bootcamp gamification/module progress is device-local and not namespaced per user
**File:** `src/topics/abstract/store/AppContext.tsx:106-139`  |  **Category:** data-integrity  |  **Subsystem:** bootcamps-other

**Problem:** moduleProgress, xpTotal, dailyStreak, and aceBadges persist only to localStorage key `lsatu_abstract_v3_modules` (and cards to `lsatu_abstract_v2_cards`) with no user id in the key and no Supabase write. Consequences: (a) two accounts on the same browser read/overwrite each other's module unlocks, XP, and ace badges (isModuleUnlocked gates content off this cache, so student B can find modules pre-unlocked or locked by student A's state); (b) progress is lost on device switch while lessons/drills hydrate from Supabase, producing inconsistent state (drill attempts present but module rows empty); (c) sign-out does not clear it.

**Fix plan:** 1) Namespace both keys by user id: `lsatu_abstract_v3_modules:${userId}` (fall back to ':anon' pre-auth), reading the key inside the hydration effect once `user` is known instead of in the useState initializer. 2) Migrate: on first load with a namespaced key missing, copy from the legacy un-namespaced key then delete it. 3) Longer term, persist moduleProgress/xp/streak to a Supabase table like the other abstract_* tables so it survives devices; mirror the abstract_lesson_progress pattern in lib/supabase-progress.ts.

### M43. Streak dates computed in UTC, not local time (principle-flaw and abstract)
**File:** `src/bootcamps/principle-flaw/lib/streak.ts:3-5`  |  **Category:** bug  |  **Subsystem:** bootcamps-other

**Problem:** todayISO() returns `new Date().toISOString().slice(0,10)`, i.e. the UTC calendar date. For any US timezone, work completed after 7-8pm local is recorded under tomorrow's date; computeStreak then compares against a UTC 'today'/'yesterday'. A student who studies every evening at 9pm ET gets dates stamped one day ahead, and a student studying at 11pm then 1am (same evening) gets two separate dates or a broken streak. The identical pattern exists in src/topics/abstract/store/AppContext.tsx:609-611 (bumpStreakActivity uses toISOString().slice(0,10) for today and Date.now()-86400000 for yesterday, which is also wrong across DST transitions).

**Fix plan:** 1) Replace todayISO with a local-date formatter: `const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;` (or use toLocaleDateString('en-CA')). 2) In computeStreak, compute yesterday and the probe walk with local date math (setDate on a local Date, format with the same local formatter) instead of toISOString. 3) Apply the same local-date helper in AppContext.bumpStreakActivity for both `today` and `yesterday`.

### M44. Activity attempt log gets duplicate attempt_no values across sessions; documented resume behavior is not implemented
**File:** `src/features/activity-centre/components/ActivityRunner.tsx:71-101`  |  **Category:** data-integrity  |  **Subsystem:** bootcamps-other

**Problem:** progress.ts documents 'resume where you left off' and returns resolvedCount for exactly that, but ActivityRunner deliberately never resumes an in_progress run (comment at lines 71-74: Start begins fresh at question 1); resolvedCount is used by no caller (grep confirms only definition sites). Because ActivityItemView keeps `attempts` in local component state starting at 0 (ActivityItemView.tsx:52), a student who answered items in session 1 and reopens will re-record item 1 with attempt_no 1 again. The migration creating activity_item_responses has no UNIQUE constraint on (assignment_id, item_order, attempt_no), so the 'append-only replay log' accumulates duplicate attempt_no rows; reconstructProgress sorts by attempt_no and treats rows[last] as the resolving attempt, so a prior session's cap-hitting attempt_no 3 can shadow a later correct retry (or vice versa), mis-scoring the teacher-facing ActivityResults view (ActivityResults.tsx:148) and the completed-run summary.

**Fix plan:** 1) Decide the product behavior: either (a) implement resume: in the hydration effect for non-completed assignments, load listItemResponses, run reconstructProgress, seed verdicts/responses/index from resolvedCount, and pass the per-item prior attempt count down so ActivityItemView starts its counter there; or (b) keep fresh-start but make attempt_no globally monotonic per item: before running, fetch the log and pass `maxAttemptNoByItem` into ActivityQuestionStack so ActivityItemView starts at prior max + 1. 2) Either way, add a migration: `ALTER TABLE activity_item_responses ADD CONSTRAINT activity_item_responses_unique UNIQUE (assignment_id, item_order, attempt_no);` after backfilling/deduping existing rows. 3) If choosing (b), fix reconstructProgress to break ties by created_at, and delete resolvedCount or wire it up so the doc comment stops lying.

### M45. Duplicate drill names in fallacy-flaw-v2 DRILLS inflate dashboard stats and render duplicate module cards
**File:** `src/bootcamps/fallacy-flaw-v2/components/Home.tsx:54-68`  |  **Category:** ux-correctness  |  **Subsystem:** bootcamps-other

**Problem:** data/drills.ts contains two entries named 'Value Assumption' (ids value-assumption, value-assumption-2) and two named 'Sleazy Sales Pitch' (sleazy-sales-pitch, sleazy-sales-pitch-2). Home.tsx builds stats per DRILLS entry keyed by drill.name against localStorage `lsat_flaw_performance` (which recordFlawPerformance keys by flaw name). Result: (a) the same saved stats render on two 'Practice Modules' cards for each duplicated name; (b) `totalAttempts` at line 68 double-counts those flaws ('Total Attempted: N Drills' is inflated); (c) 'Method Mastery % Coverage' at line 194 uses DRILLS.length (16) as the denominator while only 14 distinct flaw names can ever accumulate attempts, so 100% coverage is unreachable... actually reachable only because duplicates share stats, but the ratio is still computed over a padded denominator.

**Fix plan:** 1) Dedupe the stat source: in Home.tsx build the module list from FLAW_CATALOG (14 unique flaws) instead of DRILLS, mapping stats by flaw.name. 2) Or dedupe DRILLS by name before mapping: `const uniqueDrills = DRILLS.filter((d,i,arr) => arr.findIndex(x => x.name === d.name) === i)`. 3) Compute totalAttempts and coverage from the deduped list. 4) Since the authored drill content in drills.ts is otherwise unused (see separate finding), prefer option 1 and retire DRILLS from Home entirely.

### M46. fallacy-flaw-v2 data/drills.ts: ~1,000 lines of authored in-app drill content is dead weight (only id/name are read)
**File:** `src/bootcamps/fallacy-flaw-v2/data/drills.ts:1`  |  **Category:** dead-code  |  **Subsystem:** bootcamps-other

**Problem:** GuidedDrills was rewritten to route students into the shared /drill page (comment at GuidedDrills.tsx:2-5), and the only remaining reads of DRILLS are `drill.id`/`drill.name` (Home.tsx:55-64, GuidedDrills.tsx:34-36). The stimulus, conclusionText, supportText, and multi-stage `questions` objects across 1,079 lines are never rendered anywhere. This is a maintainability trap: the file looks like live curriculum content and invites edits that do nothing.

**Fix plan:** 1) Replace DRILLS usage with FLAW_CATALOG (data/flaws.ts) which already carries id + name for all 14 flaws; update Home.tsx and GuidedDrills.tsx imports accordingly (drill.id values already alias-map via normalizeFlawId). 2) Delete data/drills.ts, or if the authored drills are wanted later, move the content to the vault/curriculum corpus rather than shipping it in the bundle. 3) Verify with tsc + build.

### M47. GuidedDrills silently falls back to a random flaw when the targeted module has no tagged questions, and skips the lesson-only minimum gate
**File:** `src/bootcamps/fallacy-flaw-v2/components/GuidedDrills.tsx:42-63`  |  **Category:** ux-correctness  |  **Subsystem:** bootcamps-other

**Problem:** When a student clicks a specific module card in Home (onGoToDrills(drill.id)), GuidedDrills builds targetedMatches; if getQuestionsForFlaw returns 0 questions, `activeMatches` silently becomes ALL matches and startFlawPractice picks a RANDOM flaw (line 63) while the page header still shows the clicked flaw as focusLabel — the student asked for X and gets drilled on Y with no notice. Separately, FlawDrillLauncher enforces MIN_DRILL_QUESTIONS = 4 ('lesson-only' below 4 tagged questions, launcher line 29/46) but GuidedDrills launches a targeted drill with as few as 1 question, so the two entry points disagree about the same inventory.

**Fix plan:** 1) In GuidedDrills, when selectedDrill exists and targetedQuestions.length === 0, do NOT fall back to all matches: show the existing 'No LSAT bank questions are tagged for this exact fallacy yet' message and disable the start button (it already renders that copy at lines 178-182, but the button still launches a random flaw). Concretely: `const activeMatches = selectedDrill ? targetedMatches : matches;`. 2) Export MIN_DRILL_QUESTIONS from flawQuestionMapping.ts (or a shared constants file) and apply the same >=4 gate in GuidedDrills' targeted path, showing the launcher's lesson-only copy.

### M48. chapter_progress analytics mirror failures are console.error-only (swallowed per repo rule) across six call sites
**File:** `src/topics/abstract/store/AppContext.tsx:315-318`  |  **Category:** error-handling  |  **Subsystem:** bootcamps-other

**Problem:** recordChapterProgress failures are logged with console.error and then `return { ok: true }` at AppContext.tsx:317, 423, 461, 562, 658, 725. Per the repo rule 'console.error alone is silent failure', these are swallowed: the student sees success, but the teacher Bootcamps dashboard (which reads chapter_progress) silently drifts out of sync with actual Abstract progress, which is exactly the misleading-analytics failure the product rules forbid. Same pattern at src/features/activity-centre/components/ActivityRunner.tsx:124 (markAssignmentStarted failure only console.error'd, leaving status 'assigned' while the student is mid-run) and recordFlawPerformance's catch (recordFlawPerformance.ts:55-56).

**Fix plan:** 1) For the six AppContext mirror sites: keep the primary write's ok result, but surface mirror failure with a non-blocking toast (e.g. toast.warning('Progress saved, but the teacher dashboard sync failed. It will not reflect this item.')) and/or return `{ ok: true, mirrorFailed: true }` so callers can decide. At minimum consolidate into one helper `mirrorChapterProgress(...)` that toasts once. 2) In ActivityRunner.handleStart, add a toast on markAssignmentStarted failure ('Could not mark this activity as started; your answers will still save.'). 3) In recordFlawPerformance, keep the try/catch (localStorage quota) but add a one-time toast so the student knows dashboard stats will not update.

### M49. Bootcamp progress architecture diverges from the platform pattern: principle-flaw and fallacy-flaw-v2 persist entirely to localStorage
**File:** `src/bootcamps/principle-flaw/PrincipleFlawApp.tsx:146-155`  |  **Category:** architecture  |  **Subsystem:** bootcamps-other

**Problem:** All principle-flaw student state (pf:currentDay, pf:reviewLogs, pf:completedDays, pf:dailyChecklists, pf:streakDates, pf:flashcardSRS, pf:flashcardMastery, pf:questionStatus, pf:redoQueue) and all fallacy-flaw-v2 state (lsat_flaw_performance, fallacyFlaw:v2:*) live only in localStorage. Unlike the abstract topic (Supabase abstract_* tables + chapter_progress mirror) and main-conclusion (Supabase-backed useModuleProgress), these two 'shipped-quality' bootcamps have no cross-device persistence and are invisible to the teacher Bootcamps dashboard. Keys are also not namespaced per user, so multiple accounts on one browser share day position, review logs, and flaw performance (same class of bug as the abstract module cache finding). Profile's reset button wipes state for whichever user happens to be signed in.

**Fix plan:** 1) Short term: namespace every pf:* and fallacyFlaw:v2:* and lsat_flaw_performance key with the auth user id, mirroring the fix for the abstract cache, so accounts stop cross-contaminating. 2) Medium term: add Supabase tables following the abstract_* pattern (pf_day_progress, pf_review_logs; flaw_performance) with the {ok}/{ok:false,error} mutation contract and chapter_progress mirroring, so the teacher dashboard sees these bootcamps. Treat as a staged spec per the repo's audit-first workflow, not a single-pass change.

### M50. Six @tiptap packages plus gsap/@gsap/react are installed but completely unused
**File:** `package.json:23-72`  |  **Category:** dead-code  |  **Subsystem:** build-perf

**Problem:** grep across src/ finds zero imports of any '@tiptap/*' module (six deps: react, starter-kit, pm, suggestion, extension-placeholder, extension-task-item, extension-task-list) and zero imports of 'gsap' or '@gsap/react'. Also 'cobe' is imported only by src/components/ui/feature-section-with-bento-grid.tsx and '@paper-design/shaders' only by src/components/ui/liquid-metal-button.tsx, and neither of those UI files is imported anywhere in src/. '@splinetool/runtime' is never imported directly (only @splinetool/react-spline is, which brings its own runtime).

**Fix plan:** 1) `npm uninstall @tiptap/react @tiptap/starter-kit @tiptap/pm @tiptap/suggestion @tiptap/extension-placeholder @tiptap/extension-task-item @tiptap/extension-task-list gsap @gsap/react cobe @paper-design/shaders @splinetool/runtime`. 2) Delete src/components/ui/feature-section-with-bento-grid.tsx and src/components/ui/liquid-metal-button.tsx. 3) Run `npx tsc --noEmit -p tsconfig.app.json` and `npm run build` to confirm nothing referenced them.

### M51. 156 parallel JSON fetches (~6MB) fire on every app boot via QuestionBankProvider wrapping all routes
**File:** `src/contexts/QuestionBankContext.tsx:19-34`  |  **Category:** performance  |  **Subsystem:** build-perf

**Problem:** QuestionBankProvider wraps the entire /* route block in src/App.tsx:275, and its useEffect calls questionBank.load(), which fetches all 156 files in public/data (~6.1MB total) in parallel on mount (src/lib/questionLoader.ts:736-752) regardless of whether the current route needs questions (e.g. /mainhub, /profile, /schedule). Every fresh page load pays ~6MB of network + parse before the bank is 'ready'. There is no HTTP-cache strategy either: main.tsx deletes all CacheStorage on every load, and the PWA SW was removed, so only default browser cache headers apply.

**Fix plan:** 1) Make loading lazy: remove the eager load() in QuestionBankProvider's effect and expose an ensureLoaded() that pages actually needing questions (Drill, Practice, GuidedDrillStart, Homework) await; or gate load() on routes via useLocation. 2) Alternatively build a single concatenated questions bundle at build time (one fetch, one parse) instead of 156 requests. 3) Keep the loading/error state contract identical so useQuestionBank consumers do not change.

### M52. Per-file question bank load failures are swallowed with console.error only
**File:** `src/lib/questionLoader.ts:742-750`  |  **Category:** data-integrity  |  **Subsystem:** build-perf

**Problem:** In doLoad(), a failed fetch or bad JSON for a section file returns null and logs `console.error('Failed to load ${filename}')`; the overall load resolves successfully with silently missing PTs. Per repo rules console.error alone is a swallowed error. A student could drill against a silently truncated bank with no UI signal, and adaptive selection stats would be skewed.

**Fix plan:** 1) Collect failed filenames in doLoad() and expose them on the manifest (e.g. manifest.failedFiles: string[]). 2) In QuestionBankContext, if failedFiles.length > 0 surface a non-blocking toast ('Some question sets failed to load') and set a degraded flag consumers can read. 3) If ALL files fail, reject doLoad() so the existing error path in the provider fires.

### M53. Render-blocking Google Fonts @import inside bundled CSS, duplicating the Inter link in index.html
**File:** `src/bootcamps/main-conclusion/styles/scoped.css:15`  |  **Category:** performance  |  **Subsystem:** build-perf

**Problem:** scoped.css is @import-ed at the top of src/index.css:2 and contains `@import url('https://fonts.googleapis.com/css2?family=Inter...')`. This ends up at the top of the 468KB bundled CSS file, forcing the browser to fetch a cross-origin stylesheet before applying ANY app CSS (CSS @import is serial and render-blocking). Inter with the exact same weights (400-800) is already loaded via <link> in index.html:17, so it is pure duplicated blocking work. Separately, index.html loads 4 font families x ~5 weights each (Lexend, Outfit, Fraunces variable, Inter), a large blocking font payload for first paint.

**Fix plan:** 1) Delete the @import line from scoped.css (Inter already comes from index.html). 2) Rebuild and confirm the bundled CSS no longer starts with an @import. 3) Optional: audit which of Lexend/Outfit/Fraunces weights are actually used and prune the index.html font URL.

### M54. 82MB of media in public/fallacy-flaw (39MB mp4 + 39MB mp3) ships with every deploy
**File:** `public/fallacy-flaw/bootcamp-video.mp4`  |  **Category:** performance  |  **Subsystem:** build-perf

**Problem:** public/ is 94MB, 82MB of which is public/fallacy-flaw: bootcamp-video.mp4 (39MB), bootcamp-audio.mp3 (39MB), bootcamp-infographic.png (4.2MB). These are copied into dist/ on every build (dist is 121MB) and served from the app host with no CDN/range-request guarantees. Referenced from src/bootcamps/fallacy-flaw-v2/data/videoAssets.ts:21 and src/bootcamps/fallacy-flaw/content/bootcamp/{video,audio}.ts. The 4.2MB PNG is also far beyond a sane image budget.

**Fix plan:** 1) Move bootcamp-video.mp4 and bootcamp-audio.mp3 to object storage (Supabase Storage bucket) and update the two src URLs in videoAssets.ts and content/bootcamp/*.ts to the public storage URLs. 2) Compress bootcamp-infographic.png (webp/avif, target <500KB). 3) Delete the originals from public/ and rebuild to confirm dist shrinks by ~80MB.

### M55. Dead code: retired src/bootcamps/fallacy-flaw (440KB) and never-mounted FloatingWhiteboard still in the graph
**File:** `src/bootcamps/fallacy-flaw/`  |  **Category:** dead-code  |  **Subsystem:** build-perf

**Problem:** 1) src/bootcamps/fallacy-flaw (440KB, the v1 bootcamp) has zero imports from outside itself; the route uses fallacy-flaw-v2 (src/pages/FallacyFlawBootcamp.tsx:16). 2) src/components/whiteboard/FloatingWhiteboard.tsx is imported by nothing (only a comment mention in TemplatePalette.tsx:27); it eagerly imports '@excalidraw/excalidraw/index.css'. 3) src/references/bootcamps/causation-station contains two full copies of an external repo (42 tsx files, incl. its own package.json/index.html) inside src/, which are scanned by the tailwind content glob './src/**/*.{ts,tsx}' and inflate build memory. 4) 'src/components/help/HelpSheet.test 2.tsx' is a stray macOS duplicate file.

**Fix plan:** 1) Delete src/bootcamps/fallacy-flaw/ after confirming its video/audio path constants are not needed (v2 has its own in videoAssets.ts). 2) Delete FloatingWhiteboard.tsx or wire it up; if deleted, also remove whiteboardBus if it becomes orphaned. 3) Move src/references/ out of src/ (e.g. to references/ at repo root, which already exists) or add it to tsconfig/eslint excludes and change the tailwind content glob to exclude it. 4) Delete 'src/components/help/HelpSheet.test 2.tsx'. 5) Run build + tests.

### M56. getUserMedia stream never stopped: microphone stays captured after recording
**File:** `src/components/drill/VoiceCoachModal.tsx:84-108`  |  **Category:** bug  |  **Subsystem:** components

**Problem:** startRecording calls `await navigator.mediaDevices.getUserMedia({ audio: true })` and discards the returned MediaStream. The tracks are never stopped, so the browser's mic-in-use indicator stays lit for the rest of the session (SpeechRecognition manages its own capture; this extra stream is orphaned). The getUserMedia call is only used as a permission probe.

**Fix plan:** Capture the stream and stop it immediately after the permission check: `const stream = await navigator.mediaDevices.getUserMedia({audio:true}); stream.getTracks().forEach(t => t.stop());` or store it in a ref and stop tracks in stopRecording and in the unmount cleanup.

### M57. UPDATE with .order().limit(1) on voice_coaching_sessions is invalid / updates wrong rows, error unchecked
**File:** `src/components/drill/VoiceCoachModal.tsx:176-200`  |  **Category:** data-integrity  |  **Subsystem:** components

**Problem:** handleAction runs `supabase.from('voice_coaching_sessions').update({action_taken}).eq(...).eq(...).order('created_at',{ascending:false}).limit(1)`. PostgREST does not support ordered/limited UPDATEs through these modifiers (supabase-js limit/order on update is not honored as 'update only newest row'); depending on version this either errors or updates every session for that class_id+qid. The returned error is also never checked, and `generate-micro-drill` invoke at line 191 ignores its `error` and silently falls back to an empty question list (dead micro-drill).

**Fix plan:** 1) Select the newest session id first: `const { data } = await supabase.from('voice_coaching_sessions').select('id').eq('class_id',classId).eq('qid',question.qid).order('created_at',{ascending:false}).limit(1).maybeSingle();` then `update().eq('id', data.id)` and check the returned error (toast on failure). 2) For micro_drill, destructure `{ data, error }`, toast on error or empty questions instead of silently passing [].

### M58. DrivePanel initial load has no catch: fetch failure becomes unhandled rejection with silent empty UI
**File:** `src/components/inbox/DrivePanel.tsx:351-360, 376`  |  **Category:** error-handling  |  **Subsystem:** components

**Problem:** `load` is `try { ...await fetchPage... } finally { setLoading(false) }` with no catch, and is invoked fire-and-forget from `useEffect(() => { load(submitted); }, [load, submitted])` and the Refresh button. If the gdrive edge function errors (auth expiry, network), the promise rejects unhandled, the spinner stops, and the panel just shows an empty file list with no error message. Contrast with loadMore (line 369) which correctly toasts.

**Fix plan:** Add `catch (e: any) { toast.error(e?.message ?? 'Failed to load Drive files'); }` to `load`, matching loadMore. Optionally keep an `errored` state to render a retry affordance instead of the empty state.

### M59. QuestionPicker attempt counts: supabase error ignored and query capped at 1000 rows
**File:** `src/components/drill/QuestionPicker.tsx:152-183`  |  **Category:** data-integrity  |  **Subsystem:** components

**Problem:** loadAttempts destructures only `data` from both queries (`const { data: student } = ...`, `const { data: attempts } = ...`). supabase-js never throws for DB errors, so the try/catch + console.error at line 178 is dead for DB failures: errors are fully silent and the 'Attempts' column just shows 0s. Separately, `.from('attempts').select('qid').eq('class_id', ...)` has no `.limit()`; Supabase caps responses at 1000 rows by default, so any student with >1000 attempts gets silently truncated, understated attempt counts (misleading 'fresh question' signals).

**Fix plan:** 1) Destructure and check `error` on both queries; on failure toast once ('Could not load attempt history') or at minimum render an indicator. 2) Replace the raw row fetch with an aggregate: either paginate with `.range()` in a loop until exhausted, or better, create/use an RPC that returns qid,count(*) grouped, avoiding shipping every attempt row to the client.

### M60. Student list load failure silently renders empty assign UI
**File:** `src/components/homework/StudentAssignSection.tsx:36-38`  |  **Category:** error-handling  |  **Subsystem:** components

**Problem:** On profiles query error the code does `console.error('[homework:students:list] failed', { error }); setStudents([]);` with no toast. The admin assigning homework sees an empty student list indistinguishable from 'no students exist', a misleading state per the truthful-UI rule.

**Fix plan:** Add `toast.error('Could not load students', { description: error.message })` next to the console.error, and/or keep an `errored` flag to render 'Failed to load students. Retry' instead of the empty list.

### M61. RecentPerformanceWidget and BadgeGallery swallow fetch errors, showing empty state as if no data
**File:** `src/components/dashboard/RecentPerformanceWidget.tsx:47-51 and src/components/gamification/BadgeGallery.tsx:55-57,86-90`  |  **Category:** error-handling  |  **Subsystem:** components

**Problem:** Both widgets catch fetch failures with console.error only and then render their normal empty/zero states. RecentPerformanceWidget shows 'no recent sections' after a failed query; BadgeGallery silently shows no earned badges (loadClassId failure at line 55 additionally means achievements never scope to the student). Per repo rules console.error alone is a swallowed error, and the resulting UI is a misleading state.

**Fix plan:** In each catch, set an `error` state and render a small inline error row with a retry button (preferred for passive widgets over toast spam). At minimum: `toast.error('Could not load recent performance')`. For BadgeGallery, propagate the classId load failure into the same error state rather than proceeding.

### M62. QuestionPicker filter-count helpers do full-bank scans per option per render
**File:** `src/components/drill/QuestionPicker.tsx:186-214`  |  **Category:** performance  |  **Subsystem:** components

**Problem:** getQTypeCount/getReasoningCount/getFeatureCount are plain functions (not memoized) that each call `questionBank.getAllQuestions()` and run up to 5 sequential .filter passes over the whole ~2500-question bank. They are invoked once per option row when the filter popovers render, i.e. dozens of full-bank scans on every keystroke in qtypeSearch/reasoningSearch/featureSearch and on every filters state change, since any state change re-renders this 1737-line component. This is O(options x bank x filters) work in render.

**Fix plan:** Precompute counts in useMemo keyed on `filters`: build the base filtered array once per exclusion dimension (e.g. `questionsExceptQtype = useMemo(...)`), then reduce into a `Map<string, number>` of counts per qtype/reasoning/feature in a single pass each. Replace the helper calls in JSX with map lookups.

### M63. useInbox loadConversations ignores errors from all six queries; any failure renders a silently empty inbox
**File:** `src/hooks/useInbox.ts:62`  |  **Category:** error-handling  |  **Subsystem:** data-layer

**Problem:** Every query in loadConversations destructures only `data`: conversation_participants (line 62), conversations (line 78), allParts (line 84), the get_conversation_participant_names RPC (line 95), messages (line 110), message_attachments (line 128). If the first query fails, `myParts` is null, convIds is empty, and the hook sets an empty conversation list with loading=false: the student sees 'no messages' when messages exist, with no error state and nothing surfaced. useConversationMessages.load (line 214) has the same pattern. This is a real-messaging feature, so a silent empty state is a UX-correctness failure, not just hygiene.

**Fix plan:** 1) For each query destructure `{ data, error }` and on error: set an `error` state on the hook (add `const [error, setError] = useState<string|null>(null)`), setLoading(false), and return early; expose `error` from the hook return. 2) In the consuming components (ThreadList / FloatingMessenger in src/components/inbox/), render a retry-able error state when `error` is set instead of the empty-inbox state. 3) Apply the same to useConversationMessages.load and to the mark-as-read update at lines 253-258 (currently `.then(() => {})`, error fully ignored; at least log and retry on next open).

### M64. useInbox fetches every message in every conversation just to compute last-message previews
**File:** `src/hooks/useInbox.ts:110`  |  **Category:** performance  |  **Subsystem:** data-layer

**Problem:** Lines 110-114 select id/body/created_at/sender_id from `messages` for ALL of the user's conversations with no `.limit()`, then keep only the first row per conversation (lines 117-122). Payload grows linearly with total message history forever (for the admin, across every student thread). Worse, this full reload is triggered by the realtime subscription at line 175, which listens to INSERTs on the entire `messages` table with no filter, so every message anywhere re-runs the whole 6-query pipeline. Attachment presence (lines 126-136) then does `.in('message_id', allMsgIds)` with an unbounded id list, which can exceed URL length limits as history grows.

**Fix plan:** 1) Replace the all-messages fetch with a bounded query per batch: either a Postgres view/RPC `latest_message_per_conversation(conv_ids uuid[])` using `DISTINCT ON (conversation_id) ... ORDER BY conversation_id, created_at DESC`, or at minimum add `.limit(convIds.length * 20)` as a stopgap. 2) Compute hasAttachments in the same RPC or add a `has_attachments` boolean maintained by trigger, eliminating the unbounded `.in(allMsgIds)` query. 3) Scope the realtime messages subscription: keep the unfiltered INSERT listener but debounce loadConversations (e.g. 500ms trailing) so bursts collapse to one reload.

### M65. Question bank boot fires ~155 individual fetches for 6.1 MB of JSON on every cold load
**File:** `src/lib/questionLoader.ts:739`  |  **Category:** performance  |  **Subsystem:** data-layer

**Problem:** JSON_FILES lists 155 section files (all present in public/data, 6.1 MB total). doLoad fetches all of them in parallel with `Promise.all(JSON_FILES.map(fetch))` on first QuestionBank use. That is a 155-request burst per uncached visitor (HTTP/2 helps but mobile/Lovable CDN cold starts still pay ~6 MB + per-request overhead), plus 155 JSON.parse calls and the full normalization pass on the main thread, blocking interaction on drill entry. There is also no persistence: every hard reload re-downloads and re-normalizes everything. The hand-maintained JSON_FILES list is itself a maintainability hotspot (currently in sync with disk, verified, but every ingest batch requires editing this 190-line array; a typo silently drops a section because fetch failures return null, see separate finding).

**Fix plan:** 1) Add a build/import step (extend the existing scripts/ ingest tooling) that concatenates all section files into one gzipped `public/data/lr-bank.json` plus a small manifest; doLoad fetches that single file first and falls back to per-file fetches if absent. 2) Generate the file list at build time (e.g. a `public/data/index.json` written by the ingest script) instead of the hardcoded JSON_FILES array. 3) Optionally cache the parsed bank in IndexedDB keyed by a content hash from the manifest to skip re-download on repeat visits.

### M66. Failed section-file fetches silently shrink the question bank (console.error only)
**File:** `src/lib/questionLoader.ts:742`  |  **Category:** data-integrity  |  **Subsystem:** data-layer

**Problem:** In doLoad, a non-ok response returns null with no logging at all (line 743 `if (!response.ok) return null;`) and a thrown fetch error is console.error'd and nulled (lines 747-750). Non-array JSON also returns null silently (line 745). The bank then loads 'successfully' with missing sections: drill filters, PT pickers, and manifest counts all quietly reflect the smaller pool. Per repo rules console.error alone counts as swallowed. A student mid-session on a flaky network could get a bank missing dozens of sections with zero UI signal.

**Fix plan:** 1) Collect failed filenames during doLoad: `const failed: string[] = []` and push on every null path including !response.ok and non-array. 2) After the loop, if failed.length > 0, expose it on the manifest (add `failedFiles: string[]` to QuestionManifest) and surface it in QuestionBankContext so the drill setup UI can show a non-blocking warning banner ('N question sections failed to load, refresh to retry'). 3) If failed.length === JSON_FILES.length, throw from doLoad so load() rejects and callers show a real error instead of an empty bank.

### M67. moveToDlq failure leaves message in live queue while logging it as DLQ'd
**File:** `supabase/functions/process-email-queue/index.ts:70`  |  **Category:** error-handling  |  **Subsystem:** edge-functions

**Problem:** moveToDlq inserts a status='dlq' log row FIRST, then calls the move_to_dlq RPC. If the RPC errors it is only console.error'd (line 77) and the function `continue`s. Result: the send log says the message went to the DLQ, but the message remains in the live queue and will be re-processed next cycle (TTL/maxretry check will call moveToDlq again, inserting another 'dlq' log row each cycle, forever if the RPC keeps failing). The log and the queue disagree, and the retry loop is unbounded.

**Fix plan:** 1. Reorder: run the move_to_dlq RPC first; only insert the 'dlq' email_send_log row after the RPC succeeds. 2. If the RPC fails, insert a 'failed' log row (so retry accounting still advances) and include a dlq_failures counter in the response JSON so the cron caller can alert. 3. Check the log-insert error per the previous finding.

### M68. send-transactional-email: template render/subject exceptions escape handler (500 without CORS), and 'pending' log rows are never terminalized
**File:** `supabase/functions/send-transactional-email/index.ts:324`  |  **Category:** error-handling  |  **Subsystem:** edge-functions

**Problem:** Two issues. (a) There is no try/catch around the body of Deno.serve: if `renderAsync(...)` (lines 324-330) or a dynamic `template.subject(templateData)` (line 335) throws (bad templateData is caller-controlled), Deno returns a generic 500 WITHOUT corsHeaders, so browser callers see an opaque CORS failure instead of an error message, and no 'failed' email_send_log row is written even though a 'pending' row was about to be / other rows exist. (b) The 'pending' row inserted at line 342 (error also unchecked) is never updated: process-email-queue inserts a separate 'sent'/'failed' row keyed by message_id, so every email permanently leaves a stale 'pending' row in email_send_log. Any admin surface or metric reading statuses will over-count pending sends.

**Fix plan:** 1. Wrap steps 4-5 (render, subject resolution, enqueue) in try/catch; on throw, insert a 'failed' email_send_log row with the error message and return a 500 JSON response WITH corsHeaders. 2. Either (preferred) have process-email-queue UPDATE the pending row's status instead of inserting new rows, or document that email_send_log is append-only per-message history and make any reader take the latest row per message_id; if choosing the latter, add a comment at line 342. 3. Check the pending-insert error and log it.

### M69. gcal-sync-pull: all schedule_events upserts/updates ignore errors — events silently dropped, sync token advanced anyway
**File:** `supabase/functions/gcal-sync-pull/index.ts:104`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions

**Problem:** The cancelled-event update (lines 93-95), the main upsert (lines 104-119), the sync-state clear (line 83), and the final sync-state update (lines 127-131) never check the returned `error`. If an upsert fails (constraint, type mismatch on a weird event), the event is counted in `processed` and, worse, `nextSyncToken` is still persisted, so incremental sync will never revisit that event: it is permanently missing from schedule_events with zero signal. The calendar-corroboration logic in scan-session-notes then quietly loses confidence signals too.

**Fix plan:** 1. Destructure `{ error }` from each upsert/update; collect failures into an `errors: string[]` array. 2. If any event upsert failed, do NOT persist nextSyncToken (keep the old token so the next run retries the window) and return `{ ok: false, processed, errors }` with status 500 so the cron/admin caller sees it. 3. Check the final gcal_sync_state update error and log/throw.

### M70. generate-micro-drill returns hardcoded fake placeholder questions
**File:** `supabase/functions/generate-micro-drill/index.ts:29`  |  **Category:** ux-correctness  |  **Subsystem:** edge-functions

**Problem:** The function ignores its inputs (qtype, difficulty, currentQid) and returns two invented rows: `{ qid: 'micro-<timestamp>-1', pt: 120, section: 2, qnum: 5 }` etc., with the comment 'For now, return placeholder questions'. These qids do not exist in the bank, so any consumer either shows a broken drill or silently fabricates a practice experience. This violates the repo rules 'no fake placeholder data that looks real' and 'do not expose actions users cannot actually perform'. It is also dead-weight LLM-era scaffolding with auth overhead but no function.

**Fix plan:** Pick one: (a) implement it — query the question bank for up to N questions matching qtype/difficulty excluding currentQid and return real qids; or (b) delete the function, remove its config entry, and remove/disable the client caller (grep src/ for 'generate-micro-drill'). If a caller exists and the feature is not ready, have the client hide the entry point rather than call a stub.

### M71. voice-coach-respond swallows ALL errors and returns a canned coaching reply as if generated
**File:** `supabase/functions/voice-coach-respond/index.ts:125`  |  **Category:** ux-correctness  |  **Subsystem:** edge-functions

**Problem:** The top-level catch returns HTTP 200 with a fixed string ('Your reasoning shows good effort. Look closely at what the stem is actually asking...') for ANY failure: malformed request body, missing question.answerChoices (line 75 would throw on undefined index), gateway 5xx, JSON parse failure. The student sees what looks like a personalized voice-coach response that never read their transcript. The `fallback: true` flag exists but the error itself is never logged (catch(error) does not console.error the error) and never surfaced. Same canned line is also used at line 111 when the model returns empty content. This both swallows errors (repo rule) and fabricates coaching.

**Fix plan:** 1. In the catch: `console.error('voice-coach-respond error', error);` then return a real error response ({ error: 'Coach unavailable, try again' }, status 500 with CORS) instead of fake coaching. 2. Keep a graceful degraded message only for the 429 path (already handled at line 98). 3. Update the client to render the error state honestly. 4. Add validation that question.answerChoices and selectedAnswer exist before building the prompt.

### M72. teacher-operator-chat send_message: participant insert unchecked — message can land in a thread the student cannot see
**File:** `supabase/functions/teacher-operator-chat/index.ts:1019`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions

**Problem:** In the send_message tool, when no shared conversation exists it inserts a conversations row (checked), then inserts BOTH conversation_participants rows with no error check (lines 1019-1022), then inserts the message. If the participants insert fails, the message insert still proceeds into a conversation with no participants: the admin is told 'sent' (tool returns ok with message_id) but the student can never see it (RLS on participants), and the admin's own thread list may not show it either. This is the direct-send path used by the Teacher Desk 'send_student_message' action (line 1458), so a real student message can silently vanish.

**Fix plan:** Destructure `const { error: pErr } = await admin.from(table('conversation_participants')).insert([...]);` and `if (pErr) throw pErr;` before inserting the message. The existing runTool catch will convert it to `{ ok: false, error }` which the desk already renders.

### M73. ta-agent deterministic email command: duplicate-send risk and lost audit on persist failure
**File:** `supabase/functions/ta-agent/index.ts:923`  |  **Category:** error-handling  |  **Subsystem:** edge-functions

**Problem:** The `email <student>: <msg>` lane sends via Gmail (line 923) BEFORE persisting the turns (line 930). persistTurns throws if the assistant-turn insert fails ('Response generated but failed to persist.', line 441), which the outer catch converts to a 500. The admin sees an error, assumes the email failed, retries, and the student gets the email twice — there is no idempotency on sendGmailMessage. Additionally, the admin-turn insert error inside persistTurns is only console.error'd (line 426), so the admin side of the transcript can silently go missing while the assistant side persists.

**Fix plan:** 1. Wrap persistTurns for the email path in its own try/catch: if persistence fails AFTER a successful send, still return 200 with `content: 'Email sent to X (logging failed)'` so the admin does not retry the send. 2. Treat the admin-turn insert error the same as the assistant-turn error (throw), or at least include a persisted:false flag in the response. 3. Optional hardening: dedupe sends by hashing (student_id + message) into a short-lived table before calling Gmail.

### M74. tutor-chat cache/log writers never check supabase errors; try/catch guards code that cannot throw
**File:** `supabase/functions/tutor-chat/index.ts:140`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions

**Problem:** writeTutorCache (lines 140-151) and logTutorTurns (lines 154-164) do `await supabase.from(...).upsert/insert(...)` inside try/catch, but supabase-js does not throw on DB errors — it returns { error }. The error is never read, so the catch (which would console.error) never fires and cache/interaction-log write failures are 100% silent. The question_tutor_cache is the cost-saving layer (avoids re-generating explanations) and tutor_interaction_log is the audit trail; both can be failing invisibly. Same pattern in readTutorCache/fetchToneExemplars (errors ignored, but those are read-only best-effort so acceptable). getCoachingKnowledge's catch also logs 'Error fetching coaching knowledge' without the error object (line 357).

**Fix plan:** In writeTutorCache: `const { error } = await supabase.from('question_tutor_cache').upsert(...); if (error) console.error('tutor cache write failed', error);`. Same for logTutorTurns. Include the error object in getCoachingKnowledge's console.error. Since these run via runInBackground, console.error with the real error is the correct surfacing mechanism here (no user response to attach to), but the error must actually be captured.

### M75. synthesize-session-bundle: ledger update after draft creation unchecked — regenerate can orphan drafts
**File:** `supabase/functions/synthesize-session-bundle/index.ts:290`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions

**Problem:** After inserting/updating the ai_ta_drafts row, the session_ingestions update that records draft_id and status 'drafted' (lines 290-293) ignores its error. If it fails, the ledger still says 'stored' with no draft_id, so the next synthesis call takes the insert path (line 273) and creates a second draft for the same session; the first becomes an orphan the review UI may still list. The 'already_drafted' guard (line 174) depends entirely on this write.

**Fix plan:** Destructure the error from the session_ingestions update; if it fails, return `{ ok: true, draft_id, warning: 'ledger_update_failed' }` (draft exists, so not a hard failure) and console.error with ledgerId + draftId, or throw and instruct the admin to retry with regenerate:true. Prefer throwing plus deleting the just-created draft to keep the pair atomic.

### M76. UserSettingsContext loads stored settings without merging defaults; new setting keys are undefined for existing users
**File:** `src/contexts/UserSettingsContext.tsx:24-38`  |  **Category:** data-integrity  |  **Subsystem:** hooks-contexts

**Problem:** The initializer does `return JSON.parse(stored)` verbatim. Any user whose localStorage 'userSettings' predates a newly added field (e.g. recycleAfterDays, defaultTimingMode, preferUnseen were clearly added over time) gets `undefined` for those keys forever, since updateSettings only spreads the stored object. Consumers doing `settings.recycleAfterDays` get undefined, `settings.defaultTimingMode` breaks timing-mode switches, and boolean toggles read as falsy regardless of intended default (e.g. tutorEnabled default true becomes undefined/false-ish only if key missing). Also the defaults object is duplicated twice in the file.

**Fix plan:** Extract `const DEFAULT_SETTINGS: UserSettings = {...}` once at module scope. In the initializer: `try { const parsed = JSON.parse(stored); return { ...DEFAULT_SETTINGS, ...parsed }; } catch { return DEFAULT_SETTINGS; }` and `return DEFAULT_SETTINGS;` for the no-stored branch. Optionally validate types of parsed keys before merging.

### M77. AuthContext.provisionStudentRecord swallows both the select and insert errors
**File:** `src/contexts/AuthContext.tsx:54-70`  |  **Category:** data-integrity  |  **Subsystem:** hooks-contexts

**Problem:** provisionStudentRecord destructures only `data: existing` from the students select and completely ignores the result of `supabase.from('students').insert(...)`. If the select errors (e.g. transient failure), `existing` is null and the code attempts an insert that may violate uniqueness; if the insert fails, the students row that the entire class_id resolution invariant depends on (see useClassId) silently never exists. useClassId then permanently logs a fallback warning and every write keyed by class_id relies on the user.id fallback. It is also fire-and-forget from markReady with no await or catch, so a rejected promise is unhandled.

**Fix plan:** Check both errors: `const { data: existing, error: selErr } = ...; if (selErr) { console.error('[auth] students lookup failed', selErr); return; }` and `const { error: insErr } = await supabase.from('students').insert(...); if (insErr && insErr.code !== '23505') console.error('[auth] students provision failed', insErr);` (23505 = concurrent insert race, benign). In markReady, call `void provisionStudentRecord(s.user.id).catch(e => console.error('[auth] provision crashed', e));` so the rejection is handled.

### M78. useStudyChat SSE parser drops deltas when a data: line is split across network chunks
**File:** `src/hooks/useStudyChat.ts:138-162`  |  **Category:** bug  |  **Subsystem:** hooks-contexts

**Problem:** The stream loop does `const lines = chunk.split("\n")` per chunk with no carry-over buffer. SSE frames routinely split mid-line across TCP chunks; a partial `data: {"choices":...` at a chunk boundary either fails the `line.startsWith("data:")` check or JSON.parse throws and is silently skipped (`catch { /* skip malformed SSE line */ }`). Result: missing words in the streamed tutor answer, and the loss is persisted because `accumulated` becomes the final message content.

**Fix plan:** Add a `let buffer = "";` before the loop. Per chunk: `buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() ?? "";` then process `lines` as today. After the read loop, process any remaining complete line in `buffer`.

### M79. useStudyChat finalizes the assistant message from a stale tabs closure, clobbering changes made during streaming
**File:** `src/hooks/useStudyChat.ts:164-176 (and the identical catch path)`  |  **Category:** bug  |  **Subsystem:** hooks-contexts

**Problem:** After the await-heavy stream completes, `const tabNow = tabs.find((t) => t.id === activeTabId)` reads the `tabs` array captured when send() was invoked, then calls `appendToTab(activeTabId, [...(tabNow?.messages ?? nextMessages), assistantMsg])` which REPLACES the tab's messages with that stale snapshot plus the reply. If the user hits clearActiveTab (or any other tab mutation lands) while the response is streaming, those changes are silently reverted when the reply arrives. Same in the error path.

**Fix plan:** Replace the snapshot-replace with a functional append: change appendToTab (or add appendMessageToTab) to `setTabs(prev => prev.map(t => t.id === tabId ? { ...t, messages: [...t.messages, msg] } : t))` and call it with just the assistantMsg/errorMsg. Remove the `tabNow` lookups.

### M80. useOperatorChat ignores errors on operator_messages inserts; displayed turns may never persist
**File:** `src/hooks/useOperatorChat.ts:214 and 240-245`  |  **Category:** data-integrity  |  **Subsystem:** hooks-contexts

**Problem:** `await supabase.from('operator_messages').insert({ conversation_id: convId, role: 'user', content: text });` and the assistant-message insert both discard the returned `{ error }`. If either insert fails (RLS, size limit), the UI shows the conversation normally but reopening it later silently loses those turns, and subsequent `history` built from persisted rows diverges from what the user saw. The conversation title update at line ~218 also ignores its error. loadMessages/loadConversationList similarly destructure only data.

**Fix plan:** Destructure and check error on both inserts; on user-message insert failure, throw so the existing catch path marks the placeholder with the error. On assistant-message insert failure, console.error with conversation id AND surface via setError (message still shown in memory, but the operator should know it did not save). Add error checks (setError) to loadMessages and loadConversationList.

### M81. useTAChat confirmAction ignores errors on the ta_interactions status updates
**File:** `src/hooks/useTAChat.ts:214-231 (confirmAction mutationFn)`  |  **Category:** data-integrity  |  **Subsystem:** hooks-contexts

**Problem:** After executeActionProposal succeeds, `await supabase.from('ta_interactions').update({ action_status: 'confirmed' }).eq('id', interactionId);` discards the result, and the failure-path update to 'failed' does the same. If the status update errors, the interaction stays 'pending' in the DB while the action actually ran: the UI (after invalidation/realtime) re-shows a confirm button for an action that already executed, inviting a double execution.

**Fix plan:** Capture `const { error } = await ...update(...)` in both branches. In the success branch, if error, console.error and throw new Error(`Action ran but status update failed: ${error.message}`) so the UI toasts and the operator knows not to re-confirm. In the catch branch, if the 'failed' update errors, console.error it (the original error is already being rethrown).

### M82. useStudentAnalytics silently ignores profile and daily_stats errors and can compute analytics before the question bank loads
**File:** `src/hooks/useStudentAnalytics.ts:817-856`  |  **Category:** bug  |  **Subsystem:** hooks-contexts

**Problem:** Two issues: (1) only `attemptsRes.error` is thrown; `profileRes.error` and `todayRes.error` are ignored, so a failed profile read renders streak current/longest 0 and goal 5 as if real (violates the no-fake-data rule for the mainhub widgets). (2) The queryFn calls `questionBank.getQuestion(qid)` synchronously; QuestionBankProvider loads the bank asynchronously, so if this query runs first, every lookup returns undefined and computeStudentAnalytics buckets everything without reasoningType/questionFeatures. The wrong result is then cached under ['student-analytics', classId] with no invalidation when the bank finishes loading.

**Fix plan:** (1) Add `if (profileRes.error) throw profileRes.error; if (todayRes.error) throw todayRes.error;` (or degrade with an explicit `streak: null` so the UI shows an honest empty state). (2) At the top of queryFn add `if (!questionBank.isReady()) await questionBank.load();` (load() should be idempotent; it is used that way in QuestionBankContext), guaranteeing categorization data is present before computing.

### M83. Streak and daily-stats day boundary uses UTC, not the student's local timezone
**File:** `src/lib/streakSystem.ts:16-17 (also gamification.ts:95,130)`  |  **Category:** ux-correctness  |  **Subsystem:** lib-core

**Problem:** `new Date().toISOString().split('T')[0]` yields the UTC date. A US student practicing at 8pm ET writes stats to tomorrow's row and streak checks compare against UTC 'today'/'yesterday'. Practicing at 8pm and again the next morning local time can count as the same UTC day (no increment) or skip a day (streak wrongly broken). Every daily_stats consumer inherits the same shifted boundary.

**Fix plan:** Create one helper, e.g. `localDateKey(d = new Date())` returning `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` in local time, in a shared module (src/lib/time.ts). Replace all `toISOString().split('T')[0]` occurrences in streakSystem.ts and gamification.ts (and audit other daily_stats writers) with it. Compute 'yesterday' by subtracting one calendar day from the local date, not Date.now()-86400000.

### M84. checkStreakAtRisk ignores the student's custom daily goal
**File:** `src/lib/streakSystem.ts:124`  |  **Category:** bug  |  **Subsystem:** lib-core

**Problem:** updateStreak honors `profile.daily_goal_questions || QUESTIONS_PER_DAY_GOAL`, but checkStreakAtRisk compares `questionsToday < QUESTIONS_PER_DAY_GOAL` (hardcoded 5). A student with a goal of 3 who answered 4 today is safe per updateStreak but still flagged 'streak at risk'; a student with goal 10 who answered 6 is told they're safe when they're not.

**Fix plan:** Select `daily_goal_questions` in the profile query (already selecting from profiles at line 105-109; add the column) and compare `questionsToday < (profile.daily_goal_questions || QUESTIONS_PER_DAY_GOAL)`.

### M85. inferTypeFromStem passes regex source strings to String.includes, so several qtype inferences can never match
**File:** `src/lib/questionLoader.ts:625-640`  |  **Category:** bug  |  **Subsystem:** lib-core

**Problem:** These branches use literal regex syntax inside `.includes()`: line 625 `lower.includes('most (strongly )?supported')`, line 630 `lower.includes('main (point|conclusion)')` and `'expresses the (main )?conclusion'`, line 640 `'claim.*figures'`, line 661 `'point.*issue'`. `.includes` does substring matching, so none of these ever match a real stem. Consequences: 'Which one of the following most accurately expresses the main conclusion' stems with corrupted/missing questionType fall through (likely mislabeled 'Strengthen' via includes('supports') at line 604, or 'Unknown'), and Most Strongly Supported inference only fires on 'most justifies'. This skews qtype normalization, the manifest, and the adaptive engine's per-type mastery.

**Fix plan:** Replace the pseudo-regex strings with real checks: `/(main point|main conclusion|expresses the (main )?conclusion)/.test(lower)` for Main Conclusion (and move it ABOVE the Strengthen check, since MC stems contain no strengthen words but 'supports' ordering is fragile), `/most (strongly )?supported/.test(lower)` for MSS, `/claim.*figures/.test(lower)` for Role, `/point at issue|point.*issue/.test(lower)` for Agree/Disagree. Add unit tests in questionLoader.test.ts with real LSAT stems for each branch.

### M86. Adaptive engine hydration failure is permanent for the session and only console-logged
**File:** `src/lib/adaptiveEngine.ts:139-201`  |  **Category:** error-handling  |  **Subsystem:** lib-core

**Problem:** loadHydrationFromDB on error sets `this.hydrated = true` and status 'failed' with only console.warn/console.error. ensureHydratedFromDB early-returns when status === 'failed', so a single transient network blip means the engine runs the whole session with zero history: cooldowns empty (immediate repeats allowed), ability defaults, cold-start behavior, with no retry and no signal to the UI beyond a status getter that callers must poll.

**Fix plan:** 1) On failure, do NOT set hydrated = true; leave status 'failed' but allow ensureHydratedFromDB to retry (e.g. track lastFailureAt and retry after a short backoff, or remove the failed short-circuit so the next call retries). 2) Propagate the failure: have ensureHydratedFromDB reject (or return the status) so the calling hook can surface a toast/banner ('personalization unavailable, drilling generic set').

### M87. generateSmartDrill masks DB query failure as cold start with a misleading student-facing message
**File:** `src/lib/adaptiveEngine.ts:839-857`  |  **Category:** ux-correctness  |  **Subsystem:** lib-core

**Problem:** If the attempts query errors, the code takes the same branch as 'fewer than 10 attempts' and returns a random shuffle with explanation 'Not enough history yet. Drilling a calibration set to learn your baseline.' A student with 500 attempts whose query failed is told they have no history; the error object is never logged or surfaced anywhere.

**Fix plan:** Split the branches: if `error`, throw (or return a result with an honest explanation like 'Could not load your history, serving a general set' and log/surface the error to the caller for a toast). Keep the calibration message only for the genuine attemptCount < minAttemptsForAnalysis case.

### M88. filterQuestionPool discards repeat-allowed questions whenever any unseen question exists
**File:** `src/lib/questionPoolService.ts:176-202`  |  **Category:** bug  |  **Subsystem:** lib-core

**Problem:** With allowRepeats=true, previously seen questions are pushed to `available` in the forEach (line 183-184). But the final pool assembly then overwrites: if preferUnseen && unseen>0 → available = unseen; else if unseen>0 || recycled>0 → available = [...unseen, ...recycled], dropping every repeat-allowed seen question collected earlier. The `available = questions` fallback only fires when unseen AND recycled are both empty. So allowRepeats with preferUnseen=false behaves identically to no-repeats until the pool is fully exhausted, shrinking the effective pool contrary to the user's setting.

**Fix plan:** Restructure: compute unseen/recycled/seen buckets, then: if allowRepeats && !preferUnseen → available = questions; if allowRepeats && preferUnseen → available = unseen.length ? unseen : questions; if !allowRepeats → available = preferUnseen && unseen.length ? unseen : [...unseen, ...recycled]. Add unit tests for the four setting combinations.

### M89. Milestone achievements require exact question-count equality and never fire if the count is skipped; N+1 existence queries per attempt
**File:** `src/lib/achievementEngine.ts:67-105`  |  **Category:** bug  |  **Subsystem:** lib-core

**Problem:** `if (totalQuestions === req.value)` awards a milestone only when overall_answered lands exactly on the threshold. Because updateDailyStats/overall counters can lose or batch increments (see race findings) or the caller may pass a stale userStats, crossing 100 questions at 101 means the '100 questions' badge is permanently unearnable. Also, every attempt runs one `user_achievements` existence query per candidate achievement inside the loop (N+1), plus the same pattern in checkStreakAchievements.

**Fix plan:** 1) Change to `totalQuestions >= req.value` and rely on the existence check (or a DB unique constraint on (class_id, achievement_id)) to prevent duplicates. 2) Fetch the user's earned achievement_ids once per checkAndAwardAchievements call (`select achievement_id where class_id = ...`) into a Set and check membership in memory instead of per-achievement queries.

### M90. trackLearningVelocity fetches every attempt row with select('*') and no limit
**File:** `src/lib/drillIntelligence.ts:139-148`  |  **Category:** performance  |  **Subsystem:** lib-core

**Problem:** `supabase.from('attempts').select('*').eq('user_id', userId).order('timestamp_iso', ...)` has no `.limit()`. A heavy user accumulates thousands of rows, each with ~28 columns including large text fields (br_rationale, pre_answer). This is an unbounded transfer on every velocity computation. detectPatterns/generateRecommendations also use select('*') where only 4-5 columns are needed.

**Fix plan:** Add `.limit(500)` (or similar) to trackLearningVelocity and narrow all three queries to the columns actually used: `qid, qtype, level, correct, time_ms, timestamp_iso`.

### M91. BR attempt writes are an N+1 insert loop
**File:** `src/pages/Drill.tsx:2436-2467`  |  **Category:** performance  |  **Subsystem:** pages

**Problem:** The BR save handler inserts one `attempts` row per reviewed question with sequential awaited `supabase.from('attempts').insert(...)` calls inside a `for` loop. A 25-question full section fires 25 serial round trips at the moment the student finishes, making the save slow and increasing the window for partial writes.

**Fix plan:** Build an array of row objects in the loop (skipping missing questions), then perform a single `const { error } = await supabase.from('attempts').insert(rows);` after the loop and check the error. This also makes the failure atomic per batch instead of leaving a random prefix of rows saved.

### M92. Practice stats fetch is unbounded: pulls every attempt row just to compute a count and percentage
**File:** `src/pages/Practice.tsx:263-266`  |  **Category:** performance  |  **Subsystem:** pages

**Problem:** To show two numbers (total attempted, avg accuracy) the hub downloads every `attempts` row for the class (`select('correct, timestamp_iso')` with no limit). Heavy users accumulate thousands of rows; this runs on every visit to /practice. `timestamp_iso` is selected but never used.

**Fix plan:** Replace with two head-count queries: `supabase.from('attempts').select('*', { count: 'exact', head: true }).eq('class_id', classId)` for total, and the same with `.eq('correct', true)` for correct count; compute accuracy from the two counts. Drop the unused `timestamp_iso` column either way.

### M93. Profile page swallows load errors and renders default stats as if real
**File:** `src/pages/Profile.tsx:162-179`  |  **Category:** error-handling  |  **Subsystem:** pages

**Problem:** `loadProfile` destructures only `data: profileStats` (the query `error` from `.maybeSingle()` is discarded, and PostgREST errors do not throw, so the catch at line 174 rarely fires; when it does it is `console.error` only). On failure the page proceeds to render Level 1, 0 XP, 0 streak, 0% accuracy (lines 206-217 defaults) as though they were the student's actual numbers, with no retry or error indication.

**Fix plan:** 1) Destructure `{ data: profileStats, error }` and `if (error) throw error;`. 2) In the catch, set a `loadError` state and render an error card with a Retry button (mirror the pattern already used in Analytics.tsx lines 232-243) instead of falling through to default-zero stats.

### M94. Unflag mutation failure is invisible to the user
**File:** `src/pages/FlaggedQuestions.tsx:63-75`  |  **Category:** data-integrity  |  **Subsystem:** pages

**Problem:** `handleUnflag` catches delete failures with only `console.error('Error unflagging question:', err)`. No toast, no state change: the user clicks Unflag, nothing happens, and there is no indication why. Violates the 'DB mutations never swallow errors' rule. (Contrast: the load path in the same file correctly sets `loadError` and offers Retry.)

**Fix plan:** Import `toast` from 'sonner' and in the catch add `toast.error('Could not remove the flag. Please try again.')`. Keep the optimistic list update only on success (it already is).

### M95. Weekly plan back-link update result ignored (plus hand-rolled supabase cast)
**File:** `src/pages/teacher/TeacherWeeklyPlans.tsx:239-250`  |  **Category:** data-integrity  |  **Subsystem:** pages

**Problem:** After creating a classroom_item for each weekly plan item, the back-link write `await (supabase as unknown as {...}).from('weekly_plan_items').update({ classroom_item_id: ci.id }).eq('id', wpi.id)` is awaited but its `{ error }` result is never checked. If it fails, the plan item silently loses its link to the classroom item (orphaned pairing) while the publish flow reports success for that item. The `(supabase as unknown as ...)` structural cast also violates the repo's no-supabase-casts rule and hides the type error that would have flagged this.

**Fix plan:** 1) Capture `const { error: linkError } = await supabase.from('weekly_plan_items').update({ classroom_item_id: ci.id }).eq('id', wpi.id);` (regen Supabase types if `weekly_plan_items` is missing: `supabase gen types typescript --local`). 2) `if (linkError) throw linkError;` so the existing catch adds the item to `failed` and the summary toast reports it.

### M96. AdminDashboard fetches the full user list twice on every load
**File:** `src/pages/AdminDashboard.tsx:57-73 (duplicated in src/pages/teacher/desk/DeskPeopleSurface.tsx:57-68)`  |  **Category:** performance  |  **Subsystem:** pages

**Problem:** `fetchData` invokes the `admin-manage-users` edge function twice in parallel: once plain and once with header `x-mode: analytics`. The inline comment admits the analytics variant is dubious ('invoke with GET doesn't support query params easily, so we'll compute analytics client-side from user data'), and `computeAdminAnalytics(users, analytics)` at line 88 already computes everything client-side as fallback. If the edge function ignores the header, this is a full duplicate fetch of all users on every dashboard mount. The identical copy-pasted block lives in DeskPeopleSurface.tsx.

**Fix plan:** 1) Check supabase/functions/admin-manage-users to see if it actually branches on `x-mode: analytics`. 2) If it does not, delete the second invoke and the `analytics` state in both files and rely solely on `computeAdminAnalytics(users, null)`. 3) If it does, extract the shared fetch into one hook (e.g. useAdminUsers) so AdminDashboard and DeskPeopleSurface stop duplicating it.

### M97. Heaviest pages (Drill 3.5k lines, Auth 86KB marketing page) are statically imported into the main bundle while tiny pages are lazy
**File:** `src/App.tsx:15-27`  |  **Category:** performance  |  **Subsystem:** pages

**Problem:** App.tsx lazily loads dozens of small admin/teacher pages but statically imports the largest surfaces: Drill.tsx (3,539 lines, 135KB, includes rrweb recorder), Auth.tsx (1,608 lines, 85KB, the entire marketing landing with inline PAGE_CSS, carousels, feature tours), plus Analytics, Practice, Profile, SettingsLayout, Schedule, Classroom, CausationStation, Bootcamps, Inbox. Every visitor, including logged-out users hitting the landing page, downloads the drill engine, rrweb, and all student surfaces in the initial chunk. The lazy-loading effort is inverted: the cheap pages are split, the expensive ones are not.

**Fix plan:** 1) Convert Drill, Analytics, Practice, Profile, SettingsLayout, Schedule, Classroom, CausationStation, Bootcamps to `React.lazy(() => import(...))` matching the existing pattern, wrapped in the existing Suspense boundaries. 2) Keep Auth eager only if it is the entry route; better, split the marketing sections of Auth.tsx into a lazily loaded component so the sign-in form loads without the full landing payload. 3) Run `npm run build` and compare chunk sizes before/after to verify.

### M98. Drill.tsx is a 3,539-line single component with ~50 useState hooks
**File:** `src/pages/Drill.tsx:1-3539`  |  **Category:** maintainability  |  **Subsystem:** pages

**Problem:** One component owns session init, adaptive engine wiring, timers (two independent timer systems: QuestionTimer ref + tutor session interval), rrweb recording, highlights, eliminations, blind review flow, WAJ logging, assignment completion for four different launch sources, explanation generation, and all rendering for both classic and official layouts. Roughly 50 useState declarations plus a dozen refs live at the top level (lines 164-320). Any state change re-renders the entire drill surface, and the BR bug above (unchecked inserts) is exactly the kind of defect this size hides. This is the largest maintainability hotspot in src/pages/.

**Fix plan:** Staged extraction, no behavior change per stage: 1) extract the blind review flow (state brMarked/showBRSelection/showBRFlow/brSelectedQids/brResults + save handler) into useBlindReview.ts + a BlindReviewFlow component; 2) extract persistence (saveAttemptToDatabase, persistAttempt, commitSessionAttempts, flushReplay) into src/lib/drillPersistence.ts with explicit thrown errors; 3) extract the tutor session timer block (lines 243-285) into useSessionTimer; 4) extract highlight state into useHighlights. Run the existing Drill-related vitest specs after each stage.


### M147. Conditional React hooks in shape-landing-hero (rules-of-hooks violation)
**File:** `src/bootcamps/principle-flaw/components/ui/shape-landing-hero.tsx:26`  |  **Category:** bug  |  **Subsystem:** scripts-tests [verified against code 2026-07-09; downgraded from high]

**Problem:** Lines 26-27 call `useMotionValue` inside a short-circuit fallback (`useTransform(mousePosition?.x || useMotionValue(0), ...)`), a genuine react-hooks/rules-of-hooks violation flagged by ESLint at 26:57 and 27:57. Verification found the crash is currently theoretical: every live call site passes the prop consistently (`PrincipleFlawApp.tsx:165-166` never passes `mousePosition`; the in-file `HeroGeometric` always does, and appears unused), so hook order is stable per instance today. Any future caller that toggles the prop between defined and undefined on a mounted component breaks React's hook order and crashes the Principle & Flaw hero.

**Fix plan:** Move both `useMotionValue` calls unconditionally to the top of the component body, then use the condition to select between `mousePosition?.x` and the fallback motion value when building the transforms. Verify with `npx eslint src/bootcamps/principle-flaw/components/ui/shape-landing-hero.tsx` and by rendering the Principle & Flaw hero in the dev server. Also consider deleting the unused `HeroGeometric` wrapper.

### M148. Import pipeline treats drift as a warning and exits 0, contradicting its own 'Drift = build error' contract
**File:** `scripts/main-conclusion/import-content.ts:414`  |  **Category:** error-handling  |  **Subsystem:** scripts-tests

**Problem:** The header (line 20) promises "Drift = build error" for lesson callouts / references not tracing to the manifest, but `verifyLessonParity` (lines 247-251) only `log.warn()`s drift, and `main()` (lines 414-418) prints "Pipeline complete with N drift warning(s)" and exits 0. Missing `lessons.generated.json` or `calibration.generated.json` also only warn (lines 220-222, 259-261). The manifest is written and the pipeline reports success even when hand-authored content references nonexistent tool/reference ids, exactly the corruption the pipeline exists to block.

**Fix plan:** In `main()` after `emitManifest(steps, parity)`, add: `if (parity.drift_warnings.length > 0 && !process.env.ALLOW_DRIFT) { log.err(...); process.exit(1); }` keeping `ALLOW_DRIFT` as an escape hatch for intentional WIP runs. Decide whether a missing `lessons.generated.json` should also fail; if yes, throw instead of warning in `verifyLessonParity`.

### M149. import-content.ts documents npm scripts and flags that do not exist; --force flag is dead code
**File:** `scripts/main-conclusion/import-content.ts:24`  |  **Category:** dead-code  |  **Subsystem:** scripts-tests

**Problem:** Header lines 24-27 document `npm run import`, `npm run import:dry`, and `npm run import -- --force (bypass cache)`, and line 173 references `npm run extract:mcfirst`; package.json has none of these scripts. The `FORCE` constant (line 71) is parsed but never read; there is no cache to bypass. The header also claims outputs go to `src/data/*.generated.json` (lines 6-12) while `DATA_DIR` (line 61) actually writes to `src/bootcamps/main-conclusion/data/`. Anyone (or any agent) following the file's own instructions gets "missing script" errors and looks for outputs in the wrong directory.

**Fix plan:** 1) Add to package.json scripts: `"import": "tsx scripts/main-conclusion/import-content.ts"`, `"import:dry": "tsx scripts/main-conclusion/import-content.ts --dry-run"`, `"extract:mcfirst": "tsx scripts/main-conclusion/extract-mcfirst.ts"`. 2) Delete the `FORCE` constant at line 71 and the `--force` mention in the header. 3) Update header lines 6-16 and 30-33 to say `src/bootcamps/main-conclusion/data/` instead of `src/data/`.

### M150. vite-plugin-parity-check is dead code: never registered in vite.config.ts and watches nonexistent src/data/ paths
**File:** `scripts/main-conclusion/vite-plugin-parity-check.ts:33`  |  **Category:** dead-code  |  **Subsystem:** scripts-tests

**Problem:** Two independent failures: (1) `vite.config.ts` never imports or registers `parityCheck`, so the dev-time drift overlay the plugin exists to provide never runs. (2) Even if wired up, `WATCHED` (lines 33-39) and every `readJsonSafe` call point at `src/data/*.generated.json`, which does not exist; the real files are in `src/bootcamps/main-conclusion/data/`, so the plugin would report "manifest.generated.json missing" forever. Additionally `readJsonSafe` (lines 41-47) swallows JSON parse errors and returns null, silently skipping the lessons/calibration checks on corrupt files.

**Fix plan:** Decide keep or delete. If keep: register `parityCheck()` in `vite.config.ts` plugins, replace every `src/data/` path with `src/bootcamps/main-conclusion/data/`, and make `readJsonSafe` push a ParityIssue on parse failure instead of skipping. If delete: remove the file and its header claims from import-content.ts. Deleting is acceptable once M148's drift-fails-the-build fix lands, since import-content.ts performs the same checks at import time.

### M151. Core practice-surface engines have zero test coverage
**File:** `src/lib/drillIntelligence.ts:1`  |  **Category:** test-coverage  |  **Subsystem:** scripts-tests

**Problem:** The suite (73 files, 375 tests, all passing, ~56s) covers adaptiveEngine well (ability calc, hydration races, selector weights, cooldowns) and questionLoader, but five core src/lib engines have no spec at all: `drillIntelligence.ts` (424 lines), `wajService.ts` (251 lines, Wrong Answer Journal persistence), `achievementEngine.ts` (229 lines), `gamification.ts` (161 lines), `streakSystem.ts` (125 lines). These compute student-facing progression state; regressions are silent (streaks reset, achievements double-award, WAJ writes lost) and there is no CI to catch even compile breaks.

**Fix plan:** Add pure-logic specs mirroring `src/lib/adaptiveEngine.test.ts`'s style: 1) `streakSystem.test.ts`: day-boundary transitions (consecutive-day increments, gap resets, same-day idempotence, midnight edge). 2) `achievementEngine.test.ts`: threshold crossing awards exactly once, no re-award on replay. 3) `gamification.test.ts`: XP/level math monotonicity and rounding. 4) `drillIntelligence.test.ts`: recommendation shape and priority ordering for synthetic attempt histories, empty-history cold start. 5) `wajService.test.ts`: mock the supabase client (see adaptiveEngine.test.ts) and assert failed writes reject/surface rather than resolve silently. Run with `npx vitest run src/lib/<file>.test.ts`. Sequence after Phases 1-2 so the tests assert the fixed (error-surfacing, atomic) behavior.

### M152. No typecheck or lint gate anywhere: broken code reaches main undetected
**File:** `package.json:6`  |  **Category:** config  |  **Subsystem:** scripts-tests

**Problem:** package.json has no typecheck script, there are no CI workflows, and no pre-commit hooks; `vite build` does not typecheck (esbuild strips types). This is how C145 (a guaranteed runtime crash) landed on main. With Lovable auto-deploying main, a one-line typo ships to students.

**Fix plan:** 1) Add `"typecheck": "tsc --noEmit -p tsconfig.app.json"` to package.json scripts. 2) In `.claude/safe-push.sh` (the mandated push path), run `npm run typecheck` before pushing and abort on nonzero exit. 3) Once H146 lands and product-code lint errors are triaged to zero, add `npm run lint` to the same gate. Do not enable strict mode; the gate only needs the current compiler settings.

## LOW (49 findings)

### L99. attemptLogger de-dupe key includes correctness/answer, so legitimate re-attempts are dropped inconsistently
**File:** `src/bootcamps/main-conclusion/lib/attemptLogger.ts:29-36`  |  **Category:** bug  |  **Subsystem:** bootcamp-mc

**Problem:** The session de-dupe key is `${user}::${drill}::${question}::${correct}::${selectedAnswer}`. A student who retries the same drill in the same session and picks the same answer again is silently not logged (their genuine second attempt vanishes from analytics), while picking a different answer logs fine. So retry data is dropped only when the answer repeats, skewing per-question attempt counts in useIntroLrAttempts rollups.

**Fix plan:** Scope the de-dupe to a run instead of the whole session: have InteractiveDrillRunner pass a runId (generated per drill start) into logIntroLrAttempt and include it in the key, or clear `seen` entries for a drillId when that drill (re)starts. Drop correct/selectedAnswer from the key; drill+question+run identifies one submission.

### L100. LocalStoragePersistence.transaction is a no-op passthrough despite comment claiming atomic apply
**File:** `src/bootcamps/main-conclusion/persistence/LocalStoragePersistence.ts:70-78`  |  **Category:** maintainability  |  **Subsystem:** bootcamp-mc

**Problem:** The comment says 'we approximate by collecting writes and applying atomically' but the implementation writes through immediately with no collection and no atomicity. Misleading for future maintainers; V1Persistence.transaction also routes exclusively to IndexedDB stores, so any tx touching LS_TABLES (users, prefs_user, module_progress) via V1Persistence.transaction would write to the wrong store (IDB) and later reads via route() would go to localStorage and miss it.

**Fix plan:** 1) Fix the comment to state writes are immediate and non-atomic. 2) In V1Persistence.transaction, either document that LS_TABLES must not be used inside transactions, or make the tx.set/get route by table like the non-tx path (delegate LS_TABLES ops to this.ls, others to the IDB tx). Add a unit test writing module_progress inside a transaction and reading it back via get().

### L101. Dead newId import kept alive with a void statement in useModuleProgress
**File:** `src/bootcamps/main-conclusion/hooks/useModuleProgress.ts:295-296`  |  **Category:** dead-code  |  **Subsystem:** bootcamp-mc

**Problem:** `void newId;` exists solely to suppress an unused-import warning for newId, which is never used ('kept available for future writes'). noUnusedLocals is off anyway, so this is doubly unnecessary.

**Fix plan:** Delete the `void newId;` line and remove newId from the import on line 12.

### L102. Dead modules: flawMatcher.ts (fallacy-flaw-v2), ExtractionWorkspace.tsx and MethodsDrill.tsx (abstract)
**File:** `src/bootcamps/fallacy-flaw-v2/lib/flawMatcher.ts:1`  |  **Category:** dead-code  |  **Subsystem:** bootcamps-other

**Problem:** grep shows zero importers for: src/bootcamps/fallacy-flaw-v2/lib/flawMatcher.ts (191 lines, superseded by flawQuestionMapping.ts which duplicates its purpose), src/topics/abstract/components/views/ExtractionWorkspace.tsx, and src/topics/abstract/components/views/MethodsDrill.tsx (neither referenced by ViewManager in src/topics/abstract/index.tsx nor by any other file).

**Fix plan:** Delete the three files after re-confirming with `grep -rln 'flawMatcher\|ExtractionWorkspace\|MethodsDrill' src` returns only the files themselves; run tsc + build.

### L103. recordChapterProgress increments view_count with non-atomic read-then-write
**File:** `src/topics/abstract/lib/supabase-progress.ts:258-276`  |  **Category:** bug  |  **Subsystem:** bootcamps-other

**Problem:** On unique violation it SELECTs view_count then UPDATEs to view_count+1 as two separate requests. Two tabs (or a fast double-fire) lose increments, and if the SELECT returns null (row deleted between calls) it writes view_count = 2 unconditionally. Analytics-only impact.

**Fix plan:** Replace the select+update with a single atomic upsert: create/use a Postgres RPC (e.g. `increment_chapter_progress(user_id, topic_tag, section_id)`) doing `INSERT ... ON CONFLICT (user_id, topic_tag, section_id) DO UPDATE SET view_count = chapter_progress.view_count + 1, last_viewed_at = now()`, and call it via supabase.rpc. Keep the {ok}/{ok:false,error} contract.

### L104. Fallacy-v2 Flashcards persists deck index but reshuffles order every mount, so the restored index is meaningless
**File:** `src/bootcamps/fallacy-flaw-v2/components/Flashcards.tsx:262-265`  |  **Category:** ux-correctness  |  **Subsystem:** bootcamps-other

**Problem:** filteredCards is shuffled with `sort(() => Math.random() - 0.5)` inside useMemo on every mount/filter change, while currentIndex is persisted to localStorage ('fallacyFlaw:v2:flashcards:index') and restored on the next visit. The restored index therefore points at a random card, not where the student left off; it presents as resume but is not. The random comparator is also a biased shuffle.

**Fix plan:** 1) Either stop persisting currentIndex (start each session at 0), or persist the shuffled order of card keys alongside the index and rebuild the deck from it on mount. 2) If keeping shuffle, use Fisher-Yates instead of sort-with-random-comparator (a deterministicShuffle already exists in principle-flaw/lib/dayQuestions.ts to copy). 3) Reset currentIndex to 0 whenever selectedFlawId changes (currently only clamped by the effect at line 281-283 after a render with an out-of-range index).

### L105. Home.tsx flaw-highlight tiles hotlink Unsplash images
**File:** `src/bootcamps/fallacy-flaw-v2/components/Home.tsx:23-45`  |  **Category:** ux-correctness  |  **Subsystem:** bootcamps-other

**Problem:** FLAW_HIGHLIGHTS hardcodes three images.unsplash.com URLs rendered via FluidExpandingGrid on the bootcamp dashboard. They are decorative stock photos unrelated to the flaw content, load from a third-party CDN (broken tiles offline or if Unsplash rate-limits hotlinking), and sit oddly against the truthful-UI bar for a premium surface.

**Fix plan:** Download the three images (or replace with on-brand illustrations), place them under public/fallacy-flaw/, and point FLAW_HIGHLIGHTS at local paths, e.g. /fallacy-flaw/highlight-causal.jpg. Add width/height or aspect-ratio in FluidExpandingGrid usage to avoid layout shift.

### L106. Activity Centre hooks hand-roll fetch state instead of using TanStack Query like the adjacent Gmail feature
**File:** `src/features/activity-centre/hooks/useStudentActivities.ts:13-45`  |  **Category:** maintainability  |  **Subsystem:** bootcamps-other

**Problem:** useStudentActivities, useStudentActivity, useAdminActivities, and useAdminActivityAssignments each reimplement loading/error/refresh with useState + useEffect and no caching, dedupe, or focus-refetch, while src/features/admin-inbox/gmail/hooks/* correctly use TanStack Query (useGmailThreads with staleTime, keepPreviousData, visibility-gated polling). Every navigation into /activities refetches from scratch; two components using the same assignment id double-fetch. Also useStudentActivity leaves loading=true forever when user or assignmentId is undefined (refresh early-returns without setLoading(false)), so a signed-out or malformed route shows an infinite spinner instead of the not-found state.

**Fix plan:** 1) Convert the four hooks to useQuery with keys like ['activities','student', userId] and ['activities','assignment', assignmentId, userId], enabled: !!user (mirrors useGmailThreads). 2) useAssignActivity becomes a useMutation invalidating those keys. 3) This also fixes the stuck-loading path automatically (enabled:false leaves isLoading false with status 'pending'); if not converting, at minimum add `setLoading(false)` to the early-return branches of both refresh callbacks.

### L107. React.lazy created inline inside JSX for /trust route (new component identity every App render)
**File:** `src/App.tsx:141`  |  **Category:** bug  |  **Subsystem:** build-perf

**Problem:** `element={<React.Suspense fallback={null}>{React.createElement(React.lazy(() => import("./pages/Trust")))}</React.Suspense>}` constructs a brand-new lazy component on every render of App. If App ever re-renders (StrictMode double-render in dev, future state added to App), the Trust page unmounts/remounts and re-suspends, losing state and re-fetching the chunk promise. It also diverges from the module-scope lazy pattern used for every other route.

**Fix plan:** Hoist it: add `const Trust = React.lazy(() => import("./pages/Trust"));` next to the other lazy declarations near line 41, and change the route to `<React.Suspense fallback={null}><Trust /></React.Suspense>`.

### L108. Duplicate animation libraries: both framer-motion and motion are dependencies
**File:** `package.json:88 (framer-motion), package.json:95 (motion)`  |  **Category:** performance  |  **Subsystem:** build-perf

**Problem:** 90 files import from 'framer-motion' while exactly one file (src/components/ui/dynamic-island-toc.tsx, used by 3 main-conclusion modules) imports 'motion/react'. 'motion' v12 is the renamed successor wrapping the same code, but as two separate npm packages Vite bundles two copies of the animation runtime into chunks that include both import paths.

**Fix plan:** 1) In src/components/ui/dynamic-island-toc.tsx change `from 'motion/react'` to `from 'framer-motion'` (API-compatible for the exports used). 2) `npm uninstall motion`. 3) Build and verify the main-conclusion lesson views render animations correctly.

### L109. Icon triple-stack: lucide-react + @tabler/icons-react + @radix-ui/react-icons all shipped
**File:** `package.json:57 (@radix-ui/react-icons), :90 (lucide-react), :62 (@tabler/icons-react)`  |  **Category:** performance  |  **Subsystem:** build-perf

**Problem:** 356 files use lucide-react, only 4 files use @tabler/icons-react (e.g. src/components/mainhub/StudentShell.tsx:7 for two sidebar icons), plus @radix-ui/react-icons is a dependency. Tree-shaking limits the damage, but each library adds its own chunk overhead and inconsistent icon design for a handful of icons.

**Fix plan:** 1) Replace the ~4 files' tabler icons with lucide equivalents (e.g. PanelLeftOpen/PanelLeftClose for the sidebar toggles in StudentShell). 2) Check @radix-ui/react-icons usage (likely only inside shadcn ui files); replace with lucide and uninstall both packages.

### L110. Global cache-nuke IIFE deletes ALL CacheStorage on every page load, permanently
**File:** `src/main.tsx:38-55`  |  **Category:** architecture  |  **Subsystem:** build-perf

**Problem:** The SW-cleanup IIFE unregisters service workers AND deletes every CacheStorage key on every single load, forever. The stated purpose (purging the retired Workbox cache from the removed PWA) is one-time-per-device, but the code permanently forecloses any future use of the Cache API and does wasted async work on each boot. Combined with reloadIfNewBundleIsAvailable refetching the full index.html with cache:'no-store' on every tab focus/pageshow, the app pays repeated network cost on every visibility change.

**Fix plan:** 1) Guard the cache wipe with a localStorage flag (e.g. 'sw-purged-v1') so it runs once per device; keep the SW unregister loop (cheap). 2) In reloadIfNewBundleIsAvailable, throttle probes (e.g. skip if last check <60s ago) using a module-scope timestamp.

### L111. Debug console.log of App mount/unmount ships to production
**File:** `src/App.tsx:118-124`  |  **Category:** dead-code  |  **Subsystem:** build-perf

**Problem:** The ID-9 diagnosis effect logs '[App mount]'/'[App unmount]' with a module counter on every root mount in production builds. Diagnosis code left in after the investigation.

**Fix plan:** Delete the useEffect and the APP_MOUNT_COUNT module variable (lines 112-124), or wrap the logs in `if (import.meta.env.DEV)`.

### L112. index.html ships Lovable-branded social meta (twitter:site @lovable_dev, R2 preview og:image)
**File:** `index.html:23-27`  |  **Category:** ux-correctness  |  **Subsystem:** build-perf

**Problem:** og:image and twitter:image point to a lovable.app R2 preview screenshot URL and twitter:site is '@lovable_dev'; author meta is 'LR smart drill'. Shared links for lsatprep.study present Lovable branding and a stale preview image, off-brand for a premium product.

**Fix plan:** 1) Replace og:image/twitter:image with a hosted LSAT U social card (put a 1200x630 image in public/ and reference it with an absolute lsatprep.study URL). 2) Remove or fix twitter:site and the author meta.

### L113. Dead admin branches in FloatingMessenger: component returns null for admins before rendering admin UI
**File:** `src/components/inbox/FloatingMessenger.tsx:100, 270-297`  |  **Category:** dead-code  |  **Subsystem:** components

**Problem:** Line 100: `if (is_admin) return null; // Admins use the consolidated AdminChatHub`. Yet the JSX below still contains admin-only branches: the `{is_admin && (...NewConversationDialog...)}` block at lines 270-282, `variant={is_admin ? 'admin' : 'student'}` and the admin emptyLabel at 291-296, plus is_admin logic inside activeHeaderName (line 75-76) and studentPrimaryId (line 50). All unreachable.

**Fix plan:** Remove the is_admin conditionals from the JSX and memos: delete the NewConversationDialog block and its import, hardcode variant='student' and the student emptyLabel, simplify activeHeaderName/studentPrimaryId to the student path. Also remove the now-unused StudentEmptyState/NewConversationDialog imports if orphaned.

### L114. Clipboard copy failure unhandled in StudySidecar copy button
**File:** `src/components/mainhub/StudySidecar.tsx:131-136`  |  **Category:** error-handling  |  **Subsystem:** components

**Problem:** `navigator.clipboard.writeText(text).then(() => setCopied(true)...)` has no .catch. In non-secure contexts or when the document is unfocused, writeText rejects, producing an unhandled rejection and a button that appears to do nothing (tooltip still says 'Copy').

**Fix plan:** Add `.catch(() => toast.error('Could not copy'))` (or set a brief 'Failed' tooltip state) to the writeText chain.

### L115. LRSectionResults writes wrong answers to WAJ sequentially, one awaited insert per question
**File:** `src/components/drill/LRSectionResults.tsx:204-231`  |  **Category:** performance  |  **Subsystem:** components

**Problem:** The saveHistory effect awaits `logWrongAnswer` in a for-loop, one round-trip per wrong answer. A rough section (10-15 wrong) means 10-15 serial network calls on the results screen; a mid-loop failure also aborts logging of the remaining wrong answers while earlier ones persisted (partial write).

**Fix plan:** Batch: collect all wrong-answer payloads and either add a `logWrongAnswers(batch)` in wajService doing a single multi-row insert, or at minimum `await Promise.allSettled(payloads.map(logWrongAnswer))` and toast if any rejected.

### L116. Pervasive select('*') over-fetching, including heavy JSON columns
**File:** `src/hooks/useInbox.ts:216`  |  **Category:** performance  |  **Subsystem:** data-layer

**Problem:** 82 occurrences of `.select('*')` across the app. The costly ones: useInbox line 216 pulls full message rows fine, but wajService.ts lines 66 and 191 select '*' on wrong_answer_journal when the update path only needs `history_json` (and ensureJournalEntry correctly selects only 'id'); journalService listPages (line 159) selects '*' including the full TipTap `body` JSON of every page just to render the sidebar tree; questionPoolService.markQuestionSeen line 29 selects '*' when it needs `id, times_seen`. journal_pages bodies can be large, so the sidebar pays for every document's full content on each load.

**Fix plan:** 1) wajService: change both existence-check selects to `.select('id, history_json')`. 2) questionPoolService.markQuestionSeen: `.select('id, times_seen')`. 3) journalService: add a `listPageMeta()` used by the tree/sidebar that selects `id, user_id, parent_page_id, title, icon, type, sort_order, is_archived, created_at, updated_at` (no body/properties), and keep full fetch only in getPage. Update callers in the Journal workspace components accordingly.

### L117. Intro to LR attempt logging swallows insert failures permanently within a session
**File:** `src/bootcamps/main-conclusion/lib/attemptLogger.ts:43`  |  **Category:** data-integrity  |  **Subsystem:** data-layer

**Problem:** logIntroLrAttempt is documented fire-and-forget, and on insert error it console.warns and deletes the dedupe key so a *future* identical answer could retry, but the current attempt is lost with no retry and no surfacing. If RLS or the table is misconfigured, an entire cohort's bootcamp attempt telemetry silently vanishes (teacher dashboards read intro_lr_attempts). Per repo rules console.warn alone is a swallowed error; deliberate here, but there is no retry and no aggregate signal.

**Fix plan:** Keep the non-blocking design but add a bounded retry: on insert error, re-queue the payload in a module-level array and flush on the next logIntroLrAttempt call (or a 30s interval), max 3 attempts per item. After final failure, fire a one-time-per-session toast ('Progress logging is offline; your work still counts locally') so misconfiguration is noticed during development instead of weeks later.

### L118. send-assignment-email returns HTTP 200 for every failure path
**File:** `supabase/functions/send-assignment-email/index.ts:119`  |  **Category:** error-handling  |  **Subsystem:** edge-functions

**Problem:** Validation failures (line 60), lookup failures (line 66), missing email (line 70), enqueue failures (line 110), and even the generic catch (line 119, explicitly `jsonRes({ok:false, error:msg}, 200)`) all return status 200. Clients using supabase.functions.invoke that only check the invoke-level error (non-2xx) will treat all of these as success, so an assignment notification can silently never be sent. The `ok:false` field exists but is easy to miss.

**Fix plan:** Return 400 for validation errors, 404 for missing email, 502/500 for downstream failures (keep corsHeaders). Then check the caller (grep src/ for 'send-assignment-email') and ensure it inspects response.ok or the non-2xx error and shows a toast on failure.

### L119. memory-admin: audit-trail inserts unchecked, contradicting 'stays truthful' contract
**File:** `supabase/functions/memory-admin/index.ts:72`  |  **Category:** data-integrity  |  **Subsystem:** edge-functions

**Problem:** writeAudit does `await admin.from('memory_audit').insert({...})` without checking the error. The file header says 'Every mutation writes a memory_audit row so the manager's what-changed feed stays truthful', but a failed insert is silent — the mutation succeeds and the audit feed lies by omission. For 'forget' this means a deletion with no trace at all.

**Fix plan:** Destructure `{ error }` in writeAudit; if it fails, console.error with action + memoryId and include `audit_written: false` in the mutation's JSON response so the UI can flag it. For 'forget', consider writing the audit row BEFORE the delete so a deletion is never trace-less.

### L120. tutor-chat module-scope knowledgeCache grows without eviction
**File:** `supabase/functions/tutor-chat/index.ts:82`  |  **Category:** performance  |  **Subsystem:** edge-functions

**Problem:** knowledgeCache is a module-scope Map keyed by qid with a 10-minute TTL, but expired entries are never deleted — expiry is only checked on read (line 459) and the stale entry is then overwritten only for that qid. A warm isolate serving many distinct questions accumulates one entry per qid seen (each holding strategy/patterns/concepts objects) for the isolate's lifetime. Bounded in practice by question-bank size but wasteful; edge isolates have tight memory budgets.

**Fix plan:** On each cache set, sweep: `if (knowledgeCache.size > 500) { for (const [k, v] of knowledgeCache) if (v.expires <= Date.now()) knowledgeCache.delete(k); }`, or delete the entry when found expired at line 459 before refetching. Two-line change.

### L121. gmail listRecentContacts fires up to ~600 unbounded parallel gateway fetches
**File:** `supabase/functions/gmail/index.ts:391`  |  **Category:** performance  |  **Subsystem:** edge-functions

**Problem:** listRecentContacts lists up to 200 threads per label across 3 labels, then fetches metadata for every deduped thread id in a single unbounded Promise.all (line 391). Up to ~600 concurrent requests through the connector gateway risks 429s from Gmail (per-user rate limits), and each failed fetch is silently dropped (`if (!res.ok) return null`), skewing the contact ranking with no signal. The default 'list' action has the same pattern at smaller scale (line 199, max 100).

**Fix plan:** Chunk the metadata fetches (e.g. batches of 20 with a small helper: for-loop over chunks awaiting Promise.all per chunk). Count failed fetches and include `skipped: n` in the response so degraded results are visible. Consider lowering the default maxThreads from 100 to 50 per label.

### L122. process-email-queue failed-attempt counter reads unbounded log rows per batch and ignores read failure consequences
**File:** `supabase/functions/process-email-queue/index.ts:169`  |  **Category:** error-handling  |  **Subsystem:** edge-functions

**Problem:** The failed-row query (lines 169-173) selects all status='failed' rows for the batch's message_ids with no limit; a message stuck failing accumulates one row per attempt, so this grows over time (bounded only by TTL/DLQ working correctly — which finding on moveToDlq shows can fail). More importantly, if this query errors (line 175, console.error only), failedAttemptsByMessageId stays empty and every message's failedAttempts resets to 0 for the cycle, so MAX_RETRIES is effectively bypassed whenever the counter read fails, allowing unbounded retry cycles for poisoned messages.

**Fix plan:** On failedRowsError, fall back to `msg.read_ct` as the attempt count for all messages in the batch (the pre-existing conservative behavior) instead of defaulting to 0. Optionally aggregate with a count query (select message_id, count(*)) via an RPC to keep row volume bounded.

### L123. motivation-engine catch discards the actual error
**File:** `supabase/functions/motivation-engine/index.ts:139`  |  **Category:** error-handling  |  **Subsystem:** edge-functions

**Problem:** The catch block logs the fixed string 'Service error occurred' and never references the caught error object, making failures undiagnosable from logs. (The 200-path fallback message 'Keep up the great work! 💪' at line 131 is a minor fabricated-content concern but is at least motivational fluff, not factual.)

**Fix plan:** Change to `console.error('motivation-engine error:', error);` in the catch at line 138-139.

### L124. ingest-session-note duplicates storeTranscript instead of using _shared/sessionIngestCore
**File:** `supabase/functions/ingest-session-note/index.ts:197`  |  **Category:** maintainability  |  **Subsystem:** edge-functions

**Problem:** sessionIngestCore.ts's own header (lines 5-9) admits ingest-session-note 'carries its own copy of storeTranscript... Keep the two in sync until then.' The duplicated block (ingest-session-note lines 147-253 vs sessionIngestCore lines 83-236) includes the Drive export, UUID regex, INLINE_TEXT_MAX_BYTES, and storage/rollback logic. Divergence risk is real: any fix to rollback/cleanup semantics must be made twice, and the resolve path in scan-session-notes already uses the shared version.

**Fix plan:** Refactor ingest-session-note to import exportDocText, storeTranscript, resolveStudentAuthId, isWellFormedUuid, BUCKET, INLINE_TEXT_MAX_BYTES from ../_shared/sessionIngestCore.ts and delete the local copies (the resolve-student logic at lines 113-131 is exactly resolveStudentAuthId minus the admin check ordering). Behavior is identical; verify with one manual ingest.

### L125. teacher-operator-chat duplicates ~200 lines of find_link/route-fallback logic from teacher-link-search
**File:** `supabase/functions/teacher-operator-chat/index.ts:30`  |  **Category:** maintainability  |  **Subsystem:** edge-functions

**Problem:** ROUTE_FALLBACKS (16 entries), routeFallbacks(), findExactIndexedResources(), the embedding call, match/fts RPC fallback chain, and result-dedup logic are copy-pasted between teacher-operator-chat/index.ts (lines 30-47, 697-738, 820-847, 1093-1225) and teacher-link-search/index.ts (lines 26-133, 188-291). The hardcoded route list already risks drift (new bootcamps/routes must be added in two places), and the embedding-dimension bug above must be reasoned about in both.

**Fix plan:** Move ROUTE_FALLBACKS, routeFallbacks, findExactIndexedResources, and a shared findLink(admin, query, limit, kinds) into _shared/platformResourceResolver.ts (which both files already import from), then have both functions call it. Pure extraction, no behavior change.

### L126. AuthContext provider value is a fresh object with fresh function identities every render
**File:** `src/contexts/AuthContext.tsx:198-202`  |  **Category:** performance  |  **Subsystem:** hooks-contexts

**Problem:** signUp/signIn/signOut/resetPassword/updatePassword are re-created each render and the value object is inline, so every AuthProvider render re-renders all useAuth consumers and breaks memoization downstream. Provider state changes are rare (auth transitions), so impact is limited, but AuthContext is the most widely consumed context in the app.

**Fix plan:** Wrap the five callbacks in useCallback (empty deps; they only use supabase and window) and the provider value in useMemo keyed on [user, session, loading, authReady] plus the callbacks.

### L127. QuestionBankContext value object recreated every render; error uses generic message and drops detail
**File:** `src/contexts/QuestionBankContext.tsx:36-40`  |  **Category:** performance  |  **Subsystem:** hooks-contexts

**Problem:** `value={{ manifest, isLoading, error }}` is a new object each render of the provider (harmless today since it renders only on load/error, but any parent re-render cascades). The catch sets a fixed 'Failed to load questions' string, discarding err.message after console.error.

**Fix plan:** Wrap value in useMemo([manifest, isLoading, error]); set error to `err instanceof Error ? err.message : 'Failed to load questions'`.

### L128. useLayoutPrefs uses a hand-rolled `supabase as unknown as {...}` cast, violating the no-any-cast rule
**File:** `src/hooks/useLayoutPrefs.ts:56-60`  |  **Category:** maintainability  |  **Subsystem:** hooks-contexts

**Problem:** The save mutation casts the supabase client to a bespoke inline structural type to update profiles.layout_prefs, bypassing generated types. Per repo rules, stale types should be regenerated, not cast around; the cast also hides column-name typos from the compiler.

**Fix plan:** Regenerate Supabase types (`supabase gen types typescript --local` or the Lovable regen path) so `layout_prefs` exists on the profiles Update type, then replace the cast with a plain `supabase.from('profiles').update({ layout_prefs: payload as Json }).eq('class_id', userId)`.

### L129. useNotifications markRead/markAllRead failures are console.error only; the user gets no signal
**File:** `src/hooks/useNotifications.ts:108-140`  |  **Category:** error-handling  |  **Subsystem:** hooks-contexts

**Problem:** On update failure both mutations console.error and call refresh(), which visually reverts the optimistic flip with no explanation. Per repo rules console.error alone counts as swallowed; a toast is the established pattern elsewhere (useStudentTodo uses sonner toasts on the same failure class).

**Fix plan:** Import { toast } from 'sonner' and add `toast.error('Could not mark notification read. Try again.')` (and the mark-all variant) alongside the existing console.error + refresh.

### L130. useTAStudents query runs without an auth/enabled gate and fetches up to 500 profiles on mount
**File:** `src/hooks/useTAStudents.ts:8-21`  |  **Category:** performance  |  **Subsystem:** hooks-contexts

**Problem:** Unlike every sibling hook, useTAStudents has no `enabled: !!user` and no staleTime, so it fires immediately (including pre-auth mounts, where it errors or returns nothing under RLS) and refetches on every window focus by default, pulling the whole roster each time.

**Fix plan:** Add `const { user } = useAuth();` with `enabled: !!user` and `staleTime: 5 * 60_000` to match useHubStudents' HUB_STALE_MS convention.

### L131. useTeachingAssets issues a new server query per keystroke with no debounce or keepPreviousData
**File:** `src/hooks/useTeachingAssets.ts:29-46`  |  **Category:** performance  |  **Subsystem:** hooks-contexts

**Problem:** queryKey includes the raw `search` string, so each keystroke creates a new cache entry and a fresh network round-trip, and the list flashes to loading (no placeholderData). With an ilike OR filter this is a full-table scan per keystroke on the admin library.

**Fix plan:** Debounce the search input before it reaches the hook (useDeferredValue or a 300ms debounced state in the caller), and add `placeholderData: (prev) => prev` to the useQuery options so results don't flash while typing.

### L132. useBootcampProgress swallows the classroom_items save failure with console.warn
**File:** `src/hooks/useBootcampProgress.ts:84-86`  |  **Category:** error-handling  |  **Subsystem:** hooks-contexts

**Problem:** The debounced updateClassroomItem call catches and only console.warns. The signature ref is correctly NOT updated on failure (so the write retries on the next progress change), but if the student finishes the last day and the final write fails, teacher-facing completion status is silently wrong with no retry until the (now-complete) progress changes again, i.e. never.

**Fix plan:** In the catch, keep the console.warn but also schedule one retry (setTimeout re-invoking the same save after ~10s) and, if that fails too, fire a sonner toast ('Progress could not sync; it will retry next session') so the failure is not invisible.

### L133. calculateVelocity divides by zero and produces negative sessionsToMastery that sort first
**File:** `src/lib/drillIntelligence.ts:387-421`  |  **Category:** bug  |  **Subsystem:** lib-core

**Problem:** `improvementRate = ((recentAccuracy - earlyAccuracy) / earlyAccuracy) * 100` is Infinity when earlyAccuracy is 0 (student missed all early attempts) and NaN when both are 0. Then when currentMastery >= 0.85, remainingGap is negative, so sessionsToMastery = Math.ceil(negative / positive) is negative; trackLearningVelocity sorts ascending by sessionsToMastery, so already-mastered types incorrectly rank as 'closest to mastery' and Infinity rates leak into UI.

**Fix plan:** Guard: `const improvementRate = earlyAccuracy > 0 ? ((recentAccuracy - earlyAccuracy) / earlyAccuracy) * 100 : (recentAccuracy > 0 ? 100 : 0);` and `const sessionsToMastery = remainingGap <= 0 ? 0 : improvementRate > 0 ? Math.ceil(...) : 999;`.

### L134. wajService.logWrongAnswer read-modify-write race can drop history items and lacks the 23505 guard its sibling has
**File:** `src/lib/wajService.ts:63-107`  |  **Category:** data-integrity  |  **Subsystem:** lib-core

**Problem:** logWrongAnswer reads the row, appends to history_json in JS, and writes back. Two overlapping calls (double-submit, two tabs) lose one history item and miscompute revisit_count. The insert branch also lacks the unique-violation (23505) race handling that ensureJournalEntry (line 172) explicitly implements, so a race between logWrongAnswer and ensureJournalEntry throws instead of retrying as an update.

**Fix plan:** 1) Handle error.code === '23505' on the insert by retrying the update path once. 2) Longer term, move the append to an RPC using `history_json = history_json || $1::jsonb` and `revisit_count = jsonb_array_length(...) - 1` for atomicity.

### L135. Question bank silently drops section files on non-OK fetch responses
**File:** `src/lib/questionLoader.ts:742-745`  |  **Category:** error-handling  |  **Subsystem:** lib-core

**Problem:** In doLoad, `if (!response.ok) return null;` skips a file with no logging at all (the catch only covers thrown fetch/JSON errors). If a data file is missing from a deploy (the JSON_FILES list is hand-maintained, ~190 entries), whole PT sections vanish from the bank silently and the manifest just shows fewer questions. There is also no signal when the total loaded count drops to zero besides an info console.log.

**Fix plan:** Log (at minimum console.error with filename and status) on !response.ok, count failed files, and if failures > 0 expose that on the manifest (e.g. manifest.failedFiles) so admin surfaces can show a warning; consider throwing if zero files load.

### L136. Biased shuffle via sort(() => Math.random() - 0.5) in smart drill assembly
**File:** `src/lib/adaptiveEngine.ts:849 and 930`  |  **Category:** bug  |  **Subsystem:** lib-core

**Problem:** Both the cold-start shuffle (`[...pool].sort(() => Math.random() - 0.5)`) and the bucket `pick` helper use the comparator-random idiom, which produces a non-uniform shuffle (heavily order-biased in V8's TimSort). Questions early in the pool array (lowest PT files first) are systematically over-selected in calibration sets and bucket fills. A correct Fisher-Yates already exists in the same codebase (shuffleArray in questionLoader.ts:917) and is even used at line 968 of this file.

**Fix plan:** Import shuffleArray from './questionLoader' and replace both `.sort(() => Math.random() - 0.5)` occurrences with `shuffleArray(...)`.

### L137. detectStimulusLengthSensitivity is a permanent no-op and fatigue message hardcodes sessions[0] length
**File:** `src/lib/drillIntelligence.ts:250-254 and 241`  |  **Category:** dead-code  |  **Subsystem:** lib-core

**Problem:** detectStimulusLengthSensitivity always returns null (comment admits it), yet is called on every detectPatterns run and its pattern type is part of the public LearningPattern union, implying a capability that does not exist. Separately, the fatigue message uses `sessions[0].length / 2` (the first session's length) rather than an average of the sessions that actually showed fatigue, so the 'after N questions' number can be arbitrary (e.g. from a 2-question first session).

**Fix plan:** Either implement stimulus-length analysis or delete the method, its call site, and the 'stimulus_length' union member. For fatigue, compute the average length of fatigued sessions (or median session length) and use Math.floor(avg/2) in the message.

### L138. markQuestionSeen has a read-then-write race on times_seen
**File:** `src/lib/questionPoolService.ts:26-55`  |  **Category:** data-integrity  |  **Subsystem:** lib-core

**Problem:** Reads the usage row then writes `times_seen: existing.times_seen + 1`; concurrent calls (question served in two surfaces, or double-invoked effect under React StrictMode) lose increments, and two concurrent first-views both take the insert branch, causing a duplicate row or unique-constraint failure that is then swallowed (see the error-checking finding). times_seen feeds recycle logic, so drift accumulates.

**Fix plan:** Use an upsert with an atomic increment via RPC (`INSERT ... ON CONFLICT (class_id, qid, mode) DO UPDATE SET times_seen = question_usage.times_seen + 1, last_seen_at = now()`), exposed as a Postgres function called with supabase.rpc, with error checked and thrown.

### L139. Dead pages: Dashboard.tsx, Landing.tsx, Index.tsx, Memory.tsx are unrouted and unreferenced
**File:** `src/pages/Dashboard.tsx, src/pages/Landing.tsx, src/pages/Index.tsx, src/pages/Memory.tsx`  |  **Category:** dead-code  |  **Subsystem:** pages

**Problem:** Grep across src/ finds no import of pages/Dashboard (192 lines), pages/Landing (166 lines), pages/Index (8 lines), or pages/Memory (400 lines, a full Supabase-backed surface) anywhere, including App.tsx routes. They are dead weight that future sessions will mistake for live surfaces (Memory.tsx even contains mutation logic with toasts that looks maintained).

**Fix plan:** Confirm with `grep -rn "pages/Dashboard\|pages/Landing\|pages/Index\|pages/Memory" src` (should return only self-references), then delete the four files in one `chore(pages): remove dead unrouted pages` commit. If Memory is planned to return, note it in the vault instead of keeping the file.

### L140. Practice.tsx dead code: unused Avatar/DropdownMenu imports, signOut, toggleTheme, userInitials
**File:** `src/pages/Practice.tsx:11,36-43,196-197,378-379`  |  **Category:** dead-code  |  **Subsystem:** pages

**Problem:** `Avatar`/`AvatarFallback` (line 11) and the six DropdownMenu imports (lines 36-43) are imported but never rendered. `signOut` (196), `toggleTheme`/`theme` (197), and the computed `userInitials` (378, with its explanatory comment) are never used, remnants of a removed header avatar menu. `noUnusedLocals` is off so nothing flags this.

**Fix plan:** Delete the unused imports, remove `signOut` and `toggleTheme` from the destructures (keep `theme` only if actually used, it is not), and remove the `userInitials` computation plus its comment block at lines 375-379.

### L141. Session replay save failure only console.error'd
**File:** `src/pages/Drill.tsx:893`  |  **Category:** error-handling  |  **Subsystem:** pages

**Problem:** `flushReplay` checks the insert error but handles it with `if (error) console.error('Failed to save session replay:', error);` only. Replay is teacher-facing telemetry, so a toast to the student would be wrong, but repeated silent failures (e.g. payload/RLS issues) mean the replay feature can be dead for a student indefinitely with no signal anywhere.

**Fix plan:** Keep it non-blocking for the student, but escalate visibility: track a consecutive-failure counter in a ref and after N (e.g. 3) failures write a single structured warning row (or reuse an existing client-error logging path if one exists) so the failure is discoverable server-side. At minimum add the qid/classId to the log payload (already partially done) and document the intentional non-surfacing with a comment referencing this decision.

### L142. Analytics loads every attempt row ever recorded on each page view
**File:** `src/pages/Analytics.tsx:72-76`  |  **Category:** performance  |  **Subsystem:** pages

**Problem:** `loadAnalytics` selects all attempts for the class with no limit or date bound, then aggregates entirely client-side. Error handling is correct (setLoadError + Retry), but for long-tenured students this transfer grows without bound and reruns on every mount (no TanStack Query caching despite the app using it elsewhere).

**Fix plan:** Either 1) wrap the fetch in `useQuery({ queryKey: ['analytics-attempts', classId], staleTime: 5*60*1000 })` so back-and-forth navigation does not refetch, and/or 2) bound the query (e.g. last 90 days for the trend/miss-share sections, aggregate RPC for the all-time accuracy tables). Option 1 is the low-risk first step.

### L143. Teacher activity assign UI silently renders empty student list on load failure
**File:** `src/pages/teacher/TeacherActivities.tsx:25-35 (same pattern in teacher/desk/library/DeskLibraryActivitiesSurface.tsx:36)`  |  **Category:** error-handling  |  **Subsystem:** pages

**Problem:** If the profiles query fails, the catch sets `setStudents([])` after only `console.error('[activity:students:list] failed', err)`. The assign panel then looks like there are simply no students to assign to, which is a misleading state for the admin (dead-looking feature rather than an error).

**Fix plan:** Add `toast.error('Could not load students')` in the error branch and/or an inline 'Failed to load students - retry' row in the student picker instead of an empty list. Apply the same fix to DeskLibraryActivitiesSurface.tsx which duplicates the loader.

### L144. Mainhub greeting profile fetch discards query errors
**File:** `src/pages/AcademyMainhub.tsx:67-81 (duplicated in src/pages/Practice.tsx:242-256)`  |  **Category:** error-handling  |  **Subsystem:** pages

**Problem:** The `profiles.display_name` fetch destructures only `{ data }`; a query error is indistinguishable from 'no profile row' and silently falls back to email-derived names. Low impact (greeting only), but it is the swallowed-error pattern, it is copy-pasted in two pages, and a systemic profiles read failure would be invisible.

**Fix plan:** Extract a shared `useProfileDisplayName(userId)` hook (TanStack useQuery against profiles) used by both AcademyMainhub and Practice; in the hook, log the error via a single console.warn with context and return null so the fallback chain still works, eliminating the duplicated inline effect.

### L153. @typescript-eslint/no-unused-vars disabled repo-wide, combined with noUnusedLocals off
**File:** `eslint.config.js:23`  |  **Category:** maintainability  |  **Subsystem:** scripts-tests

**Problem:** eslint.config.js line 23 sets `'@typescript-eslint/no-unused-vars': 'off'` while tsconfig.app.json also has noUnusedLocals/noUnusedParameters false. No tool anywhere flags dead imports/variables, which is how missing-import bugs like C145 survive and how dead code accumulates in a 65-module src/lib.

**Fix plan:** In eslint.config.js replace the 'off' with `'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }]`. Keep it at 'warn' so it doesn't explode the error count; do this after H146 (ignores fix) so the count is measured on product code only.

### L154. Bank-repair scripts swallow unparseable question banks and always exit 0
**File:** `scripts/repair-bank-hygiene.mjs:199`  |  **Category:** error-handling  |  **Subsystem:** scripts-tests

**Problem:** `recoverCorruptedQtypes` (line 199) does `try { doc = JSON.parse(...) } catch { continue; }`: a public/data bank still malformed after repairFences is silently excluded from qtype recovery with no report, so the script can print "Done." while a bank remains broken in production data. Same pattern in `scripts/apply-reasoning-types.mjs:50` and `scripts/audit-coaching-kb.mjs:349,504`. The scripts also always exit 0 even when residual unrecoverable rows are found, so they cannot gate anything.

**Fix plan:** In repair-bank-hygiene.mjs: 1) in recoverCorruptedQtypes, replace `catch { continue; }` with collecting the filename into an `unparseable[]` array; after the loop, print them under a `[!] still unparseable` header. 2) At the bottom, exit nonzero when problems remain: `if (rec.residuals.length > 0 || unparseable.length > 0) process.exit(1)`. Apply the same catch-and-report pattern to apply-reasoning-types.mjs:50.

### L155. Import pipeline log lines hardcode expected counts instead of actual counts
**File:** `scripts/main-conclusion/import-content.ts:147`  |  **Category:** bug  |  **Subsystem:** scripts-tests

**Problem:** `emitTraps` logs the literal string "7 trap traits validated + emitted" (line 147) and `emitSimulator` logs "20 simulator questions..." (line 200) regardless of `validated.length`. Unlike `emitIndicatorVault` (which asserts length===6 at line 132), traps and simulator have no count assertion, so if the source arrays shrink or grow the log lies and nothing fails: the fake-status pattern the repo's truthful-UI rule bans.

**Fix plan:** Line 147: change to ``log.ok(`${validated.length} trap traits validated + emitted`)``. Line 200: use `${validated.length}` for the question count and denominator. Optionally add hard assertions mirroring line 132 if the counts are contractual (throw if TrapTraitList length !== 7 or SimulatorBank length !== 20).
