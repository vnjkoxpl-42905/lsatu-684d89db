# Refinement review log

Roles: Codex host/builder, Claude reviewer/fresh inspector; requested CLI default model/effort, observed claude-sonnet-5-5. Five plan rounds, two inspection rounds, two fix rounds. Local prototype authorized; no publication.

## Plan round 1

Result: C:\Users\Joshu\AppData\Local\Temp\claudex-prvyb8tk\result.json

```json
{
  "verdict": "REVISE",
  "summary": "The plan's direction is sound, but several parts are underspecified in ways that would produce wrong or unstable output if built as written. The main ones are the chronology ordering, the bucket definition, a moving `asOf` in the live wrapper, and out-of-window data that the current model doesn't expose. I read the plan and the existing prototype baseline (`model.ts`, `LiveProgressPrototype.tsx`, grep of `ProgressPrototype.tsx`), `firstAnswerDetails.ts` and `firstAnswerProgress.ts`. I did not read `ProgressPrototype.tsx` or the tests in full, and I ran nothing.",
  "findings": [
    {
      "id": "F1",
      "severity": "high",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (Inspector) vs src/lib/firstAnswerProgress.ts:203-215",
      "evidence": "The plan sorts chronology by gradedAt with an attemptId tie break. The first-answer identity in `orderedDistinctAnswers` sorts by gradedAt, then answeredAt, then attemptId. Section-history rows share one gradedAt per section, and RC rows share session completion time. A separate comparator can order two same-timestamp attempts differently from the projection. The inspector would then mark a different record as 'first' than the one counted in accuracy. Chronology would contradict the denominator.",
      "fix": "Build chronology from `orderedDistinctAnswers(answers)` filtered by questionKey, so it uses the same comparator and attemptId de-duplication. Derive 'first' from the first element of that list. Add a test with same-gradedAt attempts that differ in answeredAt."
    },
    {
      "id": "F2",
      "severity": "high",
      "path": "src/components/analytics/prototype/LiveProgressPrototype.tsx:10",
      "evidence": "`asOf={new Date().toISOString()}` and the `?? []` and `{...}` fallbacks create new props on every render. `buildPrototypeModel` is memoized on asOf and answers, so it recomputes on every render. The `setQuestion(null)` effect depends on `props.answers`, so with a null ledger it fires on every render. The plan adds time-window buckets and selected-bucket and inspector state derived from asOf. Bucket boundaries would drift between renders. A selected bucket or inspector could be cleared by unrelated re-renders, such as filter changes or hook refreshes.",
      "fix": "Freeze asOf per ledger load (for example `useMemo` keyed on the ledger identity or loading completion). Use module-level constants for the empty answers and coverage fallbacks. Add a test that the selected bucket and inspector survive a parent re-render."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (volume chart)",
      "evidence": "'Up to six equal chronological buckets' doesn't say whether they are equal in time span or equal in record count. 'Zero buckets included' implies time-equal. The edge cases are unspecified. For all-time, a single first-answer day gives a zero-length span (divide by zero). The boundary for a record exactly on a bucket edge is undefined. The timezone is undefined. The existing UI buckets by `America/Toronto` in `isoDay`, so UTC bucketing would put a record in a different bucket than the date shown on its row. The bucket total also has to reconcile with the filtered first-answer total (`model.progress` for the subject).",
      "fix": "Specify equal-duration buckets with half-open intervals, the last one inclusive of asOf. Use one bucket when the span is under one day, and fewer than six buckets for few distinct days. Bucket and label dates in the same Toronto timezone as `isoDay`. Test that the bucket sum equals `progress[area].denominator` at the window edges and for same-day and single-record cases."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "src/components/analytics/prototype/model.ts:28-56",
      "evidence": "`PrototypeModel` keeps only in-window `history`. The plan requires the inspector to show out-of-window repeats and first answers, and 'old first with recent repeat' bucket cases. None of that data is exposed. A repeat inside the window with its first answer outside it gets `isFirst` false, which is correct. Without the full ordered answers, chronology cannot be built from model state.",
      "fix": "Add the full `orderedDistinctAnswers` list, or a per-questionKey chronology map, to `PrototypeModel` and build it once in `buildPrototypeModel`. Unit-test it for out-of-window items."
    },
    {
      "id": "F5",
      "severity": "medium",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (evidence panel / topic rows) with model.ts:41-47",
      "evidence": "The Unclassified topic row exists only for LR first answers. Its percentage is withheld for partial LR sources only by the later blanket loop. The plan says 'exclude Unclassified from the meaningful type count' but doesn't say how Unclassified behaves in the evidence panel. It has no known topic to focus on, and the 'focus suggestion' could select it. Selected-topic state is stored as a string. A topic that disappears after a period change (not reset, or reset to a vanished topic) would leave an empty or invalid panel.",
      "fix": "Never recommend Unclassified in the focus suggestion. On a period change, clear the selected topic when it is absent from the new model, and default the filter by that topic's miss count. Test a topic with 0 rows in the new window and the Unclassified selection."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (history filter)",
      "evidence": "The history Repeats filter relies on `isFirst`, but the existing search and subject filters also reset `visibleDates` only on a fixed dependency list (`ProgressPrototype.tsx:155`). The new filter must be added to that list, or a stale expansion count could hide results. The plan's 'counts refer to filtered history' is not tied to that reset.",
      "fix": "Add the new first/repeat filter state to the `visibleDates` reset dependencies and to the filtered-count computation. Add a test."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (verification)",
      "evidence": "Restoring `supabase/functions/mcp/index.ts` 'to captured base' is safe only if the file is clean beforehand. The initial git status shows it unmodified, but the plan doesn't require confirming this before running the restore. It also doesn't say to use `git checkout <base> -- <file>` rather than a broader command.",
      "fix": "Record `git status` for that file before the build. Restore only if it became dirty during the build, using a file-scoped checkout, and report that in the final report."
    }
  ],
  "coverage": [
    "Plan text in full",
    "src/components/analytics/prototype/model.ts",
    "src/components/analytics/prototype/LiveProgressPrototype.tsx",
    "src/lib/firstAnswerDetails.ts",
    "src/lib/firstAnswerProgress.ts",
    "Grep of ProgressPrototype.tsx for state, effects, dates and history use"
  ],
  "limitations": [
    "I did not read ProgressPrototype.tsx or the CSS in full, so layout, accessibility, motion and focus behavior are unchecked.",
    "I did not read the existing tests, fixture, preview, or the other docs.",
    "I ran nothing: no tests, typecheck, build, browser QA or visual checks.",
    "The review is of the plan against the baseline code. No refinement implementation exists yet to inspect.",
    "Signed-in, RLS and production integration are not reviewed."
  ]
}
```

Disposition: accept F1-F7, clarified all in plan. No implementation before approval.

## Plan round 2

Result: C:/Users/Joshu/AppData/Local/Temp/claudex-q2ql4jwn/result.json

```json
{
  "verdict": "APPROVED",
  "summary": "F1\u2013F7 are resolved in the revised plan, and I found no new material defects. The revision reuses `orderedDistinctAnswers` and exposes it once as `model.allAnswers`. It freezes `asOf` per ledger identity, which works because the ledger is `query.data`, a stable react-query object in `useFirstAnswerProgress.ts:23`. Its half-open timestamp buckets reconcile with the projected denominator. It also covers Unclassified handling, selection fallback, the history-filter reset, and file-scoped collateral restore. Two low-severity points below are worth clarifying during the build.",
  "findings": [
    {
      "id": "F8",
      "severity": "low",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (volume chart, round-one clarifications)",
      "evidence": "The outcome text says 'All time spans actual first-answer dates'. The clarification sets the all-time interval to [earliest in-window first answer, asOf]. If the last first answer was weeks ago, the trailing bins are empty zero bins up to asOf. They are not first-answer dates, so the chart can look like a recent lull. Bins also use equal timestamp durations, such as 7/6 days for the 7-day window. Adjacent bins' Toronto start and end dates may then share or overlap a calendar date, and the labels would be ambiguous.",
      "fix": "Decide explicitly whether the all-time end is asOf or the last first-answer time. State that in the chart note, for example 'through today'. Label each bin as a Toronto start\u2013end range with a note that bins are equal-length, not calendar days. Test label output for the 7-day window."
    },
    {
      "id": "F9",
      "severity": "low",
      "path": "docs/progress-tactile/REFINEMENT-PLAN.md (bucket selection and evidence panel)",
      "evidence": "The plan doesn't say how a selected bucket interacts with the selected topic and evidence filter. It also doesn't say whether a selected bucket resets on area or period change. A stale bucket index after a period change could point at a different interval or a missing one.",
      "fix": "Key bucket selection to window and area, and clear it when either changes. Specify whether bucket and topic filters combine or replace each other, and show the active filters. Add a test."
    }
  ],
  "coverage": [
    "Revised plan including round-one clarifications",
    "Prior findings F1\u2013F7 checked against the revision",
    "src/hooks/useFirstAnswerProgress.ts, for ledger identity stability and asOf handling",
    "Prior reads: model.ts, LiveProgressPrototype.tsx, firstAnswerDetails.ts, firstAnswerProgress.ts"
  ],
  "limitations": [
    "Plan review only. No implementation was inspected.",
    "I did not re-read ProgressPrototype.tsx or the CSS in full.",
    "I ran no tests, typecheck, build or browser QA.",
    "I did not review signed-in integration or RLS."
  ]
}
```

Approval check passed for SHA 60ddd4abd02fe84ffe39e9732532208ba49a76616bb2b39ea88fbe43d36ed48d. F8: clarification owns interval to asOf, including trailing zero bins, rendered caption states this. F9: selected bucket local to chart keyed by subject/window/asOf; bucket evidence separate from selected-topic filter with explicit caption. Clean-before collateral git status recorded empty before build.

## Inspection round 1

C:/Users/Joshu/AppData/Local/Temp/claudex-el41_3fd/result.json

```json
{
  "verdict": "REVISE",
  "summary": "The core model matches the plan. Bucket edges and reconciliation, first-identity selection through the shared comparator, the frozen asOf, partial-source suppression, Unclassified handling and the DEV-only gate all hold up on code reading. I found a few concrete gaps: tests the plan promised are missing, the Timeline variant has no subject control for its new chart, and a stale evidence filter can show an empty list. None of these is a data-correctness defect. I did not run any tests or builds, so nothing here is confirmed passing.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:208",
      "evidence": "PracticeTimeline renders PracticeVolume with the shared `area` state, but this variant has no SubjectControl on the Overview. Only Desk and Explorer render one. A user on Timeline cannot choose RC for the new first-answer chart. The chart kicker says 'Your practice record \u00b7 LR' or 'RC' depending on state left over from another variant. This conflicts with the plan's 'selected period and subject' chart, and the 'View' tab only reaches Explorer.",
      "fix": "Add a SubjectControl to the Timeline aside, above the chart. Alternatively, render the chart once per subject, or label it with its subject explicitly."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/components/analytics/prototype/ProgressPrototype.test.tsx",
      "evidence": "Two tests promised in the plan's round-one clarifications are missing. One is the partial-source provisional chronology caption test (QuestionChronology shows 'available' and 'First and repeat labels are provisional'). The other is the disappearing-selected-topic fallback test (selectedTopic falls back to model.topics[0]). A grep for provisional, 'available saved' and missingSources in this test file returns no matches. The only match for 'disappear' or Unclassified is the single test at line 102. Parent re-render stability, period reset and Unclassified are covered.",
      "fix": "Add a UI test with coverage.missingSources non-empty that opens a record and asserts the 'available saved answers' heading and the provisional caption. Add a test that changes the window so the selected topic vanishes, and asserts the first remaining topic is shown with a default filter."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:87",
      "evidence": "EvidenceReview is keyed by `${row.topic}-${model.window}-${evidenceRequest}`, not by the row's counts or asOf. The wrapper recomputes asOf when the ledger refreshes (the Retry action calls data.refresh()). If new data removes a topic's misses while the filter is 'missed', the filter state persists. The panel then shows 'Showing 0 missed first answers of N' and 'No saved answers match this view', even though correct records exist.",
      "fix": "Add row.denominator, row.correct and model.asOf to the key, or derive the effective filter by falling back to 'all' when the chosen subset is empty."
    },
    {
      "id": "F4",
      "severity": "low",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:75",
      "evidence": "selectedTopic silently defaults to model.topics[0], and TopicRows then sets aria-pressed=true and is-selected on a row the user never chose. That row can be Unclassified, since topics sort by denominator. Assistive technology therefore announces a selection that did not happen. The evidence panel also opens on Unclassified by default, which the plan treats as a non-recommended, secondary group.",
      "fix": "Prefer the first non-Unclassified topic as the default. Optionally leave aria-pressed false until the user or the focus suggestion has made an explicit selection."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "docs/progress-tactile/REFINEMENT-VERIFICATION.md:5",
      "evidence": "The doc claims 'model(14), interaction(12): 40 passed'. Counting the test cases in the files gives about 6 + 6 UI tests + 14 model/other cases (7, 6 plus chronology and bucket describe blocks). The doc also references verification/refinement/tests.txt, but the manifest lists only verification/refinement/typecheck.txt and no refinement/tests.txt or build log. The claimed pass counts and the build/test logs could not be inspected as evidence.",
      "fix": "Add the missing refinement test and build logs to the evidence folder, or reword the claims as 'reported by host, log not attached'. Reconcile the per-file test counts."
    }
  ],
  "coverage": [
    "Read in full: model.ts, LiveProgressPrototype.tsx, ProgressPrototype.tsx, REFINEMENT-VERIFICATION.md.",
    "Read for tracing: src/lib/firstAnswerDetails.ts in full. In src/lib/firstAnswerProgress.ts, orderedDistinctAnswers and projectFirstAnswerProgress.",
    "Plan items checked against code: bucket partition and reconciliation, global first identity, chronology from model.allAnswers, partial-source suppression, Unclassified exclusion from recommendations and known-type count, LR focus label, evidence filter denominator and reset, history attempt filter, asOf freeze.",
    "Diff to src/pages/Analytics.tsx: DEV gate, hook order, and the only importer, which is the App.tsx lazy import.",
    "CSS: grep spot-check of focus-visible, active, 44px targets and the reduced-motion block.",
    "Test inventory: grep of test names in ProgressPrototype.test.tsx and model.test.ts."
  ],
  "limitations": [
    "Executed nothing: no tests, typecheck, build or browser runs. I cannot confirm any pass claim.",
    "Did not read the full CSS, fixture.ts, preview.tsx, progress-prototype.html or test bodies. The exact bucket edge and tie-break test assertions were not verified.",
    "Did not view the screenshots, so visual claims such as no green primary panels, depth and responsive layout are unreviewed.",
    "Did not inspect the research and review-log docs or the verification logs. Production exclusion of the harness and the supabase/functions/mcp/index.ts restoration rest on the doc's statements only.",
    "Signed-in account and RLS behavior, the hooks (useFirstAnswerProgress, useProgressWindow) and the data loaders were not reviewed. Files outside the explicit scope are not approved."
  ]
}
```

Disposition: accept F1-F3. Added Timeline chart subject control, partial-source/disappearing-topic regression tests and data-refresh evidence key. F4 prefer known topic default; aria-pressed represents currently selected state even when initialized programmatically, retained correctly. F5 counts40were correct but latest logs missing because final typecheck failed on two test-only unsupported exact options. Corrected those options; rerun tests/typecheck/build with persisted logs before final fresh inspection. No data writes or source ordering changes.

## Inspection round 2

C:/Users/Joshu/AppData/Local/Temp/claudex-cnx4ujs7/result.json

```json
{
  "verdict": "REVISE",
  "summary": "The model layer is sound. Bucket partitioning, first-identity derivation, the chronology comparator and the partial-source withholding all trace correctly against `firstAnswerProgress.ts` and `firstAnswerDetails.ts`. The DEV gating in `Analytics.tsx` is also sound. One medium defect remains in the shared `EvidenceRows` component: the expansion state resets on any parent re-render, which collapses the list and breaks return focus. Two low-severity presentation issues are also listed. I read the code and did not run tests or the browser, so the pass counts and screenshot claims in the verification doc are unverified by me.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:56-60",
      "evidence": "`EvidenceRows` resets expansion with `useEffect(() => setExpanded(false), [answers])`. Both callers pass an array built fresh on every render: `filtered` in `EvidenceReview` (line 96) and `history.filter(...)` per day group in `PracticeHistory` (line 202). Scenario: the user clicks 'Show all 10 answers', then clicks row 8. `openQuestion` calls `setQuestion`, so `ProgressPrototype` re-renders and passes a new array identity to `EvidenceRows`. The effect collapses the list and unmounts the row that was just clicked. `openerRef` now points at a detached node, so `closeQuestion` cannot restore focus. This violates the plan's 'existing keyboard and return-focus behavior retained' for any row past the 6-row limit. The existing focus test only opens the mosaic's first button, so it does not catch this. The same collapse happens on any parent re-render, such as a filter or subject change that leaves `answers` content unchanged.",
      "fix": "Reset expansion only when the content changes. Do this by keying `EvidenceRows` on a stable signature (for example the joined attemptIds or the filter value). Alternatively, memoize the arrays at the caller and compare by content inside the effect. Add a test that expands a list, opens a row beyond the sixth, and checks that the list stays expanded and Close returns focus to the exact opener."
    },
    {
      "id": "F2",
      "severity": "low",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:74,159-165",
      "evidence": "Compact `TopicRows` in Study Desk shows only the top 5 rows, sorted by denominator. The focus suggestion is chosen by missed count, and an Unclassified row or a lower-ranked topic can also be selected. The evidence panel then shows a topic whose row is not visible or marked selected. With more than 5 types, the plan's 'allow selecting Unclassified' is only reachable if it ranks in the top 5.",
      "fix": "Always include the selected topic in the compact list, or add a 'Show all types' control. Alternatively, render a selected-topic row above the list."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:123-127",
      "evidence": "Bucket labels and aria-labels show `isoDay(start) to isoDay(end)`. Buckets are half-open and every bucket but the last ends where the next begins. For a 7-day window each bucket is 28h, so adjacent buckets can display the same calendar day, and the visible label shows only the start date. The bar sits under a date that may also appear on its neighbour. A reader cannot tell which bar holds a given day's answers. The final interval is inclusive while the earlier ones are exclusive, and the label does not say so.",
      "fix": "Show the start and end date, or a note that intervals are about 28h. Alternatively, say in the caption that adjacent intervals may share a calendar date."
    }
  ],
  "coverage": [
    "Read the plan and the round-one clarifications.",
    "Read in full: model.ts, ProgressPrototype.tsx, LiveProgressPrototype.tsx, preview.tsx, progress-prototype.html, model.test.ts, ProgressPrototype.test.tsx, REFINEMENT-VERIFICATION.md, production-exclusion.json.",
    "Read the Analytics.tsx diff.",
    "Read the callers and shared state it depends on: firstAnswerProgress.ts, firstAnswerDetails.ts, useProgressWindow.ts.",
    "Spot-checked progress-prototype.css for focus, hover/press and reduced-motion rules.",
    "Hand-counted tests: 14 in model.test.ts and 15 in ProgressPrototype.test.tsx, which matches the doc's 43-test breakdown.",
    "Traced bucket edge math, window consistency with the projection, first-identity derivation, the `allAnswers` asOf cap, the partial-source paths and the Hooks order in Analytics.tsx."
  ],
  "limitations": [
    "I did not run tests, typecheck, build, or the browser. I did not view the screenshots. The browser QA, motion and viewport claims are unverified by me.",
    "I only partially read progress-prototype.css (grep of key rules). Several very long lines were omitted from the output.",
    "I did not read fixture.ts, REFINEMENT-RESEARCH.md, or the build.txt, tests.txt and typecheck.txt logs in full.",
    "I did not review useFirstAnswerProgress, the ledger loader, or any Supabase/RLS behaviour. Signed-in data scoping is out of scope and unreviewed.",
    "I did not review the legacy Analytics body or any file outside the listed scope. This is not whole-repository approval."
  ]
}
```

Disposition: accept F1-F3. Evidence expansion now resets on ordered attempt-ID content rather than array identity. Regression opens ninth expanded correct row and asserts stable mount/return focus. Compact list includes selected row and offers all-types control. Interval aria labels and selected detail include Toronto times and end ownership; chart caption notes shared calendar dates. Two inspection rounds used. Final fixes require host checks/browser evidence; no independent approval claimed after inspection budget. Plan unchanged, fixes satisfy existing behavior/accessibility contract.

Final host proof: 45tests passed, typecheckexit0; expanded ninth-row returnfocus manuallyverified inCUA, alltypesnavigation andexactintervaltimes verified. Final source remains not independentlyreinspected after second-reviewfixes; lastindependentverdictREVISE preserved above. BuildpassedbeforefinalDEV-onlyfixes, productionentryunchangedsincebuild. No commits/push/merge/deploy.
