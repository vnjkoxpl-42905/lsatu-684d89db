# Fixes Delta — post Cross-Scan Verification

Net-new action items from the Gemini + Untitled scans, on top of everything already in `master-reference.md` §6. Every fix below maps to an F-ID introduced in `06-cross-scan-verification.md`. None duplicate the original April 2026 priority list.

---

## Drill surface — persistence

**F2.13** — Schema drift on `section_history` insert.
Regenerate Supabase types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`. If types lack the fields, add a migration extending `section_history` with `section_mode, br_total, br_delta, avg_time_ms, unanswered_count, by_qtype_json jsonb, by_difficulty_json jsonb, br_used bool`. Replace `console.error` in `LRSectionResults.tsx` with `toast.error`.

**F2.14** — Schema drift on `blind_review_sessions` + `attempts` (BR fields).
Same regenerate-or-migrate decision. `blind_review_sessions` gets `session_id, br_items_count, br_corrected_count, br_stuck_count, br_regret_count, br_confirmed_count, br_median_time_ms`. `attempts` gets `br_marked, pre_answer, br_selected, br_answer, br_rationale, br_time_ms, br_changed, br_outcome, br_delta`.

**F2.15** — Full-section mode persists zero attempts.
Add a `saveAttempts` loop at the top of `handleFinishSection` in `Drill.tsx:1000`. Write each `session.attempts` entry to the `attempts` table before setting `postSectionScreen`. Fix `timeMs: 0` at `Drill.tsx:449` by recording per-question timestamps in `handleAnswerSelect`, or extend `QuestionTimer` to full-section mode.

**F2.17** — TDZ risk on `saveBRResults` closures.
Hoist `const saveBRResults` from `Drill.tsx:1474` to above the first early-return JSX branch around line 1313. All callbacks before all conditional returns.

**F2.18** — Adaptive engine library > runtime surface.
Either wire `analyzeWeakAreas` + `getAdaptiveDrillSequence` into the runtime adaptive flow in `Drill.tsx`, or delete them from `adaptiveEngine.ts`.

**F2.16** — `natural-drill` not a distinct runtime mode.
Either give `natural-drill` its own branch in the `Drill.tsx:184` mode switch, or drop the separate card from `Home.tsx`.

**F2.19** — UserSettings localStorage-only.
Add a `user_settings` table (or JSON column on `profiles`), read on login, write on change, keep localStorage as cache.

**F2.20** — Highlights/eliminations session-only.
Add `question_annotations` table keyed `(user_id, qid)` with JSON payload, debounce writes.

---

## Messaging

**F3.18** — Realtime attachment race.
Flip send order in `MessageComposer.send()`: upload to storage first, insert `message_attachments` second, insert `messages` last. Single subscription catches fully-formed message. Also closes F3.10.

**F3.19** — ThreadList empty for PDF-only messages.
Extend `last_message` select to include a `has_attachment` flag. `ThreadList.tsx:61` becomes: `c.last_message?.body || (c.last_message?.has_attachment ? '📎 PDF attached' : c.subject) || 'New conversation'`.

---

## Admin / Content

**F4.14** — Analytics has no scoping.
`Analytics.tsx:64` — add `.eq('class_id', resolvedClassId)`. Resolve `classId` from PermissionsContext (or fold with F1.10 fix).

**F4.15** — Profile wrong key.
One-line fix: `Profile.tsx:164` → `.eq('user_id', user.id)`.

**F4.16** — Classroom launcher bounces.
If keeping Classroom: change `Classroom.tsx:321` to `navigate('/drill', { state: { mode: 'type-drill', config: {...} } })`. If gutting Classroom (F4.1): delete the launcher path entirely.

**F4.17** — FoyerSidebar no permission gating.
Import `useUserPermissions` in `FoyerSidebar.tsx`, filter the hardcoded route array by flag. Best after F1.1 PermissionsContext hoist.

---

## Identity

**F1.10** — class_id resolution inconsistent.
Create `useClassId()` hook (or add to PermissionsContext). Replace these 4 sites: `Home.tsx:127`, `RecentPerformanceWidget.tsx:34`, `Drill.tsx:141-162`, `Profile.tsx:162-164`. Single resolution path, single fallback rule.

---

## Infra / Design system

**F5.19** — PWA CacheFirst 7-day staleness.
`vite.config.ts:37-45` — change `handler: "CacheFirst"` to `handler: "StaleWhileRevalidate"`. Keep expiration.

**F5.20** — `(supabase as any)` at 18 sites.
Remove `(supabase as any)` from all 18 sites. Fix exposed type errors case by case. Add lint rule to prevent reintroduction.

**F5.21** — RecentPerformanceWidget hardcodes colors.
`RecentPerformanceWidget.tsx` — replace `bg-neutral-900/70` with `bg-card`, `border-white/[0.06..0.14]` with `border-border`, `text-white` with `text-foreground`, `bg-white/[0.02..0.10]` with token-driven surfaces.

**F5.22** — BackgroundPaths 72 animated paths.
Reduce path count in `background-paths.tsx:7` from 36 to ~12, or gate the component behind `prefers-reduced-motion`.

**F5.23** — IL redefined 4x.
Extract `function IL` into `src/components/common/InstrumentLabel.tsx`. Delete the 4 local definitions in Profile, Classroom, Bootcamps, WrongAnswerJournal. Import the shared one.

**F5.24** — OrbitalLoader orphaned.
Replace `ProtectedRoute.tsx` raw spinner with `<OrbitalLoader />`. Systematically replace the other 9 `animate-spin` instances in Profile, AdminDashboard, Analytics, TypeDrillPicker, NaturalDrillCreator, VoiceCoachModal, CSDrillPlayer, InteractiveStemDrill, animated-button.

**F5.25** — hover: variants lack `(hover: hover)` guard.
One line in `tailwind.config.ts`: `future: { hoverOnlyWhenSupported: true }`. Auto-wraps every `hover:` variant in `@media (hover: hover)` repo-wide.

---

## Count

22 fixes total. 8 persistence, 2 messaging, 4 admin/content, 1 identity, 7 infra/design. None overlap the original April 2026 list.
