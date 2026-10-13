# Testing Centre change 5: the score trajectory — analytics for the student, visibility for Joshua

_Revised after Codex adversarial review round 1 (see plans/testing-centre-review-log.md)._

Priority: fifth (ship order after round 3's reorder: 1 → 2 → 4 → 3 → 5). **Hard
dependencies: change 2 (server-side `practice_test_runs` + admin-read RLS + the
terminal snapshot columns + the stale-run RPC) AND change 3 (`scaledScoreForRun` and
`finalizeRun`).** Do not start before both have landed and the migration is applied.

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. npm; TS strict OFF. `npm run typecheck` +
  `npm run test` before push; push via `bash .claude/safe-push.sh`. Browser verification
  of page/component changes is a hard gate — for anything responsive, verify narrow,
  mid, and wide viewports BEFORE pushing.
- Charts: the canonical palette is `docs/chart-palette.md` (review round 2:
  `plans/analytics-viz-palette.md` marks itself superseded — do not follow it), and the
  existing Recharts trend idiom to copy is in `src/components/mainhub/AnalyticsStage.tsx`,
  not `src/pages/Analytics.tsx`. Verify both at build time before writing chart code.
  Do not introduce a new chart library.
- No fake data, ever. A student with one sitting gets one point and honest copy, not an
  invented trend. Admin surfaces must be desktop AND mobile responsive (product rule).

## The problem

Practice-test scores are the product's most decision-relevant number — "am I on track
for my target score" — and after change 2 they sit in a table nobody reads. There is no
trend for the student, no roll-up for Joshua, and abandoned runs accumulate forever.

## The change

### Step 1 — student-side score trajectory

In `src/pages/Analytics.tsx` (inspect its existing section structure first and add a
section in its idiom):

- "Practice tests" block: a line/dot chart of the **stored `scaled_score` snapshot over
  `completed_at`** for the signed-in user's `status = 'complete'` runs — never
  `created_at` (a run finished days after it began plots out of order) and never a
  recomputation against the current curve file (a curve edit must not silently rewrite
  history). Runs without a snapshot (completed before change 3 shipped) are listed in
  the table with their raw score and excluded from the scaled-score line, with one line
  of copy saying why. Plus a small table of sittings (completed date, PT, pace, raw,
  scaled, score source). Pace matters: an untimed or double-time sitting is not
  comparable to standard — mark non-standard paces visually (a labelled dot, not a
  footnote) and say so in one line of copy.
- **Four states, both panels (student and teacher): loading, error, empty, data.** A
  failed runs query must render an error state with a retry action — never the empty
  state; "no sittings yet" when the query actually failed is fake data by another name.
  Empty state: one sentence pointing at the Testing Centre, no placeholder chart.
- Data access goes through a new `src/lib/practiceTestAnalytics.ts` with ONE shared
  query function `listRuns({ userId, statuses })` — the student chart calls it with
  `statuses: ['complete']`; the teacher panel (which must also show in-progress and
  abandoned) calls it with all three. Do not ship a completed-only function and then
  need a second one.

### Step 2 — teacher-side visibility

Look at `src/pages/teacher/` and `src/pages/AdminDashboard.tsx` to find where per-student
panels live (there are existing per-student teacher views; match their layout and
routing). Add a "Practice tests" panel to the per-student teacher view:

- All of that student's runs: date, PT, pace, raw, scaled, status (complete /
  in-progress / abandoned). In-progress rows show which section they stopped at.
- Relies on the admin-read RLS policy from change 2; if that policy was deferred, this
  step is blocked — say so rather than working around it with a service key or edge
  function.
- Responsive on mobile (cards) and desktop (table); follow how the neighbouring teacher
  panels handle the same split.

### Step 3 — run hygiene

- **Auto-abandon on inactivity, decided server-side via the RPC.** Not client-side by
  `createdAt`: a 15-day-old sitting the student touched yesterday is active, and a
  stale device must not abandon a run being sat elsewhere. A PostgREST filtered update
  cannot express `now() - interval '14 days'` as a filter value, so change 2's
  migration ships `public.abandon_stale_practice_tests()` — owner-scoped, server
  `now()`, filters on `status='in-progress'`, bumps revision, returns affected ids.
  **Ordering in the load path matters, and skipping the local prune is not enough.**
  First retry dirty local runs (pushing any offline progress up, which refreshes
  `updated_at`). Then call the stale-run RPC — but a run whose dirty retry FAILED still
  looks stale server-side, because its offline progress never landed to refresh
  `updated_at`. The round-3 fix only kept such a run out of LOCAL pruning, which does
  not save it: the no-argument RPC abandons it server-side anyway, and the very next
  terminal-wins reconcile selects that abandoned server row and destroys the offline
  progress the prune was protecting. The exclusion has to reach the server.

  So: **pass the unresolved dirty run ids to the RPC as exclusions**
  (`abandon_stale_practice_tests(exclude_ids text[])`, defined in change 2's step 1e),
  so those runs are never abandoned while their progress is still trying to sync. If
  the exclusion list cannot be built for any reason, **skip stale cleanup entirely for
  that load** rather than running it unguarded — cleanup is housekeeping and deferring
  it costs nothing, while running it here costs a student their section. Then reload
  and reconcile. Drop local copies of the returned ids only when they are not dirty. `updated_at` is trigger-maintained (change 2), so any leg progress refreshes
  it.
- **Discard = abandon, tombstoned:** change 2's rule verbatim — discard keeps a dirty
  local abandoned tombstone until the remote transition is confirmed, and only then
  prunes the local copy. Never delete the local copy on an unconfirmed abandon.
- **Local prune:** after a run is confirmed present server-side with status complete or
  abandoned, remove its localStorage entry on next Testing Centre visit, keeping the
  local store to genuinely active sittings.

### Step 4 — one entry-point stat (optional, keep small)

If and only if the Foyer/mainhub has an existing stat-tile idiom that takes one number
(inspect `src/components/foyer/` and the mainhub composer), add "Last practice test:
NNN" linking to `/testing`. If it would require inventing a new component pattern, skip
this step and note it as skipped.

## Tests

- `src/lib/practiceTestAnalytics.test.ts`: ordering by `completed_at`, statuses
  filtering through `listRuns`, snapshot-missing rows excluded from the chart series,
  the auto-abandon path calling the RPC and pruning returned ids, and error-state
  propagation (a query failure surfaces as an error result, not an empty list).
- Update `TestingCentre.test.tsx` if the resume-list load path changed shape.
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

Seed at least two completed runs (sit short ones in dev, or insert rows for the dev
user). Screenshots: the Analytics section at narrow/mid/wide, the teacher panel for a
student on desktop and mobile emulation, and the Testing Centre after auto-abandon has
swallowed a stale run. Verify the admin account sees student runs and a student account
sees only their own.
