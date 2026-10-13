# Testing Centre change 3: a score report worth quoting — official conversion tables and post-sitting review

_Revised after Codex adversarial review round 1 (see plans/testing-centre-review-log.md)._

Priority: **fourth — reordered in review round 3.** Hard dependencies: change 1
(sealed sitting), change 2 with its migration applied (the review links need the leg
`sessionId` it stores; the finished-sittings list needs the runs table), **and change 4
(clock integrity)**. The reorder exists because this change starts writing permanent
`official-table` score snapshots: a snapshot minted while sittings can still be paused,
clock-reset, or sat past expiry would carry pre-integrity scores into the trajectory
and teacher surfaces unmarked. Ship the clock first, then start certifying scores.

**Ordering alone is not sufficient, and this change is where that is enforced.** Runs
outlive deploys: a sitting can begin after change 2, sit legs under the old resettable
clock, survive the change-4 deploy, and still be sitting here waiting for a score.
Change 2 now requires that changes 2 and 4 ship as one release, or else that runs
created before clock integrity carry a marker. Whichever change 2 recorded, honour it
here: **`finalizeRun` may mint `score_source: 'official-table'` only for a run that is
known to have been sat under clock integrity.** A run without that guarantee finalizes
as `estimate`, carrying the same nonstandard qualification this plan already defines,
and the score report says plainly that the sitting's conditions were not standard.
Never mint an official-table score for a sitting whose clock could have been reset.

The scaled score is the single number students care about; today it is an
interpolated guess, and the report is a dead end once read.

## Repo conventions that bind this work

- Repo root: `~/ai-os/projects/lsatu`. npm; TS strict OFF. `npm run typecheck` +
  `npm run test` before push; push via `bash .claude/safe-push.sh`. Browser verification
  of any page/component change is a hard gate.
- Student-facing copy: no em-dashes, no AI-slop vocabulary. Match the existing register
  of the Testing Centre copy (plain, honest, decisive).

## The problem

1. **The scaled score is generic.** `estimateScaledScore` ([practiceTest.ts](src/lib/practiceTest.ts)
   ~lines 189-223) interpolates a single "typical modern curve" through 14 anchors for
   every PrepTest. The comment says "we do not hold those [official tables]" — that is a
   data gap, not a design decision. Per-PT official conversion tables exist and Joshua
   can supply them. A student comparing two sittings on two PrepTests is currently
   comparing them through the wrong lens on both.
2. **The report is terminal.** `ScoreReport` ([PracticeTestRun.tsx](src/pages/PracticeTestRun.tsx)
   ~lines 72-121) shows totals and nothing else: no wrong-answer list, no way to open the
   questions you sat, no bridge into the Wrong Answer Journal the LR legs already
   populated (change 1 kept WAJ logging). "Nothing is revealed until the end" only earns
   its keep if the end actually reveals things.

## The change

### Step 1 — conversion table data (ingestion is a prerequisite, not something you invent)

- Create `public/data/pt-curves.json`:
  `{ "curves": { "<pt>": { "total": 76, "table": [[rawLow, rawHigh, scaled], ...] } } }`
  or the equivalent raw→scaled array form; pick one shape and validate it.
- **Do not fabricate a single number.** The actual tables must come from Joshua
  (he holds the source material). Build the loader, the validator, and the fallback so
  the file can start empty and be filled per-PT. Important context: the bank's PT
  numbering is LSAT Lab's PT1xx scheme, which is NOT the LSAC numbering, and the offset
  is not constant. The ingestion doc (next bullet) must say the mapping is by the bank's
  own PT number as it appears in the Testing Centre.
- Write `scripts/validate-pt-curves.mjs`: raw coverage is contiguous from 0 to `total`
  with no gaps or overlaps, scaled values are monotonically non-decreasing in raw,
  bounded to [120, 180], with valid endpoints. Do NOT require every scaled integer
  120-180 to appear — real tables skip scaled values, and demanding surjectivity on
  that axis rejects legitimate data. Lookup completeness lives on the raw axis. Add a
  small vitest running the same checks in-process (mirror how
  `practiceTest.bank.test.ts` reads `public/data` directly).
- Add `plans/` note or README section telling Joshua exactly what to paste and where.

### Step 2 — scoring uses the real table when it exists

In practiceTest.ts:

- `scaledScoreForRun(run, curves)` (new): the official table applies ONLY when
  `curves[run.pt]` exists AND the run's raw total exactly equals the curve's `total`.
  Anything else — total mismatch, missing curve — falls back to `estimateScaledScore`
  unchanged. This exact-total gate is the honesty guard the review demanded: the
  blueprint takes the lowest-numbered two of three LR sections when a PT carries a third
  (the experimental is unknowable), so a matching total is the necessary condition for
  claiming the official composition was scored; when it does not hold, the number is an
  estimate and must say so. Return `{ scaled, source: 'official-table' | 'estimate' }`
  so callers can persist the provenance (change 2's `score_source` column) — the report
  and any later chart must show the number as scored at completion time, never
  re-derived against a curve file that changed since.
- The report copy must state which one it used:
  - Real table: "Scored with PrepTest N's own conversion table."
  - Estimate: keep today's "Estimated from a typical modern LSAT curve... Treat it as a
    band, not a number."
  Never print an official-looking number without saying which it is — a scaled score
  that looks official and is not is the one number a student will quote at an admissions
  decision (that warning is already in the code; honour it).
- Load curves once (static import of the JSON or a fetch cached in module state —
  match how other `public/data` files are loaded; `rcBank.ts` fetches, the LR manifest
  goes through `QuestionBankContext`; the simplest consistent choice is a fetch with
  in-module cache used from `PracticeTestRunPage`).
- **A failed load and a loaded-but-missing-PT are different outcomes and must not
  collapse into the same fallback.** `scaledScoreForRun` falls back to `estimate` when
  `curves[run.pt]` is absent — correct when the file loaded and genuinely has no curve
  for that PT, but catastrophic when the fetch itself failed (offline, 404, a bad
  deploy). Combined with write-once finalization, one transient network failure
  permanently stamps `score_source: 'estimate'` on a sitting for which an official
  table exists, and the student quotes that number. Model the load as three states —
  `loaded` / `failed` / `pending` — and:
  - only a `loaded` curve set may trigger the missing-PT fallback to `estimate`;
  - `failed` or `pending` BLOCKS finalization entirely. Leave the run unfinalized,
    render it as a snapshotless completed run (the raw-only path this plan already
    defines), and retry finalization on the next load. That path is now reachable by
    design, not just by legacy data.
  - **Decision: bundle the curves and delete the failure state.** A `failed` load
    produces a snapshotless completed run that must be retried later, while a LEGACY
    snapshotless run must stay raw-only and never be rescored — and after a reload the
    schema cannot tell those two apart, so a retry pass would either miss the first or
    wrongly rescore the second. Rather than add a `score_finalization_pending` marker
    to carry that distinction, remove the state that needs it: import the validated
    JSON statically so it ships in the bundle and cannot 404. **Note Vite cannot
    statically import JSON out of `public/` — put the file at `src/data/pt-curves.json`
    and import it directly** (the validator script and its test path move with it).
    Then only `loaded` exists, every snapshotless completed run is unambiguously
    legacy, and the raw-only rendering below is its permanent treatment.
- **Write the terminal snapshot through ONE `finalizeRun` function, covering every
  completion path.** Review round 2 found the trap: a run can reach
  `status: 'complete'` from TWO places in PracticeTestRun.tsx — the readback effect
  AND the "Mark it unfinished and continue" button on the last leg. A snapshot written
  only in the readback effect leaves button-completed runs snapshotless. Create
  `finalizeRun(run, curves)` (write-once: no-op if a snapshot exists) that computes
  and persists `completed_at`, `raw_correct`, `raw_total`, `scaled_score`,
  `score_source`, and route BOTH transitions through it (via change 2's mutation
  coordinator). Every later surface renders the snapshot, never a recomputation.
- **Snapshotless completed runs render raw-only.** Runs completed after change 2 but
  before this change (or where finalize failed) have no snapshot. ScoreReport and the
  finished-sittings list show their raw score with "scaled score unavailable for this
  sitting" — never a freshly computed scaled number, and never a blank crash. They DO
  have a completion date: change 2 stamps `completed_at` on every completion
  transition; for any completed row that still lacks it, derive-and-persist it from
  `updated_at` once, so the receipt list and the change-5 trajectory always have a
  date axis.

### Step 3 — the report opens back up

Extend `ScoreReport` in PracticeTestRun.tsx:

- Per-leg row gains a "Review" action when the leg has a stored runner session id
  (`leg.sessionId`, added in change 2):
  - RC leg → navigate to `/rc/results/<sessionId>?returnTo=/testing/test/<runId>`.
    That page already exists and already renders full review with explanations.
  - LR leg → there is no history-driven LR review page today, and review round 1
    established that journal filtering cannot be made sitting-scoped (WAJ rows carry no
    run/leg attribution, and the live journal surface reads no filter params). Do NOT
    build a filtered-journal feature here. The LR row gets a plain link to the journal
    surface (verify the actual route and component in `src/App.tsx` — the review found
    `/journal` renders a different component than `src/pages/Journal.tsx`) labelled
    "Your wrong answers land in the journal", with no claim that the view is scoped to
    this sitting. A true sitting-scoped LR review is future work and out of scope.
    **Do not flag-gate the link without first checking the route.** The premise that
    the journal sits behind its own flag is stale: `ProtectedRoute`
    ([ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) ~line 98) returns children
    for ANY signed-in user when `allowSignedIn` is set, before it ever evaluates
    `flag`. If the journal route is declared that way, gating the link on a flag would
    hide a page the student can actually open. Read the journal route's props in
    `src/App.tsx` first: if it is `allowSignedIn`, always render the link; only if it
    genuinely carries a `flag` should a student without that flag get the sentence
    without a link, rather than a link into an access wall.
- Below the legs: one line stating how many questions were missed across the sitting.
  Derive it from the terminal snapshot's whole-sitting `raw_total - raw_correct` —
  the same numbers the score is computed from (`practiceTestRaw` counts every leg's
  questions, unfinished legs included, so a per-completed-leg sum would show fewer
  misses than the stored raw result). Never from WAJ.
- Keep the unfinished-sections paragraph exactly as is.

### Step 4 — the report is reachable again later

With change 2 in place, completed runs exist server-side. Add to `TestingCentre.tsx`,
under the resume list, a "Finished sittings" section listing completed runs (PT, date,
scaled score, raw) with each row navigating to `/testing/test/<runId>` — which now
renders the ScoreReport (status complete) with the review links. Cap at the 10 most
recent; this is a receipts list, not the analytics surface (that is change 5).

## Tests

- Curve validator vitest (structure + monotonicity + raw coverage) over the real
  `public/data/pt-curves.json`, skipping gracefully (with an explicit `it.skip` count
  message) while the file has no curves yet.
- `finalizeRun` tests — this invariant is load-bearing and has two entry paths:
  completion via readback, completion via last-leg "mark unfinished and continue",
  repeated finalization is a no-op (write-once), failed snapshot persistence leaves
  the run complete-but-snapshotless (and retryable), and snapshotless runs render
  raw-only with a derived date.
- Unit tests for `scaledScoreForRun`: exact lookup, total-mismatch fallback, missing-PT
  fallback, and that the estimate path is byte-identical to `estimateScaledScore`.
- Update `TestingCentre.test.tsx` for the finished-sittings section (mock the store).
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

Complete a sitting in dev; screenshot the report showing (a) the correct
table-vs-estimate copy for a PT with and without a curve entry, (b) the RC review link
landing on the RC results page and its returnTo bringing you back, (c) the finished
sittings list on the Testing Centre landing page.
