# Testing Centre change 5: the score trajectory — analytics for the student, visibility for Joshua

Priority: fifth. Hard dependency on change 2 (server-side `practice_test_runs` + RLS
admin read). Do not start it before change 2 has landed and its migration is applied.

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. npm; TS strict OFF. `npm run typecheck` +
  `npm run test` before push; push via `bash .claude/safe-push.sh`. Browser verification
  of page/component changes is a hard gate — for anything responsive, verify narrow,
  mid, and wide viewports BEFORE pushing.
- Charts: read `plans/analytics-viz-palette.md` and `chart-palette.md` at repo root, and
  match whatever charting approach `src/pages/Analytics.tsx` already uses. Do not
  introduce a new chart library.
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

- "Practice tests" block: a line/dot chart of scaled score over `created_at` for the
  signed-in user's `status = 'complete'` runs, plus a small table of sittings (date, PT,
  pace, raw, scaled). Pace matters: an untimed or double-time sitting is not comparable
  to standard — mark non-standard paces visually (a labelled dot, not a footnote) and
  say so in one line of copy.
- Empty state: if zero completed sittings, one sentence pointing at the Testing Centre.
  No placeholder chart.
- Data access goes through a new `src/lib/practiceTestAnalytics.ts` with a
  `listCompletedRuns(userId?)` that both this page and the teacher surface share.
  Scaled score comes from change 3's `scaledScoreForRun` so the chart and the report
  can never disagree.

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

- **Auto-abandon:** in the Testing Centre's load path (where the resume list is built),
  any in-progress run whose `createdAt` is older than 14 days is marked `abandoned`
  (remote + local) instead of being listed. One line of copy is unnecessary; it simply
  stops appearing.
- **Discard = abandon:** confirm change 2's rule holds (discard sets remote
  `status='abandoned'`, deletes only the local copy).
- **Local prune:** after a run is confirmed present server-side with status complete or
  abandoned, remove its localStorage entry on next Testing Centre visit, keeping the
  local store to genuinely active sittings.

### Step 4 — one entry-point stat (optional, keep small)

If and only if the Foyer/mainhub has an existing stat-tile idiom that takes one number
(inspect `src/components/foyer/` and the mainhub composer), add "Last practice test:
NNN" linking to `/testing`. If it would require inventing a new component pattern, skip
this step and note it as skipped.

## Tests

- `src/lib/practiceTestAnalytics.test.ts`: ordering, completed-only filtering, the
  14-day auto-abandon cutoff math (pure function taking `now`).
- Update `TestingCentre.test.tsx` if the resume-list load path changed shape.
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

Seed at least two completed runs (sit short ones in dev, or insert rows for the dev
user). Screenshots: the Analytics section at narrow/mid/wide, the teacher panel for a
student on desktop and mobile emulation, and the Testing Centre after auto-abandon has
swallowed a stale run. Verify the admin account sees student runs and a student account
sees only their own.
