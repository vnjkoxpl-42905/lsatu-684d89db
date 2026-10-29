# Analytics, History, and Flags — rebuild plan

Date: 2026-08-26
Status: DRAFT, awaiting Joshua's sign-off
Owner: Jay 2
Scope: `/analytics`, `/history`, `/flagged`, the classroom "Notes" rail, plus the logging layer underneath all three.

---

## 1. What Joshua asked for

Verbatim intent, decomposed:

1. Analytics page keeps the question-type breakdown it has now, but becomes a real visual surface — high-end interactive graphs, hover/tap detail, drill-down.
2. Keep the Assumption / Inference family grouping that already exists.
3. Every flagged question must actually reach the flag bank.
4. "Notes and recaps" becomes "Notes".
5. History gets easier filtering, and must contain **all** work — every drill assigned and every drill done, in every form.
6. A 7 / 14 / 21 / 30 / all-time control drives both stats and history.
7. Analytics must cover all three taxonomies: question types, reasoning types, question features.

## 2. Decisions locked in the grill (2026-08-26)

| # | Decision |
|---|---|
| D1 | **Visuals:** premium 2D charts for everything you read numbers off of, plus **one** true-3D hero visual. Not 3D charts everywhere. |
| D2 | **Design reference:** 7Sage and **LSAT Lab**. |
| D3 | **Sequencing:** fix the data layer first, build the visuals on top of it. No charts drawn over broken logging. |
| D4 | **Timeframe control:** one global segmented control per page (`7 / 14 / 21 / 30 / All`), sticky at top, persisted per user. Everything below obeys it. |
| D5 | **Flag scope:** every surface where a student can flag a question feeds **one** bank — LR drills, blind review, RC, bootcamp capstones, and Activities (flagging gets *added* to Activities). |
| D6 | **Flag × history:** flag is a first-class history dimension. Rows show the flag, the attempt date, and the flag date; there is a "Flagged" filter chip; the bank links back to the attempt. |
| D7 | **History depth:** migrate the two localStorage-only bootcamps into the database, including a one-time bridge for progress already sitting in students' browsers. |
| D8 | **Audience:** one engine, mounted twice — student sees their own at `/history` and `/analytics`; Joshua sees the identical surface per student on the teacher student-detail page, with an assigned-vs-self-directed filter. |
| D9 | **Rename depth:** nav, section heading, page title, and aria/error copy become "Notes". Teacher composer and internal item types keep "session recap" as a distinct kind. |

## 3. Ground truth — what the recon actually found

Evidence gathered 2026-08-26 by two read-only sweeps of `projects/lsatu`.

### 3.1 Flags

| Surface | File | Behaviour |
|---|---|---|
| Main drill runner | `src/pages/Drill.tsx:2403` | ✅ writes `flagged_questions`, also bridges to `wrong_answer_journal` |
| Blind review (classic) | `src/components/drill/BlindReviewFlow.tsx:160` | ✅ writes, but derives `class_id` differently |
| Blind review (enhanced) | `src/components/drill/EnhancedBlindReview.tsx:165` | ✅ writes, same `class_id` divergence |
| RC drilling | `src/features/rc/pages/RcPlayer.tsx:283` → `rcProgress.ts:190` | ⚠️ writes `rc_attempts.flagged` — **never appears in `/flagged`** |
| Bootcamp capstones / inline viewer | `src/components/drill/shared/LRQuestionModal.tsx:316,326` | ❌ `isFlagged={false}`, `onToggleFlag={() => {}}` — **the button is a no-op stub** |
| `LRSectionResults` flag glyph | `src/components/drill/LRSectionResults.tsx:44` | ❌ that icon is `brMarked`, not a flag. Same glyph, different meaning |
| Activities | `src/features/activity-centre/**` | ❌ no flag concept exists |

Structural defects:

- `flagged_questions` unique key is `(class_id, qid)`; every read/delete filters on `user_id`. Latent duplicates and invisible rows.
- RLS policies contradict across migrations — `20260406153113:94` scopes by `class_id = auth.uid()::text`, `20251022025825:65` scopes by `user_id = auth.uid()`. Last-applied wins.
- Two unsynced flag list implementations: `src/lib/flaggedService.ts` + `useFlagged` (canonical) vs `src/components/analytics/FlaggedQuestionsList.tsx` (hand-rolled query and delete, bypasses the react-query cache).

### 3.2 History

`/history` → `src/pages/DrillHistory.tsx` reads the view `public.drill_history` (`supabase/migrations/20260822193808_*.sql:36`), a 5-way UNION over `attempts`, `intro_lr_attempts`, `rc_attempts`, `abstract_drill_attempts`, `cs_attempts`.

Not in it: `activity_item_responses`, `section_history`, `abstract_gauntlet_attempts`, `abstract_translator_attempts`, `abstract_final_set`, `flashcard_reviews`, `rc_lesson_progress`, `chapter_progress`, `homework_assignments`, `guided_drill_assignments`, `activity_assignments`, `classroom_items`, `ta_assignments`, `external_work_uploads`, `blind_review_sessions`, `wrong_answer_journal`, `flagged_questions`.

Not in the database at all:
- **Principle & Flaw** — localStorage `pf:` namespace only (`src/pages/PrincipleFlawBootcamp.tsx:7`).
- **Fallacy & Flaw v2** — localStorage `lsat_flaw_performance` (`src/bootcamps/fallacy-flaw-v2/lib/recordFlawPerformance.ts:17`), partially mirrored to `bootcamp_kv` via `cloudMirror`.

**No assignment attribution anywhere.** `attempts` inserts (`Drill.tsx:1141`) never set `set_id` and there is no assignment column, so nothing can distinguish "guided drill Joshua assigned" from "student practised on their own". Assignment lifecycle lives separately in `guided_drill_assignments` / `homework_assignments` / `activity_assignments`.

Existing filters: view toggle, source chips, correct/missed, free text. **No date filter.** The page subtitle already claims coverage "across drills, bootcamps, and practice" (`DrillHistory.tsx:184`) — currently an overstatement.

### 3.3 Analytics

Two separate surfaces:
- `/analytics` → `src/pages/Analytics.tsx` (354 lines), one RPC `attempt_accuracy_rollup(p_class_id)`, all visuals hand-rolled SVG, no chart library.
- Mainhub `AnalyticsStage` → `src/components/mainhub/AnalyticsStage.tsx`, uses Recharts, three live tabs + three tabs locked with "Not available yet — needs data we don't track today".

Defects:
- **`BreakdownPanel.tsx:44` filters by `user_id` while the page RPC filters by `class_id`.** The tabs and the charts above them can disagree.
- **A duplicate, divergent question-feature taxonomy.** Canonical is `src/lib/questionFeatureFamilies.ts` (60 features, 9 families). `src/lib/analyticsBreakdowns.ts:63-104` defines its own ~40-entry map with different family names and three keys that do not exist in the bank:
  - `'Necessary vs. Sufficient Flaw'` → bank says `Sufficient vs. Necessary Flaw`
  - `'Sampling Flaw'` → bank says `Sampling`
  - `'Repetitve Answers'` (typo) → bank says `Repetitive Answers`
  Roughly 20 real features silently fall into "Other".
- Every time window is hardcoded — 7d/14d buckets inside the SQL of `attempt_accuracy_rollup`, a 14d cutoff at `mainhubAnalytics.ts:253`, a fixed 30d `volumeByDay` at `:353`. `.gte('timestamp_iso', …)` appears nowhere in `src/`.
- `BreakdownPanel` selects `qid, qtype, correct, time_ms` — no date column, so it cannot be filtered by time without a query change.

Taxonomies confirmed correct and worth preserving:
- **Question types (18) in 4 families** — `src/lib/questionLoader.ts:495` — `ASSUMPTION / OBJECTION` (7), `INFERENCE` (4), `MATCH` (6), `OTHER` (1). This is the "assumption / inference" grouping to keep.
- **Reasoning types — exactly 3**: Conditional Reasoning, Causation, Comparative Reasoning. Verified against 400 bank files; no fourth value exists.
- **Question features — 60 tags in 9 families**, `src/lib/questionFeatureFamilies.ts`.

### 3.4 "Notes and recaps"

Canonical string, load-bearing sites:
- `src/lib/railCatalog.ts:55` — rail label (single source of truth)
- `src/components/classroom/shell/ClassroomLayout.tsx:52` — `SECTION_TITLES.notes`
- `src/components/classroom/ClassroomRouteViews.tsx:206, 211, 224, 231` — h1, error copy, two aria-labels

`/classroom/recaps` (`src/App.tsx:480`) is already an orphan — the rail opens a panel, it never navigates there. `src/components/classroom/RecapsSection.tsx` is dead code with no importer.

---

## 4. Prerequisite

The working tree currently carries 18 uncommitted files of parallel drill-hub / RC-toggle work (`plans/drill-hub-lr-rc-toggle.md`, `src/components/drill/SectionToggle.tsx`, `src/features/rc/**`, `src/components/mainhub/**`). That work touches RC and mainhub, which this plan also touches.

**Land or park it before Phase 1 starts.** `safe-push` typechecks the working tree, so uncommitted parallel work can mask an `origin/main` that does not compile.

---

## 5. The build

### Phase 0 — Foundations (no visible change)

**0.1 Kill the duplicate feature taxonomy. — ✅ DONE 2026-08-26**
`FEATURE_FAMILY` / `FEATURE_ORDER` removed from `analyticsBreakdowns.ts`; it now imports the canonical taxonomy and bridges family id → display label via a new local `featureFamilyLabel()`.

Guard shipped: `src/lib/questionFeatureBankCoverage.test.ts` reads the real `_bank.generated.json` and asserts in **both** directions — every bank feature resolves to a non-fallback family, and the taxonomy declares nothing the bank never uses. The second direction is the one that catches a typo, since a misspelt entry is simultaneously an orphan and an unmapped tag. Negative control run: all three LSAT Lab spellings are absent from the taxonomy and all three real bank spellings resolve (`traps`, `conditional`, `quantity`).

Verified: `npm run typecheck` clean, `vitest run src/lib/` 686/686 pass.

Two things worth recording from doing it:
- **The earlier pass left the tree uncompilable.** The local map was deleted without adding the imports — three `TS2304`s. `safe-push` gates on typecheck, so this would have blocked the next push with an error unrelated to whatever that push contained.
- **A false positive I nearly reported.** Calling `normalizeQType(label)` without the stem puts 103 bank questions in `Unknown`. Production calls `normalizeQType(label, stem)` (`questionLoader.ts:1041`), which resolves 99 of them, and `questionLoader.qtypes.test.ts` already owns that assertion. Question-type normalization is deliberately not re-tested in the new file — one subject, one test.

**0.2 One identity for a student.**
Pick `user_id` as the analytics key everywhere. Change `attempt_accuracy_rollup` to accept `p_user_id`, or add a companion RPC. Fix `BreakdownPanel.tsx:44` / `Analytics.tsx:55` to agree. Backfill/repair `flagged_questions` rows written with a divergent `class_id`.

**0.3 Timeframe plumbing.**
- New `src/lib/timeframe.ts` — `type Timeframe = '7d'|'14d'|'21d'|'30d'|'all'`, `toCutoffISO(tf)`, label map, and a `useTimeframe()` hook persisting to `profiles` (or `settings`) so the choice survives a reload and follows the student across devices.
- Rewrite `attempt_accuracy_rollup` to take `p_since timestamptz` instead of hardcoding 7d/14d. Keep the trend comparison as *selected window vs the equal-length window before it*, so the arrow means something at every setting.
- Add `timestamp_iso` to the `BreakdownPanel` select and filter it.

**0.4 Assignment attribution.**
Add nullable `assignment_id uuid` + `assignment_kind text` to `attempts` and to every other attempt table. Populate on every write path that originates from assigned work (`GuidedDrillStart.tsx`, homework launch, activity assignment, classroom item). This is what makes "the drills I assigned them" a filter rather than a guess.

### Phase 1 — Flags actually work (D5, D6)

**1.1 One bank, many sources.**
Add `source text` to `flagged_questions` (`lr | rc | activity | bootcamp`) plus a nullable `source_ref jsonb` for the shape each source needs (RC passage id, activity item id). Change the unique key to `(user_id, source, qid)`. Reconcile the contradictory RLS policies into one `user_id`-based set, in a single migration that drops the old ones by name.

**1.2 Fix the no-op.**
`LRQuestionModal.tsx:316,326` gets a real `useFlagged()`-backed handler. Every consumer (`Capstone.tsx:194`, `HardSentencesCapstone.tsx:312`, `principle-flaw/InlineQuestionViewer.tsx:6`) inherits it.

**1.3 RC flags join the bank.**
Keep `rc_attempts.flagged` as the in-session state, but mirror to `flagged_questions` with `source='rc'` on toggle. One-time backfill of existing `rc_attempts.flagged = true` rows.

**1.4 Activities get flagging.**
Add the flag affordance to the Activity Centre item runner; write `source='activity'`.

**1.5 Dedupe the reader.**
Delete the hand-rolled query in `src/components/analytics/FlaggedQuestionsList.tsx` and have it consume `useFlagged()`, so unflagging from Analytics invalidates the same cache the rail and `/flagged` read.

**1.6 Disambiguate the glyph.**
`LRSectionResults.tsx` currently uses the flag icon for `brMarked`. Give blind-review marks their own icon so a flag always means a flag.

### Phase 2 — Log everything (D7)

**2.1 Rebuild the `drill_history` view.**
Extend the UNION to cover every DB-backed source: `activity_item_responses`, `section_history`, `abstract_gauntlet_attempts`, `abstract_translator_attempts`, `abstract_final_set`, `flashcard_reviews`, `rc_lesson_progress`, `chapter_progress`, plus the two new bootcamp tables from 2.2.

Normalise every row to: `user_id, source, kind, question_key, question_ref, detail, correct, time_ms, selected_answer, mode, assignment_id, assignment_kind, attempted_at`. Left-join `flagged_questions` so `is_flagged` and `flagged_at` ride along (D6).

Add the view to the generated types so `drillHistory.ts:66` can drop its `as never` cast.

**2.2 Migrate the localStorage bootcamps.**
- New `pf_attempts` (Principle & Flaw) and `ff_attempts` (Fallacy & Flaw v2), modelled on `cs_attempts`.
- Write on every scored interaction, not just at module completion.
- **One-time bridge:** on next login, read the existing `pf:` / `lsat_flaw_performance` localStorage payload, push it up with its original timestamps, mark it migrated. Without this, students' existing progress appears to vanish.
- Union both into `drill_history`.

**2.3 Assignment ledger.**
A companion view `assigned_work` unioning `guided_drill_assignments`, `homework_assignments`, `activity_assignments`, `ta_assignments`, and assignable `classroom_items` — normalised to `user_id, kind, title, assigned_at, due_at, status, completed_at, assignment_id`. This is the "everything I assigned them" record, including work assigned and **never started** — which no attempt table can ever show.

**2.4 Honest copy.**
Update `DrillHistory.tsx:184` to describe what the view actually covers, and surface an explicit note for anything still untracked.

### Phase 3 — History UI (D4, D6, D8)

- Global timeframe control at the top (`7 / 14 / 21 / 30 / All`), sticky, persisted.
- Filter row: **Source** (LR · RC · Intro to LR · Abstract · Causation · Principle & Flaw · Fallacy & Flaw · Activities · Sections) · **Origin** (All · Assigned by Joshua · Self-directed) · **Result** (All · Correct · Missed) · **Flagged** toggle · free-text search. Chips only render for sources actually present.
- Two views retained (Timeline / By question), plus a third: **By assignment**, grouping attempts under the assignment that caused them and showing assigned-but-not-started work from `assigned_work`.
- Every row shows the flag state, attempt date, and flag date.
- Filter state lives in the URL query so a filtered view is linkable.
- Server-side date filtering — stop paging the entire history to the client (`drillHistory.ts:60`).

### Phase 4 — Analytics UI (D1, D2, D7)

**4.0 Reference teardown — DONE 2026-08-26.**
`research/lsatlab-analytics-teardown-2026-08-26/` — LSAT Lab's analytics page captured from Joshua's logged-in session via agent Chrome (port 9222). Read it before writing chart code. Headline: **LSAT Lab ships zero charts** — the whole page is tables plus one dual-encoded bar per row. Three things it changed in this plan:

- The three "typos" in §3.3 are **not typos**. `Repetitve Answers`, `Necessary vs. Sufficient Flaw`, and `Sampling Flaw` are LSAT Lab's own labels, verbatim. `analyticsBreakdowns.ts` was transcribed from their UI and never reconciled with LSAT U's bank. It is a two-taxonomy problem, not a spelling bug — 0.1's test is the permanent guard, and LSAT U keeps its own nine families, not theirs.
- Their date filter is a **raw two-date calendar picker buried in a popover, with no presets**. D4's always-visible `7/14/21/30/All` control beats it outright. Also worth stealing as a secondary axis: their **"Recent Questions: last N"** filter, which normalises for study intensity in a way a date window cannot.
- Their priority cards deep-link to a **pre-filtered history view** (`/practice/history?type=LR&questiontype=Flaw`). Confirms Phase 3's URL-driven filter state and Phase 4.4's click-to-drill-down.

Not yet captured: 7Sage, plus LSAT Lab's Reasoning Types / Difficulty / Wrong Answers / Adaptive Drilling tabs and the RC view.

**Non-goal reinforced:** their table is good and it is what a student actually reads numbers off. The 3D hero sits on top of the breakdown table; it never replaces it.

**4.1 Read the `dataviz` skill before the first line of chart code.** Non-negotiable — it owns the palette, the accessibility contract, and the light/dark behaviour.

**4.2 Page structure.**

```
[ 7d | 14d | 21d | 30d | All ]                        ← sticky, global

  ▸ 3D HERO — "Mastery Landscape"
      18 question types (grouped by family) × 5 difficulty levels
      column height = accuracy · column colour = attempt volume
      untouched cells render as flat grey, never as 0%
      orbit + pinch, slow idle rotation, tap a column → detail card + "Drill this"

  ▸ Headline stats — accuracy, attempts, time, trend vs prior equal window

  ▸ Priorities — top 3 opportunities, click → launches that drill

  ▸ Breakdown, five tabs, all timeframe-aware:
      Question Types (grouped: Assumption/Objection · Inference · Match · Other)
      Reasoning Types (Conditional · Causation · Comparative)
      Question Features (all 60, 9 families — no more silent "Other")
      Difficulty (L1–L5)
      Wrong Answers

  ▸ Trend — accuracy over the selected window
  ▸ Volume — attempts per day over the selected window
  ▸ Flagged questions
  ▸ Imported outside work (7Sage / LawHub)
```

**4.3 The 3D hero — implementation.**
`@react-three/fiber` + `drei` on the already-installed `three@0.185`. One lazy-loaded chunk, code-split, never in the initial bundle. Requirements:
- Raycast hover / tap → floating detail card (n, accuracy, avg time, weakest sub-type, trend).
- Respects `prefers-reduced-motion`: no idle rotation, no entry animation.
- Mobile and low-power fallback: renders the existing 2D Type × Level matrix instead. The 3D view is never the only way to reach a number.
- Hard perf budget: measured added bundle size and a frame-rate check on a mid-range phone before it ships.
- Verified in a **visible** tab — background tabs suspend rAF and 3D will look broken when it isn't.

**4.4 2D charts.**
Recharts (already a dependency) with the design system's tokens — dark-first graphite shell, state colours for correct/incorrect, no hardcoded hex. Layered depth, gradient fills, spring entry via framer-motion (also already a dependency). Hover and tap both produce the same rich card; every chart element that represents a slice of work is clickable and drills into the matching filtered `/history` view or launches that drill.

**4.5 Truthfulness contract — preserved and extended.**
Never render `0%` for something never attempted; render an em dash. Keep bank-wide `frequency` visible so untouched types still show as rows. Below `MIN_SAMPLE` (3), render the count but suppress the accuracy claim. Every number must trace to a stored row.

**4.6 Reconcile the two analytics surfaces.**
Mainhub `AnalyticsStage` and `/analytics` compute the same things twice from different queries. Both move onto one hook over the timeframe-aware RPC. Mainhub keeps its condensed card stack; `/analytics` is the full surface. The three `LOCKED_TABS` (`sections`, `preptests`, `questions`) get re-evaluated — after Phase 2, `section_history` exists, so at least one of them can become real.

### Phase 5 — Teacher mount (D8)

Mount the same history and analytics components on the teacher student-detail surface (`src/pages/teacher/TeacherStudentDetail.tsx`, `TeacherAnalyticsBridge.tsx`), parameterised by student id, with the "Assigned by Joshua" filter and the `assigned_work` ledger visible. Build once, mount twice — no second implementation.

### Phase 6 — The rename (D9)

- `src/lib/railCatalog.ts:55` → `label: "Notes"`
- `ClassroomLayout.tsx:52` → `SECTION_TITLES.notes = "Notes"`
- `ClassroomRouteViews.tsx:206,211,224,231` → title, error copy, both aria-labels
- Update `src/lib/railCatalog.test.ts:22`
- Teacher composer, assignment builder, and internal item types keep `session_recap` (D9)
- Delete the dead `src/components/classroom/RecapsSection.tsx` — **ask Joshua before removing the file**
- Decide `/classroom/recaps`: it is already orphaned. Recommend redirecting it to `/classroom` and updating `CLASSROOM-ROUTING-AUDIT.md`

---

## 6. Non-goals

- No adaptive skill-rating or ELO tab. No rating model exists; inventing one would violate the truthfulness rule (this non-goal is already documented at `BreakdownPanel.tsx:24`).
- No predicted-score feature.
- No change to how questions are tagged in the bank. The taxonomy is correct; only the analytics-side *copy* of it is wrong.
- No redesign of the drill runner itself.

## 7. Risks

| Risk | Mitigation |
|---|---|
| `drill_history` grows to a ~12-way UNION and gets slow | Server-side date filtering (Phase 0.3) plus indexes on `(user_id, attempted_at)` for every unioned table. Benchmark against the heaviest real student before shipping. |
| localStorage bridge loses or duplicates student progress | Idempotent, keyed on a stable per-item id, with a `migrated_at` marker. Dry-run against Joshua's own student account first. |
| 3D hero tanks mobile performance | Code-split, mobile fallback to the 2D matrix, measured perf budget as a ship gate. |
| Flag migration collides with the existing `(class_id, qid)` constraint | Migration drops the old constraint, dedupes existing rows by `(user_id, qid)` keeping the earliest `flagged_at`, then adds the new key. |
| Uncommitted parallel RC/mainhub work conflicts | Land or park it before Phase 1 (§4). |
| Push does not deploy | `lsatprep.study` requires an explicit Lovable publish; the bundle hash is the only proof it landed. |

## 8. Verification

Each phase ships only when verified by a **real run**, not by reading the code.

- Phase 0: unit test proving all 60 bank features map to a real family; timeframe hook round-trips across a reload.
- Phase 1: flag a question on each of the five surfaces, confirm all five appear in `/flagged` with the right source, and that unflagging from Analytics updates the rail immediately.
- Phase 2: complete one item in each bootcamp and one Activity, confirm each appears in `/history` with correct assignment attribution.
- Phase 3: filter combinations return the same counts as direct SQL against the view.
- Phase 4: screenshot every chart in a **visible, foreground** tab (background tabs suspend rAF and 3D/framer-motion will look broken when it isn't), light and dark, desktop and phone.
- Phase 5: open a real student on the teacher surface and reconcile the totals against their student-side view.
- Phase 6: walk the classroom rail and confirm the word "recaps" is gone from every student-facing string.

Log the deploy to `wiki/log.md`; log D1–D9 to `decisions/log.md`.
