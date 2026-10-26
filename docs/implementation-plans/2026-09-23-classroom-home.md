# Plan: Classroom Home v3, first build
_Act 5, Round 3 revision by Claude, 2026-09-23. Supersedes the phase plan (history in the vault's git and in PLAN-REVIEW-LOG.md). Codex's Act 5 round 1 reviewed the superseded file by mistake; its findings that apply to v3 are folded in here._

Sources: decisions `brainstorms/2026-09-23-classroom-home-visual-upgrade.md` (rounds 1-10, converged Q2-Q7); research `research/2026-09-23-classroom-home-dashboard-research/`; design v3 `Home3.dc.html` on https://claude.ai/artifact/6zF3FgewiMA7pCZSk766Xt (local: scratchpad `artifact-files/307bbd6c-86e0-43cd-a5df-8735d306b8fb/project/Home3.dc.html`).

## Situation
- App `projects/lsatu`: React + Vite + TS + Tailwind, TanStack Query, Supabase via Lovable Cloud. Home = `/classroom` in the Classroom frame (glossary `src/components/classroom/CONTEXT.md`).
- Home code: `src/components/classroom/home/`.
- PR #133 (branch `feat/home-v2-phase1`, unmerged): `pickContinueWork`, `QuestionFinder` `open()` handle, container-query columns, preservation tests. v3 builds on it and closes #133. #133 has NO Section tab; "Timed section" only opens the finder.
- Hard rules: completed student work never lost or modified; additive migrations only; branch + PR; Lovable Cloud Edge Functions deploy through Lovable (confirm first); frontend reaches lsatprep.study only via Lovable deploy; a teacher is never the student; student copy per `wiki/teaching-voice.md`, no em dashes.
- Builder: Codex `gpt-6-luna`, high (Joshua, 2026-09-23). Spec/review: Claude + `gpt-6-astra`.

## Goal
Ship the v3 Classroom Home for students: a warm top panel (greeting, two numbers, Question finder, Continue, Smart Drill, Timed section, Inbox), a dominant visual insight that tells the student what to do next, a precise per-type list, supporting tiles, and the unchanged Next seven days strip. Every number says what it counts; the page is fast, stable, accessible, and complete with zero coach input.

## Amendment A (Act 6, Joshua rounds 11-12, 2026-09-23; revised after Codex Act 6 rounds 1-2, APPROVED round 3). Overrides sections 1, 5 and 9 where they conflict.
State: PR 1 was built (gpt-6-luna high) in `projects/lsatu-home-v2`, uncommitted, typecheck clean, 110/110 tests. Joshua then changed the points below. Reference images re-reviewed: all six are chart-led; PR 1 had zero charts. **PR 1 is an intermediate build. The visual upgrade is accepted only after PR 2 ships real-data charts with browser evidence (populated, sparse, error and no-message states).**

A1. **Booking stops being a card.** No dark Next session card. Home gets a typed `homeBooking` state: `loading | error | booked | credits | payPerSession | none`.
- `booked`: one slim line in the top panel under the status line, "Next session: Thursday 7:15 pm". Destination: `/booking` (Schedule shell, Book tab, which lists "Your upcoming sessions"; verified `Booking.tsx:20`). It opens the booking-management surface, not a single booking; no per-session deep link is promised. No large numerals.
- `credits` (active pass, `credits_remaining > 0`, no booking): a "Book" pill in the action row, "Book · 3 left", to `/booking`.
- `payPerSession` (no booking, no active credits): the same-size pill "Book a session", to the offer whose id is `single-session` or `single-session-native`, chosen explicitly from `offers`, never the renewal branch. No such offer -> `none`.
- `none`, `loading`, `error`, admin/coach: nothing rendered (loading/error never render as "none" copy). Existing schedule access gates stay.
- Supersedes Q6b "compact Book a session card" and the 4/12 dark card.

A2. **No default Read, Recall, Colour tile.** RRC shows only as assigned work. Test: an assigned RRC row still renders with its actions after the tile's removal.

A3. **Analytics (PR 2).** One `security invoker` RPC `home_lr_activity(p_class_id, p_tz)` replaces `home_week_counts` (section 1). Source = `attempts` only (verified: `drill_history` SQL labels `attempts` as LR and unions RC separately). Coverage is by write path: every bank-question LR attempt, including those launched inside bootcamps (`LRQuestionModal.tsx:174`, mode `bootcamp-pf`); separately stored introductory exercises and RC are excluded and disclosed ("LR bank questions").
- **Eligibility.** BR answers are separate `attempts` rows (`Drill.tsx:3479`) reusing the session mode. Exclude from both metrics rows where `br_selected IS TRUE` or `br_answer`/`br_outcome` is not null; `br_marked`/`br_selected`/`br_changed` default to false, so false/null flags are kept. No other "replay" predicate (recordings live in `session_replays`, not `attempts`). Accuracy: "first attempt" = the earliest eligible row per student and question across ALL history, then windowed. Volume: deduplicated within each local day only. A question with any undated eligible row is excluded from first-attempt accuracy and counted in a disclosed "n questions without dates left out". No timestamps are invented; no rows are rewritten. Tests: older original + recent retry; original followed by its BR row sharing a mode; an ordinary row with BR flags false; undated original + dated retry.
- **Accuracy trend tile ("First-attempt accuracy, last 8 weeks").** All 8 weekly buckets are kept in the data and the accessible table. A week with >=10 eligible first attempts is a solid point; 1-9 is a hollow, unconnected marker labelled "few questions"; 0 is a gap labelled "No first attempts" (volume describes practice activity); non-overshooting monotone interpolation between adjacent points only; the current week is labelled "so far" and glows only if it is a point. Fewer than 3 weeks with at least 10 eligible first attempts (hollow markers do not count) -> a labelled simple result ("62% on 24 first attempts since Sept 1"). Each point shows correct/total on focus/hover and in an accessible table.
- **Volume tile ("LR questions, last 7 days").** Bars per local day = distinct eligible question ids that day (a repeat on a different day counts again, disclosed). The headline = the sum of the bars. Current day labelled "today".
- **Proportions.** Accuracy tile 7/12, volume tile 5/12, equal heights, big light numerals for the real headline values (Homies hierarchy), direct labels, plot area at least 60% of tile height. Dark surfaces with a restrained warm light behind the plot (Notton/WeatherWise depth); static under reduced motion.
- **Per-type list (section 5)** keeps its population, "latest attempt per question within each 30-day bucket", and is labelled so; it is styled as plain continuous bars, not Be.run segments, so it does not read as task completion. The two populations are labelled distinctly and never compared as improvement.

A4. **Main card is full width** (PR 1: the "pick up where you left off" hero + assigned work; text width capped around 68ch, height content-driven). PR 2: the full-width insight card has diagnosis/action on the left and bubbles on the right, stacking under 900px container width.

A5. **Assigned work has a permanent home.** From PR 2 it moves out of the insight card into its own "Assigned to you" card (Coders-style compact rows: title, due date, real progress where the model has it) in the lower row, keeping open, briefing interception, Mark done and report-card seen. Be.run-style progress with a clear endpoint is used only for real completed/total counts (hero items, bootcamps).

A6. **Last section (PR 2).** Needs the bounded sections adapter from section 2, not `sectionHistory.ts:107` (it zero-fills scores and can invent a completion date). Latest row with a known completion date; unknown scores or denominators shown as unknown; its Review link opens that saved result, never a new section (verified in PR 2).

A7. **One authoritative order.**
- PR 1, desktop: top panel (greeting, status, slim next-session line, days to test | finder, Continue, pills incl. Book) -> main card (full) -> From Joshua (only when a message exists, full width, compact) -> Next seven days.
- PR 2, desktop: top panel -> insight card (full) -> chart row (accuracy 7 | volume 5) -> per-type list (7) + Last section (5) -> Assigned to you (7) + From Joshua (5) -> Next seven days.
- Phone (one column): top panel (containing the one Continue) -> diagnosis/action -> accuracy -> volume -> bubbles -> per-type list -> Last section -> Assigned to you -> From Joshua -> week.
- Charts must not be buried (Codex round 2). Claude keeps the insight first because Joshua chose diagnosis-to-action to lead (round 10), but bounds what sits above the charts: on phones the top panel is compact (finder, one Continue, pills in two rows), and the insight shows diagnosis + action with the bubbles moved below the chart row. Browser check: at 390x844 the chart row starts within the second screen; at 1440x900 it starts within the first screen and a half. These are acceptance checks at normal text size, never fixed heights that clip at 200% text. Codex accepted insight-first in round 3.
- Collapse: any absent tile's partner spans the full row; a row with nothing renders nothing; loading shows layout-matched skeletons, errors show retry, neither shows as empty.

A8. **Build order.** PR 1 revision on the uncommitted build: A1, A2, A4, A7 (PR 1 order); no new data beyond the existing `test_date` read. PR 2 = section 2 RPCs + A3 + A5 + A6 + bubbles/list/evidence + `excludeAnswered`. Builder: gpt-6-luna high (Joshua, 2026-09-23). Staging excludes `supabase/functions/mcp/index.ts`, which the dev server regenerates.

## Approach

### 0. Preservation checklist (every PR)
Assigned work rows and actions; timed-section briefing interception; report-card seen tracking; message preview dismissal watermark; `HomeAccess` gates; Question finder never gated; Next seven days strip markup, classes and CSS unchanged. This 2026-09-23 plan originally excluded the coach account from assigned work, but Joshua's 2026-09-28 decision supersedes that exclusion: his own actor-owned practice and assignments are available to him, separate from student results. The 2026-09-28 connected-experience release also builds the slimmer rail, superseding this plan's earlier menu scope.

### 1. Layout
1. **Top panel** (full width, warm gradient): date line, greeting, status line, two numbers: LR questions this week (counted from `attempts` in a new `security invoker` RPC `home_week_counts(p_class_id, p_tz text)`: distinct questions answered in the student's last 7 local days, excluding review and blind-review replays; label says LR; NOT `daily_stats`, which nothing writes, verified 2026-09-23; test: finishing a drill question raises the number) and days to test day (`profiles.test_date`; hidden when null). Right: Question finder bar; dark Continue card (earliest-due eligible assigned work; hidden when none); Smart Drill (`kind: 'smart-drill'`); Timed section (goes to the Testing Centre `/testing`, which already starts LR and RC sections with timing and accommodations; same `has_drill_access` gate; replaces #133's finder action); Inbox with the existing unread count to `/inbox`.
2. **Main row**: main insight (8/12, taupe) + Next session (4/12, dark). No booking: compact "Book a session" (existing CTA), never hidden or an empty shell.
3. **Lower row**: per-type list (7/12) + tiles (5/12): Last section; From Joshua (existing latest-message preview); Wrong answers to revisit (journal items due this week).
4. **Next seven days**: unchanged.
Columns by container width (existing container query); one column under 900px container; phone order: top panel, Continue, main insight, Next session, list, tiles, week.

### 2. Data layer
**Adapter states.** Every adapter returns one of `loading | error | empty | insufficient | ready`. Only `empty` (confirmed zero rows) may produce "start here" copy; `error` shows "Could not load this, retry" with the last good value and its date if cached; `insufficient` shows the labelled single-result fallback. The engine never turns `error` or `loading` into an empty claim.

**New RPCs** (additive migration), all `security invoker`, `set search_path = public`, matching `20260709235900_phase6_query_rpcs.sql:25`, so existing RLS on `attempts` / `section_history` decides access; `p_days` bounded 7..90; tests: anonymous denied, student A cannot read student B, admin can read any.
- `home_lr_type_accuracy(p_class_id, p_days int default 30)`: two buckets with one shared cutoff: `current` = (now - p_days, now], `prior` = (now - 2*p_days, now - p_days]; each bucket picks the latest attempt per distinct question inside that bucket, excluding review / blind-review replays; returns per qtype and bucket: questions, correct, missed, last_attempt_at.
- `home_lr_type_evidence(p_class_id, p_qtype, p_days, p_cutoff timestamptz)`: the qids behind the current bucket. The aggregate returns its `cutoff` (the `now()` it used); the frozen insight passes that cutoff to the evidence call, and both use one shared SQL selection function with the same cutoff, so evidence opened later matches the numbers shown.

**Sections adapter** over `section_history` (not the zero-filling `sectionHistory.ts:113` reader): denominator = `initial_total` when > 0, else `total_questions` when > 0, else unknown (row shown without a fraction, never `x/0`; see `sectionHistorySave.ts:324`); blind-review figures only when `br_used` is true; unknown dates stay unknown (excluded from recency), label "Sections" unless `mode` proves timing; blind-review delta shown as evidence only.

**Section diagnosis**: top saved finding from `analysis_json` via `sectionAnalysis.ts`.

**RC**: not a lens in this build (its readers are unbounded, `rcProgress.ts`); deferred with a bounded aggregate to build two.

### 3. Insight engine (fixed rules, no AI text)
Pure `pickInsights(signals)` in `home/insights.ts`, fixture-tested. Lenses: LR types, Sections, Section diagnosis. Floors: types ≥8 distinct questions in `current`; sections ≥1 in 21 days. Score = recency + actionability, normalized per lens; fixed tie order; one card per source. The chosen insight is frozen for the visit; new data shows a quiet "New results, refresh" control and never reorders under the pointer.

### 4. Diagnosis-to-action (leads the main card)
- Registry `home/actionRegistry.ts`: 4-8 entries `{ findingRule, launch body or route, reason }`, drafted by Claude from existing bootcamps, guided drills, Read Recall Colour and timed sections; Joshua reviews once before merge.
- Card order: headline (what the evidence shows); the recommended action with its one-line reason; "Practice <type>" (`kind: 'filter'` with that qtype); "Review these" (journal entries of that type, when any); "See the evidence". Unmapped finding: "See the evidence" replaces the recommendation.
- **New-questions-only**: "Practice <type>" prefers unseen questions. Requires an additive `excludeAnswered?: boolean` on the filter launch body, applied BEFORE sampling where the bank is filtered (`Drill.tsx:565`), with the built queue persisted in the Run Record so resume replays it. The freshness policy joins the resume identity (`drillResumeSession.ts:93`) so a fresh-only run never resumes an unrestricted one; links without the flag keep their existing identity. Test: unfinished unrestricted run, then fresh-only launch of the same filter starts a new run. Shortfall: "Only N new <type> questions left" with "Include ones you have answered". This ships in the same PR as the button (PR 2), never after.
- Evidence drawer: exact addresses from the evidence RPC or section `questions_json`; counts, window, "updated <time>".

### 5. Honest visuals
- Bubbles: area proportional to missed (radius = k * sqrt(missed)), computed, never hardcoded; each labelled with type, accuracy, "missed of attempted"; two-size legend. Bubbles are decorative and non-interactive; selection happens through the list rows (real buttons), and selecting a row highlights its bubble. Only types with missed > 0 get a bubble; zero-miss types appear in the list only. Fewer than 3 types with misses: labelled results instead of bubbles. Every eligible type at zero misses: a result state ("No misses in [n] questions over 30 days") with Practice harder questions.
- Labels never white on orange: bubble text is ink `#1f1b18` on the orange fill, or white only on the dark bubble; every text/fill pair verified ≥4.5:1 (≥3:1 at 24px+) in light and dark themes.
- The list is the text equivalent and the only interactive layer; the bubble group is `aria-hidden` with no focusable children, and the card carries a one-sentence summary for screen readers.
- Copy: "Most misses in your recent LR practice", never "costing you points".
- List: continuous bars, questions per type, change "pts vs previous 30 days" only when both buckets have ≥8 questions.

### 6. Ask with evidence
"Ask" on the main insight opens a draft in the existing inbox to Joshua, prefilled with the insight's evidence and a comment field. Nothing sends without the student's Send. Label "Ask" (glossary). Uses the existing message insert path unchanged; no new message columns in this build.

### 7. Sure but wrong (gated)
Claude runs a read-only audit before PR 4: share of last-30-day `attempts` with non-null `confidence`, per write path, and whether each path captures confidence before feedback. Ship only if ≥60% coverage for at least half of active students; else defer. Card: labelled 2x2 (1-2 unsure, 4-5 sure); neutral 3 and missing ratings are excluded and disclosed in the coverage line ("[n] rated sure or unsure, [m] neutral, [k] unrated"); floor = 12 first attempts that land in a cell; tap a cell for its questions.

### 8. Quality bar (release requirement)
Cache-first paint on return visits; layout-matched skeletons on first load; no spinners. Count-up once per local day; motion transform/opacity only; none under `prefers-reduced-motion`. WCAG 2.2 AA incl. 200% text, focus order, contrast on gradient and taupe. Accommodated timer used for any pace figure. Verification: a student test account at 390 / 900 / 1440 and docked widths, dark class, keyboard only, reduced motion. Measure Home first paint before and after PR 2.

### 9. Build order (PRs)
1. Layout + top panel + tiles + Book-a-session state on existing data, on top of #133 (closes #133).
2. RPCs (with auth tests) + adapters + insight engine + honest visuals + list + evidence drawer + `excludeAnswered`.
3. Registry (after Joshua's review) + diagnosis-to-action + Ask draft.
4. Sure but wrong, only if the audit passes.
Build two (separate plan): session brief; review then fresh check; Today shortcut; coach pinning with optional note; unified notifications (event identity, read semantics, reminders); RC lens; launcher Section tab reusing `rcSectionHref` (`rcSections.ts:131`) and `kind: 'section'`.

## Key decisions & tradeoffs
- Diagnosis leads; coach notes never required.
- Bubbles for character, list for precision and accessibility.
- Frozen insight per visit.
- Small human-reviewed registry, not inference.
- Sure but wrong gated by audit, no new rating step.
- Unified notifications deferred whole, so its identity and read-state design is done once, properly.

## Risks / open questions
- RPC cost on first paint.
- Registry quality depends on one review.
- Student test account needed.
- Taupe/gradient contrast may force darker text than the mockup.

## Out of scope
Slim menu rail; notifications merge and bell popover; pinning; session brief; review loop; Today; RC lens; launcher tabs; goal score, streaks, PT score, month calendar; AI text; teacher view redesign; public landing page.
