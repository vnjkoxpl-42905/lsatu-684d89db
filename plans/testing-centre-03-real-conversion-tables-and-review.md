# Testing Centre change 3: a score report worth quoting — official conversion tables and post-sitting review

Priority: third. Depends on change 1 (sealed sitting) and benefits heavily from change 2
(leg session ids). The scaled score is the single number students care about; today it is
an interpolated guess, and the report is a dead end once read.

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
- Write `scripts/validate-pt-curves.mjs`: every curve covers scaled 120-180 without gaps,
  raw ranges are contiguous from 0 to `total`, scaled is monotonically non-increasing as
  raw decreases. Add it to the test suite via a small vitest that runs the same checks
  in-process (mirror how `practiceTest.bank.test.ts` reads `public/data` directly).
- Add `plans/` note or README section telling Joshua exactly what to paste and where.

### Step 2 — scoring uses the real table when it exists

In practiceTest.ts:

- `scaledScoreForRun(run, curves)` (new): if `curves[run.pt]` exists and the run's raw
  total equals the curve's `total`, look up exactly. If the totals differ (a leg was
  marked unfinished still counts its questions, so totals should match; but guard it),
  fall back to the estimate. If no curve exists for the PT, fall back to
  `estimateScaledScore` unchanged.
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

### Step 3 — the report opens back up

Extend `ScoreReport` in PracticeTestRun.tsx:

- Per-leg row gains a "Review" action when the leg has a stored runner session id
  (`leg.sessionId`, added in change 2):
  - RC leg → navigate to `/rc/results/<sessionId>?returnTo=/testing/test/<runId>`.
    That page already exists and already renders full review with explanations.
  - LR leg → there is no history-driven LR review page today. Do NOT rebuild
    LRSectionResults from a history row in this change. Instead link to the Wrong
    Answer Journal filtered to that PT/section if the WAJ surface supports filter
    params (inspect `src/pages/Journal.tsx` / `wajService` for a query-param filter;
    if none exists, add pt+section params to it — small, contained), with the label
    "Review your wrong answers".
- Below the legs: one line stating how many wrong answers were added to the journal
  across the sitting, linking to `/journal` (verify the route name in `src/App.tsx`).
- Keep the unfinished-sections paragraph exactly as is.

### Step 4 — the report is reachable again later

With change 2 in place, completed runs exist server-side. Add to `TestingCentre.tsx`,
under the resume list, a "Finished sittings" section listing completed runs (PT, date,
scaled score, raw) with each row navigating to `/testing/test/<runId>` — which now
renders the ScoreReport (status complete) with the review links. Cap at the 10 most
recent; this is a receipts list, not the analytics surface (that is change 5).

## Tests

- Curve validator vitest (structure + monotonicity + coverage) over the real
  `public/data/pt-curves.json`, skipping gracefully (with an explicit `it.skip` count
  message) while the file has no curves yet.
- Unit tests for `scaledScoreForRun`: exact lookup, total-mismatch fallback, missing-PT
  fallback, and that the estimate path is byte-identical to `estimateScaledScore`.
- Update `TestingCentre.test.tsx` for the finished-sittings section (mock the store).
- `npm run test`, `npm run typecheck`.

## Browser verification (mandatory)

Complete a sitting in dev; screenshot the report showing (a) the correct
table-vs-estimate copy for a PT with and without a curve entry, (b) the RC review link
landing on the RC results page and its returnTo bringing you back, (c) the finished
sittings list on the Testing Centre landing page.
