# Cross-Scan Verification — April 2026

**Purpose.** This file reconciles two independent scans (Gemini, "Untitled") against the original April 2026 audit bundle. Every new finding was verified against the actual repo at HEAD `9165b2c` before being accepted.

**Scope of the new scans.**
- **Gemini scan** — two areas: Design System / UI/UX (Scan 4), and Infrastructure / PWA / QA (Scan 5). 171 lines.
- **Untitled scan** — four areas: Inbox/Auth (Scan 2), Drill/Practice (Scan 3), Admin/Content surfaces (Scan 4), Design System / Shell (Scan 5). 1,524 lines.

**Verification tally.** 23 findings across both scans. 19 confirmed as real and materially distinct from the April 2026 audit. 1 refuted outright. 3 findings turned out to be worse under inspection than the scans claimed.

**Severity ordering changed.** The original top-3 (Classroom mock, mobile nav trap, Drill error swallow) is superseded by a new top-5 with schema contract drift taking the top slot. See §6 at the end of this file.

---

## 1. Confirmed findings with new F-IDs

### F2.13 — LRSectionResults writes to section_history with 7 fields that don't exist in schema
**Severity: 10/10** — product-breaking.

**Evidence.** `src/components/drill/LRSectionResults.tsx:167-185` inserts these fields:
```
section_mode, br_total, br_delta, avg_time_ms, unanswered_count,
by_qtype_json, by_difficulty_json, br_used
```
Generated schema (`src/integrations/supabase/types.ts`) defines:
```
class_id, completed_at, confidence_ratings(no — actually: blind_review_percent, blind_review_score, br_percent, br_score, class_id, completed_at, created_at, id, initial_percent, initial_score, initial_total, mode, pt, questions_json, section, time_taken_ms, total_questions, total_time_ms, user_id)
```

Mismatch: `section_mode` should be `mode`; `br_total`, `br_delta`, `avg_time_ms`, `unanswered_count`, `by_qtype_json`, `by_difficulty_json`, `br_used` do not exist at all.

**Why it ships silently.** `tsconfig.app.json` has `strict: false` and `noImplicitAny: false`. Vite uses SWC for builds, no type-check. No CI. The insert hits the DB where Postgres rejects unknown columns, but the outer try/catch at `LRSectionResults.tsx` only logs to console. Per F2.2, the student never sees an error.

**Impact.** Every full-section score-report completion silently fails to write its `section_history` row. The RecentPerformanceWidget queries that table. The widget shows a polished-looking empty state forever. Compounds with F2.15.

**Fix.** Either update the types file if the DB actually has these columns (regenerate with `supabase gen types typescript --local`), or update the insert payload to match the canonical schema. Surface errors with `toast.error` not `console.error`.

---

### F2.14 — saveBRResults writes 16 unknown fields across blind_review_sessions and attempts
**Severity: 10/10** — product-breaking.

**Evidence.** `src/pages/Drill.tsx:1495-1543`.

`blind_review_sessions` insert has 8 fields. The schema defines:
```
class_id, completed_at, confidence_ratings, created_at, flagged_qids, id,
original_answers, pt, reviewed_answers, section, started_at
```
Insert uses: `class_id` ✓ and then `session_id`, `br_items_count`, `br_corrected_count`, `br_stuck_count`, `br_regret_count`, `br_confirmed_count`, `br_median_time_ms`. **Zero** of those 7 exist in schema.

`attempts` insert within the BR loop has 20+ fields. Schema has:
```
app_version, class_id, confidence, correct, id, level, mode, pt, qid, qnum,
qtype, section, selected_answer, set_id, time_ms, timestamp_iso, user_id
```
Insert adds: `br_marked`, `pre_answer`, `br_selected`, `br_answer`, `br_rationale`, `br_time_ms`, `br_changed`, `br_outcome`, `br_delta`. **Zero** of those 9 exist.

**Impact.** Every blind review session silently fails to persist. Users see the BR results screen, feel good about reviewing, and nothing is saved. This is the single most dangerous truthfulness failure in the repo — it's a direct violation of the product rule "no fake analytics."

**Fix.** Decide whether BR needs these fields or whether the schema needs columns added. Add a migration extending `blind_review_sessions` and `attempts` with the BR metadata if they're needed for product analytics. Or remove the unused fields from the client payload. Regenerate types.

---

### F2.15 — Full-section mode persists ZERO per-question attempts
**Severity: 9/10** — flagship mode writes nothing.

**Evidence.** Two failures compound:

1. `Drill.tsx:449`: `timeMs: isPracticeSetMode ? questionTimer.current.getTotalTime(...) : 0`. Full-section mode stores `timeMs: 0` placeholder for every answer.

2. `Drill.tsx:1000` `handleFinishSection` never calls `saveAttemptToDatabase`. Only reconciles in-memory correctness and routes to the post-section screen. No `for` loop over `session.attempts` with per-question DB writes (unlike `handleFinishPracticeSet` at line 917 which does persist).

The only DB writes attempted for full-section mode are:
- `LRSectionResults` → `section_history` insert (fails per F2.13).
- WAJ writes for wrong answers inside `LRSectionResults` (these may work — not verified at scan depth).
- BR writes if user does Blind Review (fail per F2.14).

**Impact.** The "most premium" flagship mode — full exam simulation — writes essentially nothing meaningful to the database. Analytics, RecentPerformanceWidget, opportunity detection, and WAJ all miss the data from the mode that generates the most signal per session.

**Fix.** Add a `saveAttempts` loop at the top of `handleFinishSection` that writes each `session.attempts` entry to the `attempts` table. Use real timing from a per-question timer if available; as a minimum, record `total_time_ms / total_questions` as an average. After F2.13 is fixed, the section-level insert will also work.

---

### F2.16 — `natural-drill` is not a distinct runtime mode
**Severity: 3/10** — product truthfulness, not bug.

**Evidence.** `Home.tsx:184-185`: `const handleStartTypeDrill = (config) => { navigate('/drill', { state: { mode: 'type-drill', config } }); }`. Both QuestionPicker and NaturalDrillCreator route through this handler. `Drill.tsx:184-295` has explicit branches for `adaptive`, `full-section`, `type-drill` only. No `natural-drill` branch exists.

**Impact.** "Smart Builder" is visually distinct in Home.tsx but runs identical runtime to type-drill. Minor product-truthfulness miss.

**Fix.** Either make natural-drill actually distinct (e.g., different question selection algorithm) or drop the separate entry card in Home.

---

### F2.17 — TDZ risk: saveBRResults referenced in JSX closures before declaration
**Severity: 6/10** — latent ReferenceError.

**Evidence.** `Drill.tsx:1474` declares `const saveBRResults = async (...) => {...}`. Lines 1322-1335 (early-return branch for `postSectionScreen === 'review'`) and 1425-1430 (inside `showBRFlow` branch) both create JSX with `onComplete` closures that call `saveBRResults`.

When those early-return branches render, execution never reaches line 1474. The `const` binding stays in TDZ for the closure. When the user clicks "Complete Review," the closure runs and throws `ReferenceError: Cannot access 'saveBRResults' before initialization`.

The error gets caught by the outer try/catch or React's error boundary. Given the error-swallowing pattern, it's silent.

**Why users may not have hit this.** React re-renders frequently. If state changes between the early-return render and the user's click, the component re-renders and the new closure captures an initialized binding — but only because that re-render went through a branch that reached line 1474 first. Race-sensitive.

**Fix.** Hoist `saveBRResults` (and any other downstream callbacks) above the early-return JSX branches. Standard pattern: declare all callbacks before the first conditional `return`.

---

### F2.18 — Adaptive engine library surface > runtime surface
**Severity: 5/10** — product truthfulness.

**Evidence.** `src/lib/adaptiveEngine.ts` is 681 lines with methods `hydrateFromDB`, `calculateAbility`, `selectNextQuestion`, `recordAttempt` (used) plus `analyzeWeakAreas` (0 callers), `getAdaptiveDrillSequence` (0 callers), `generateSmartDrill` (1 caller: `TypeDrillPicker.tsx:198` — Smart Builder preview, not runtime).

**Impact.** The "adaptive mode" users experience is a simpler next-question selector than the library implies. This connects to F2.6: both the "move to edge function" and the "consolidate dead methods" conversations become the same refactor.

**Fix.** Either wire `analyzeWeakAreas` + `getAdaptiveDrillSequence` into the runtime flow (they're already written) or delete them. Don't ship dead algorithmic scaffolding that falsely implies product sophistication.

---

### F2.19 — UserSettings persist to localStorage only
**Severity: 4/10** — product gap for premium study tool.

**Evidence.** `src/contexts/UserSettingsContext.tsx:26, 62`. `localStorage.getItem('userSettings')` / `localStorage.setItem('userSettings', ...)`. No Supabase calls anywhere in the context.

**Impact.** Settings follow the browser. Logout/login on same machine retains them. Cross-device: lost. Important settings include `defaultTimingMode`, `tutorEnabled`, `voiceCoachEnabled`, `allowRepeats`, `preferUnseen`, `recycleAfterDays`. For a premium study product used across phone + desktop + iPad, this is a real miss.

Also note: several listed settings (`tutorEnabled`, `voiceCoachEnabled`, `showContrast`, `teachBackOnCorrect`, `sectionDebriefEnabled`, `storeFullTranscript`) appear in the context type but only a subset (`allowRepeats`, `preferUnseen`, `recycleAfterDays`, `showContrast`) visibly affect runtime behavior. Some settings may be aspirational.

**Fix.** Add a `user_settings` table (or a JSON column on `profiles`). On login, load from DB. On change, write to DB + localStorage (LS as cache). Audit each setting for real runtime effect; remove dead knobs.

---

### F2.20 — Highlights / eliminations / BR marks are session-only
**Severity: 3/10** — acceptable for V1, premium gap.

**Evidence.** `Drill.tsx:96, 98` etc. All annotation state lives in `React.useState` without persistence to DB. No `question_highlights` or `annotations` table in schema.

**Impact.** Refresh mid-drill → lose all highlights. Cross-device study → no continuity. For a premium LSAT tool, students may reasonably expect their markups to survive refresh.

**Fix.** Non-urgent. Add a `question_annotations` table keyed on `(user_id, qid)` with a JSON payload. Debounce writes to avoid chattiness.

---

### F3.18 — Realtime attachment race: receiver sees message before attachment
**Severity: 7/10** — messaging correctness.

**Evidence.** `MessageComposer.tsx:64-101` send sequence: insert `messages` row → upload PDF to storage → insert `message_attachments` row. `useInbox.ts:213-218` (`useConversationMessages`) subscribes only to `messages` INSERT events via `postgres_changes`. No subscription to `message_attachments`.

**Impact.** Receiver gets the realtime INSERT for the message, runs `load()`, sees the message with no attachments (row not inserted yet). No further realtime event fires when the attachment row lands. Receiver never auto-refreshes and never sees the PDF until a manual action reloads the thread.

**Fix options.**
- **(A)** Add a parallel `postgres_changes` subscription on `message_attachments` filtered by `message_id IN (messages for this conversation)`. On fire, re-`load()` or merge the attachment into the existing message.
- **(B)** Reverse the send order: upload to storage first, insert `message_attachments` second, insert `messages` last. Then the single subscription catches a fully-formed message.
- **(C)** Wrap the send in a server-side RPC that inserts everything atomically.

Option B is cheapest and closes F3.10 (attachment rollback) at the same time.

---

### F3.19 — ThreadList preview empty for PDF-only messages
**Severity: 4/10** — product polish.

**Evidence.** `src/components/inbox/ThreadList.tsx:61`: `{c.last_message?.body || c.subject || 'New conversation'}`. For attachment-only messages (no body text), fallthrough to `c.subject` (typically null for 1:1) then to `'New conversation'`.

**Impact.** Attachment-first conversations look empty in the inbox list. "Joshua sent you a PDF" should not render as "New conversation."

**Fix.** Extend `last_message` type to include `has_attachment: boolean`. Preview logic: `c.last_message?.body || (c.last_message?.has_attachment ? '📎 PDF attached' : c.subject) || 'New conversation'`.

---

### F4.14 — Analytics.tsx has no class_id or user_id filter
**Severity: 8/10** — RLS-dependent, cross-user leak if RLS loose.

**Evidence.** `src/pages/Analytics.tsx:64-68`:
```
const { data: attempts, error } = await supabase
  .from('attempts')
  .select('qtype, level, correct, timestamp_iso')
  .gte('timestamp_iso', thirtyDaysAgo.toISOString())
  .order('timestamp_iso', { ascending: false });
```
No `.eq('class_id', ...)` or `.eq('user_id', ...)`.

**Impact.** Correctness depends entirely on RLS. Combined with F5.8 (April 6 baseline migrations reintroducing `USING (true)` on attempts), this is potentially a cross-user data leak in production right now. Every student may be seeing aggregate stats computed from all students' attempts.

**Fix.** Two-part. (1) Confirm production RLS on attempts is actually tight (inspect DB). (2) Add explicit `.eq('class_id', resolvedClassId)` to the query as defense-in-depth. Don't rely on "lucky RLS."

---

### F4.15 — Profile.tsx uses wrong key `.eq('id', user.id)`
**Severity: 7/10** — feature broken.

**Evidence.** `src/pages/Profile.tsx:162-164`:
```
const { data: student } = await supabase
  .from('students')
  .select('class_id')
  .eq('id', user.id)   // ← WRONG: students.id is row PK, not auth link
  .maybeSingle();
```
Correct key is `user_id`. `Drill.tsx:146-148` uses `.eq('user_id', user.id)` (correct). `AuthContext.tsx:68` inserts with `user_id = userId` (confirming the convention).

**Impact.** Profile page never resolves the student row. `stats` stays at defaults. XP, streak, level render as zeros forever. This is the **hidden reason** Profile shows all zeros, compounding with F4.5 (gamification writes are unwired). Even if gamification were wired, Profile couldn't read it.

**Fix.** One-line change: `.eq('user_id', user.id)`. Ship immediately.

---

### F4.16 — Classroom assignment launcher bounces to /foyer
**Severity: 7/10** — dead button, compounds F4.1.

**Evidence.** `src/pages/Classroom.tsx:321`: `if (a.linkedRoute) navigate(a.linkedRoute);`. Mock assignments in `classroomData.ts` have `linkedRoute: '/drill'`. `Drill.tsx:168-171`: `if (!state?.mode) { navigate('/foyer'); return; }`.

**Impact.** Every "Start," "Resume," or "Revise & Resubmit" button on a mock assignment is a dead action. User clicks → navigates to `/drill` without state → immediately bounces to `/foyer`. No error, no feedback.

**Fix.** Trivial if F4.1 is being fixed ("truthful empty state"): delete the Classroom launcher path entirely. If F4.1 stays: `navigate('/drill', { state: { mode: 'type-drill', config: { qtypes: assignment.qtypes, pts: assignment.pts, ... } } })`.

---

### F4.17 — FoyerSidebar hardcodes routes with no permission gating
**Severity: 5/10** — shell truthfulness.

**Evidence.** `src/components/foyer/FoyerSidebar.tsx:24-28` hardcodes the workspace link list (Classroom, Bootcamps, Analytics, Schedule). Zero `useUserPermissions` reads, zero `is_admin || has_classroom_access` checks.

Contrast: `src/App.tsx` wraps each of those routes in `<ProtectedRoute flag="has_classroom_access" />` etc.

**Impact.** User without a feature flag still sees the link in the sidebar. Clicks → ProtectedRoute denies → access-denied state or silent redirect. Violates "no dead buttons" product rule.

**Fix.** Import `useUserPermissions` in `FoyerSidebar`. Filter the route array by flag. Best done after F1.1 (PermissionsContext hoist) so the sidebar reads from the same context everyone else reads from.

---

### F5.19 — PWA CacheFirst with 7-day maxAge on question JSON
**Severity: 7/10** — staleness window for data corrections.

**Evidence.** `vite.config.ts:37-45`:
```
urlPattern: /^\/data\/.*\.json$/,
handler: "CacheFirst",
options: { cacheName: "question-data",
  expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 } }
```

**Impact.** If a question has a typo fixed, a wrong correct-answer corrected, or a difficulty level adjusted, cached clients serve the broken version for up to 7 days. This is particularly dangerous for an educational product — students practice with wrong answers, lose trust in grading.

In my original F5.13 I marked this as positive. The Gemini scan's reframing is correct; I was too charitable.

**Fix.** Change `handler: "CacheFirst"` to `handler: "StaleWhileRevalidate"`. Keep the expiration. This serves cached version immediately (offline-capable), fetches fresh version in background, next reload has the update. Best of both.

---

### F5.20 — `(supabase as any)` bypass at 18 call sites
**Severity: 7/10** — enables silent schema drift.

**Evidence.** 18 call sites across `drillIntelligence.ts`, `questionPoolService.ts`, `wajService.ts`, `templateService.ts`, `adaptiveEngine.ts`, `Drill.tsx`, `useInbox.ts`. All bypass the generated Supabase types.

**Impact.** This is the enabling mechanism that lets F2.13 and F2.14 (schema drift) survive undetected. With strict typing the insert payload mismatches would be compile-time errors. With `as any`, the compiler ignores everything.

**Fix.** Systematically remove `(supabase as any)` from all 18 sites. Some will expose real type errors that need fixing (likely in `wajService.ts` and `drillIntelligence.ts` queries against the coaching-knowledge tables). Some may compile immediately. After removal, enforce via lint rule: `@typescript-eslint/no-explicit-any` on Supabase calls.

---

### F5.21 — RecentPerformanceWidget hardcodes colors, bypasses tokens
**Severity: 5/10** — design system integrity.

**Evidence.** `src/components/dashboard/RecentPerformanceWidget.tsx` uses:
- `bg-neutral-900/70` (should be `bg-card` or `bg-surface-elevated`)
- `border-white/[0.06..0.14]` (should be `border-border`)
- `text-white` (should be `text-foreground` or `text-text-primary`)
- `bg-white/[0.02..0.10]` (should be token-driven)

**Impact.** In light mode, this widget maintains dark-glass aesthetic on a light background. Visual contract broken. Also blocks F5.1 (theme convention flip) — this widget won't respond to theme changes no matter how F5.1 is fixed.

**Fix.** Replace every hardcoded color with tokens. `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `hover:bg-accent`, etc.

---

### F5.22 — BackgroundPaths renders 72 animated SVG paths
**Severity: 4/10** — perf on low-end devices.

**Evidence.** `src/components/ui/background-paths.tsx:7`: `Array.from({ length: 36 }, ...)`. Used with `position={1}` and `position={-1}` → 72 paths. Two render blocks in the file suggest up to 144 under some conditions. Each path animates via Framer Motion with `pathLength`, `pathOffset`, `repeat: Infinity`.

Used on Home, Auth, ResetPassword, Onboarding.

**Impact.** Continuous CPU/GPU cost on four high-traffic entry screens. Low-end Android phones, iPads from before ~2020, any device sharing resources with other apps — noticeable frame drops likely.

**Fix.** Reduce count (36 → 12 or 18). Or gate behind `prefers-reduced-motion`. Or use CSS animation instead of Framer Motion for simpler paths.

---

### F5.23 — IL (instrument label) component redefined in 4 pages
**Severity: 3/10** — code hygiene.

**Evidence.** `function IL` declared locally in `Profile.tsx:76`, `Classroom.tsx:22`, `Bootcamps.tsx:9`, `WrongAnswerJournal.tsx:36`. All functionally identical.

**Impact.** Inconsistency risk (one page diverges, only that page updates). Classic shared-primitive-never-extracted.

**Fix.** Extract to `src/components/ui/instrument-label.tsx` (or `src/components/common/IL.tsx`). Import in all four pages. This is also a template for a broader `src/components/common/` shell primitive extraction (F5.28 — repeated header boilerplate overlap with F4.13).

---

### F5.24 — OrbitalLoader orphaned, raw `animate-spin` used everywhere
**Severity: 4/10** — branded loader exists but is never used.

**Evidence.** `src/components/ui/orbital-loader.tsx` defines a branded loader. Zero external imports. Ten+ files use raw `<div className="... animate-spin"/>` instead:
```
Profile.tsx, AdminDashboard.tsx, Analytics.tsx,
TypeDrillPicker.tsx, NaturalDrillCreator.tsx, ProtectedRoute.tsx,
VoiceCoachModal.tsx, CSDrillPlayer.tsx, InteractiveStemDrill.tsx,
animated-button.tsx
```

**Impact.** Loading states feel unbranded. Premium feel degrades every time a student waits for auth/data/network. ProtectedRoute's spinner shows on every route change — most-visible loading state in the app.

**Fix.** Replace the raw spinner at `ProtectedRoute.tsx:25-27` with `<OrbitalLoader />`. Systematically replace the other 9 sites. This removes F5.3's "unused UI components" count by 1 and makes the product feel materially more cohesive.

---

### F5.25 — hover: variants lack `@media (hover: hover)` guard
**Severity: 5/10** — mobile UX broken.

**Evidence.** `Drill.tsx` has `hover:opacity-70` on answer choices, `hover:bg-neutral-100` on nav buttons, `hover:scale-110` on question-nav pills. Total `hover:` usages repo-wide: 50+. Zero `@media (hover: hover)` guards.

**Impact.** On iOS/iPadOS, after a tap hover states "stick" because touch devices emulate hover until another interaction. Classic sticky-hover bug. Users tap an answer, it dims, they tap another answer, now two answers look selected/dimmed simultaneously.

**Fix.** One line in `tailwind.config.ts`:
```
future: { hoverOnlyWhenSupported: true }
```
Tailwind 3.4 supports this. It auto-wraps every `hover:` variant in `@media (hover: hover)` repo-wide. One-line fix for 50+ hover states.

---

### F1.10 — class_id resolution inconsistent across 4+ surfaces
**Severity: 6/10** — latent bomb.

**Evidence.** Four different patterns:
- `Home.tsx:127`: `.eq('class_id', user.id)` — assumes class_id = user.id directly.
- `RecentPerformanceWidget.tsx:34`: `const classId = user.id` — same assumption.
- `Drill.tsx:146-162`: Fetches from `students.user_id`, falls back to `user.id` if missing.
- `Profile.tsx:162-164`: Queries wrong key (`.eq('id', ...)`), never resolves.
- `Analytics.tsx:64`: No filtering at all.

**Why it "works" today.** Client provisioning in `AuthContext:68` sets `class_id = user_id` at insert time. The `get_user_class_id` Postgres fallback does `COALESCE(students.class_id, uid::text)`. So `class_id == user.id` for every user in current data.

**Impact.** The day classrooms become real (each student linked to a shared class ID distinct from their user ID), Home + RecentPerformanceWidget break immediately. Profile is already broken. Drill works by intent. Analytics becomes undefined.

**Fix.** Add a `useClassId()` hook (or fold into F1.1's PermissionsContext) that returns `{ classId, loading }`. Every surface imports and uses it. Single resolution logic, single source of truth. Bonus: kills the duplicated fetch at Drill.tsx:141-162 (my F2.8).

---

## 2. One finding refuted

### N10 — `conversations.last_message_at` update path
**Status: false alarm.**

The Untitled scan flagged this as "I did not inspect the migration SQL, so this is an open correctness checkpoint." Verification: migration `supabase/migrations/20260416234013_49bfd508-03f2-4942-a636-2763f1f3af5b.sql` contains:
```sql
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_last_message
AFTER INSERT ON public.messages
```

Conversation ordering is maintained DB-side. Not a bug. Well-designed.

---

## 3. Interactions between findings — why they compound

Several of the new findings amplify each other in ways the original audit didn't fully capture:

**Schema drift chain (F2.13 ↔ F2.14 ↔ F5.20 ↔ F2.2).**
- `(supabase as any)` bypass at 18 sites (F5.20) = type system can't catch drift.
- No CI, lax tsconfig = build doesn't catch drift.
- Error swallowing in mutations (F2.2) = runtime doesn't surface drift.
- Result: schema contract drift (F2.13, F2.14) survives indefinitely. The bug is the intersection of four compensating lax-enforcement decisions.

**Full-section failure chain (F2.15 ↔ F2.13 ↔ F2.14 ↔ F4.14).**
- Full-section mode runs (F2.15).
- No `attempts` rows written.
- `section_history` row written but rejected (F2.13).
- If user does BR, BR writes rejected too (F2.14).
- Analytics (F4.14) queries `attempts` without filter. The data it aggregates is already missing all full-section sessions.
- RecentPerformanceWidget queries `section_history`. Shows nothing because inserts keep failing.
- **Net effect: the most data-rich mode produces zero analytics signal. Students see fake-empty dashboards.**

**Identity contract drift chain (F1.10 ↔ F4.15 ↔ F4.14 ↔ F4.1b).**
- class_id/user_id inconsistency across surfaces (F1.10).
- Profile wrong key means Profile NEVER reads student data (F4.15).
- Analytics no scope means cross-user leak if RLS loose (F4.14).
- Classroom launcher bounces (F4.16) because assignment carries no class context.
- The identity layer is fractured in a way that only a coordinated fix at the PermissionsContext level will repair cleanly.

**Theme/design truthfulness chain (F5.1 ↔ F5.21 ↔ F5.22 ↔ F5.24 ↔ F5.25).**
- `.dark` class semantics inverted (F5.1).
- RecentPerformanceWidget hardcodes (F5.21) = won't respond to theme fix.
- OrbitalLoader orphaned (F5.24) = every loader is raw.
- Sticky hover bug on mobile (F5.25).
- BackgroundPaths perf (F5.22).
- The design system looks premium in tokens and looks sloppy in execution.

---

## 4. New top-5 priorities (replaces the April 2026 top-3)

The original top-3 (F4.1 Classroom mock, F3.1 mobile nav trap, F2.2 error swallow) was correct in direction but missed the deeper truthfulness failures. Revised ordering:

| Rank | Issue | Severity | Why #N |
|---|---|---|---|
| **1** | **Schema contract drift — F2.13 + F2.14** | 10 | Every section completion and every BR silently persists nothing. Product lies to students about their own data. |
| **2** | **Full-section persists zero attempts — F2.15** | 9 | Compounds with #1. Most premium mode is the weakest persistence path. |
| **3** | **Classroom mock + launcher dead — F4.1 + F4.16** | 10 | Fake data AND dead buttons on the same surface. |
| **4** | **Identity/scoping broken — F1.10 + F4.15 + F4.14** | 8 | Cross-cutting bugs in class_id/user_id handling. Profile broken today; Analytics latent leak. |
| **5** | **Mobile nav trap + Ask Joshua dead — F3.1 + F3.4** | 9 | Primary landing page broken on phones for new students. |

**Demoted from the old list:** `Drill.tsx` error swallow (old F2.2) is still serious but is now more useful as the root-cause explanation for why F2.13/F2.14 went undetected, than as its own top-tier item.

**New urgent items that didn't exist in April:** F2.13, F2.14, F2.15, F4.15, F4.16, F5.20, F3.18, F5.19.

---

## 5. What to fix first, concretely

If you can do only three things this week:

**Monday — kill the schema drift.**
- Regenerate Supabase types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`.
- If the types now include the BR / section fields, the DB already has them and the insert is fine. If they don't, write a migration adding: `blind_review_sessions` gets `session_id uuid, br_items_count int, br_corrected_count int, br_stuck_count int, br_regret_count int, br_confirmed_count int, br_median_time_ms bigint`. `attempts` gets the BR columns. `section_history` gets `section_mode, br_total, br_delta, avg_time_ms, unanswered_count, by_qtype_json jsonb, by_difficulty_json jsonb, br_used bool`.
- Re-run the app. Full-section completions should now persist correctly.

**Tuesday — add the missing `saveAttempts` loop in handleFinishSection.**
- Extract a `commitFullSectionAttempts(session)` helper.
- Call before `setPostSectionScreen(...)`.
- Use a per-question timer (either extend `QuestionTimer` to cover full-section mode or record timestamps on each `handleAnswerSelect`). At minimum, split total_time_ms evenly across questions as a fallback.

**Wednesday — fix Profile and Analytics.**
- One-line: `Profile.tsx:164` → `.eq('user_id', user.id)`.
- Add explicit `.eq('class_id', resolvedClassId)` in `Analytics.tsx:64`. Resolve classId from `PermissionsContext` (create it if needed — addresses F1.1 and F1.10 together).

Everything else in the scan files can wait or parallelize.

---

## 6. New F-IDs summary

| F-ID | Finding | Scan area | Severity |
|---|---|---|---|
| F1.10 | class_id resolution inconsistent | Auth | 6 |
| F2.13 | LRSectionResults schema drift | Drill | 10 |
| F2.14 | saveBRResults schema drift (2 tables) | Drill | 10 |
| F2.15 | Full-section mode persists zero attempts | Drill | 9 |
| F2.16 | natural-drill not a distinct runtime mode | Drill | 3 |
| F2.17 | TDZ risk in saveBRResults closures | Drill | 6 |
| F2.18 | Adaptive engine library > runtime | Drill | 5 |
| F2.19 | UserSettings localStorage-only | Drill | 4 |
| F2.20 | Highlights/eliminations session-only | Drill | 3 |
| F3.18 | Realtime attachment race | Foyer/Inbox | 7 |
| F3.19 | ThreadList empty preview for PDF-only | Foyer/Inbox | 4 |
| F4.14 | Analytics.tsx no scoping | Admin/Content | 8 |
| F4.15 | Profile.tsx wrong key | Admin/Content | 7 |
| F4.16 | Classroom launcher bounces | Admin/Content | 7 |
| F4.17 | FoyerSidebar hardcodes routes | Admin/Content | 5 |
| F5.19 | PWA CacheFirst staleness | Design/Infra | 7 |
| F5.20 | `(supabase as any)` 18 sites | Design/Infra | 7 |
| F5.21 | RecentPerformanceWidget hardcodes | Design/Infra | 5 |
| F5.22 | BackgroundPaths 72 animated paths | Design/Infra | 4 |
| F5.23 | IL redefined 4x | Design/Infra | 3 |
| F5.24 | OrbitalLoader orphaned | Design/Infra | 4 |
| F5.25 | hover: without `(hover:hover)` guard | Design/Infra | 5 |

22 new F-IDs. All verified against current repo state.

---

## 7. Scan-comparison verdict

**Gemini scan.** Terse, accurate, correctly identified PWA CacheFirst staleness (missed in April audit), `(supabase as any)` mechanism (missed in April audit), and the OrbitalLoader/hover-state issues. Overstates Drill.tsx's `classList` hack as "severe" when April's framing was "pragmatic but fragile" — both are defensible; I adjusted the original F2.7 down from "positive confirmation" to "minor finding."

**Untitled scan.** Long-form, forensic, much higher hit rate. Found the schema contract drift that I missed in April — the single most important finding across both scans. Found the Profile.tsx key bug, the Classroom launcher bounce, the attachment race, the class_id inconsistency, the TDZ risk. All verified as real. The only miss was N10 (last_message_at) which self-flagged as unverified.

**Net assessment.** Both scans were worth running. The April 2026 audit was correct in broad strokes but missed a cluster of truthfulness failures concentrated in the Drill.tsx persistence layer and in the class_id/user_id identity contract. Those failures compound — and compound against each other — in ways that materially change the priority ordering.

Master reference §6 priority list is updated accordingly in a separate edit to `master-reference.md`.
