# Production Progress review log

2026-10-28. Codex coordinates/builds; Claude reviews the plan and inspects final code. CLI default model/effort requested, observed identity to be recorded. Five plan rounds, two inspections, two fixes. User explicitly authorizes refinement and publication. No Lovable-credit actions or backend writes authorized. Base dbf78f7e68f995e68cdbe9fa1d83337f9d386ad2. Existing prototype work preserved. Plan docs/progress-release-20261028/PLAN.md.

## Plan round 1

C:/Users/Joshu/AppData/Local/Temp/claudex-r19tm7y2/result.json
Observed model claude-sonnet-5-5.

```json
{
  "verdict": "REVISE",
  "summary": "The plan is mostly sound, and its RC date and provenance corrections match what the code needs. It leaves several contracts underspecified, though. The first-answer ledger hook is also used by other pages, and the plan doesn't say how the new refetch behaviour affects them. Existing /progress/history deep-link parameters, which legacy redirects produce, would be silently dropped. The RC correction can also misorder questions across sessions. None of these needs a redesign, but each needs an explicit decision and a test before the work is built.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/components/analytics/FirstAnswerHistoryPanel.tsx:15-24; src/lib/preserveRedirectLocation.ts:16-22",
      "evidence": "The existing /progress/history page reads historyArea, historyResult, historyAnswer, historySource, historyMode, historyTopic, historySearch and historySort from the URL. preserveRedirectLocation (used by the old drill-history redirects in App.tsx:216/272) rewrites ?area=LR to historyArea=LR on /progress/history. The plan routes history to the new container and says to 'preserve only validated window\u2026 don't propagate arbitrary URL state'. It never says the new History view still honours these params. A legacy or bookmarked link such as /progress/history?historyArea=RC&historyResult=missed would then land on an unfiltered history, and nothing would say a filter was dropped.",
      "fix": "Specify that the new History view parses and validates the existing history* params, with the same enums and defaults as FirstAnswerHistoryPanel. Keep writing filters to the URL with replace semantics. Strip them when switching tabs, but not when arriving via a redirect. Add a deep-link regression test for historyArea and historyResult."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/hooks/useFirstAnswerProgress.ts:11-19 (callers: ProgressTopics.tsx:11, StudentLibraryLessons.tsx:18, DossierReview.tsx:13, FirstAnswerProgressPanel.tsx:36, FirstAnswerHistoryPanel.tsx:14)",
      "evidence": "The plan makes the hook revalidate on mount and changes how asOf is derived, but it does not say how the other consumers are affected. The ledger is five paginated source reads of 500 rows each. If the Overview, History and Topics routes are separate Route elements, every tab switch remounts the container and re-reads all five sources. Teacher DossierReview and Library Lessons would also refetch on every mount. Consumers that pass a stable dataUpdatedAt-based asOf differ from those that still call new Date() inside useMemo. FirstAnswerHistoryPanel and ProgressTopics each compute their own new Date().toISOString(), so they can disagree with the container's asOf.",
      "fix": "Add the revalidation as an option that only ProgressPage passes (e.g. refetchOnMount:'always'), or use a short staleTime of about 30s. Alternatively, mount ProgressPage once as a layout route so tabs don't refetch. Have every consumer take asOf from the hook. State the intended refetch policy and test it for the other consumers."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "src/lib/firstAnswerProgress.ts:162-178 (planned RC gradedAt change)",
      "evidence": "The plan sets gradedAt to the later of session.completed_at and attempt.created_at. Sorting is by gradedAt, then answeredAt. Consider a question that appears in two RC sessions. Session A was completed on day 5, and a review attempt for it was saved on day 9. Session B has a pick saved on day 6 and was completed on day 7. Under the old rule A is first at day 5. Under the new rule A's review attempt, now at day 9, loses to B at day 7. This is probably the intended behaviour, but nothing says it was considered or tested. Windowing also changes. A review attempt created after asOf is excluded by `at <= end`, because the repeat counts for the window use the new gradedAt. A client-clock-ahead created_at can therefore make an attempt vanish rather than land in the window.",
      "fix": "Add cross-session tests for the ordering above. Add a clock-skew rule: clamp a created_at that is later than the read time, or document that the skewed attempt is excluded. Check that repeatCount and the history chronology follow the same rule."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "src/lib/firstAnswerSources.ts:55-60 and src/lib/firstAnswerProgress.ts:78-86",
      "evidence": "The RC session select currently omits config. The plan adds it and falls back to config.practiceTestRunId and config.timedSectionSittingId. Existing history code (drillHistory.ts:134) uses `??`, but the plan says `||`. An empty-string column value then resolves differently between Progress and History. The plan also does not say what a malformed config value does, such as a non-string, an array, or an id that is not in the completed-run set. For timedSectionSittingId there is no completed-sitting source at all, so the fallback only changes the mode label and does not gate eligibility. The plan's wording 'require completed parent for either path' is therefore only enforceable for practice-test runs.",
      "fix": "Define one shared resolver (typeof string and non-empty) and use it from drillHistory, rcReviewAdapter and the Progress adapter. Test empty-string, non-string and unknown-run values. State that timed-sitting provenance affects mode only."
    },
    {
      "id": "F5",
      "severity": "low",
      "path": "src/hooks/useProgressWindow.ts:19-30",
      "evidence": "The prototype calls useProgressWindow(false), but the production panels use the default persist=true, which reads and writes localStorage. The plan says only 'the same validated window as the presenter'. A deep link without ?window= will take a stale stored value rather than the default of 30, which conflicts with 'deep links retain correct period'. setWindow uses replace:true, so Back never restores the previous period, again conflicting with 'Browser Back\u2026 retain correct\u2026 period'.",
      "fix": "Choose the persist mode and document it. Decide whether period changes are history entries (push) or replacements, and test Back accordingly."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "src/components/analytics/prototype/ProgressPrototype.tsx:5,34,121-130 versus FirstAnswerHistoryPanel.tsx:49-57",
      "evidence": "The presenter hard-codes America/Toronto for interval and period labels. The History panel groups rows by browser-local date and labels them with the local locale. The chronology in the new History view could therefore show a record under a different date than the Toronto-labelled bucket or evidence row that selected it. A student outside Eastern time sees two date systems on one page.",
      "fix": "Use a single timezone helper for bucket labels, evidence rows and chronology date groups, and label it. Add a test with a row near midnight Toronto."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "docs/progress-release-20261028/PLAN.md (Verification contract)",
      "evidence": "The plan hashes and restores supabase/functions/mcp/index.ts after the build. It does not address the dev-only CSS and preview entry (progress-prototype.html, prototype/preview.tsx) that sit at the repo root. It also has no check that progress-prototype.css is scoped. A global CSS import in the lazy chunk could change the other pages' styles, or an unscoped selector could leak once the CSS is no longer DEV-only.",
      "fix": "Add a check that every selector in progress-prototype.css is under the .pp- or scope root. Confirm that progress-prototype.html is not emitted in dist, since vite's build input includes root HTML files."
    }
  ],
  "coverage": [
    "Plan text read in full.",
    "src/lib/firstAnswerProgress.ts, src/lib/firstAnswerSources.ts and src/hooks/useFirstAnswerProgress.ts read in full.",
    "Consumers of useFirstAnswerProgress located (ProgressTopics, StudentLibraryLessons, DossierReview, FirstAnswerProgressPanel, FirstAnswerHistoryPanel, LiveProgressPrototype).",
    "src/pages/Analytics.tsx lines 1-120, App.tsx progress routes, destinationAccess progress tabs, preserveRedirectLocation and useProgressWindow.",
    "drillHistory.ts RC parent resolution and a grep of practiceTestRunId and timedSectionSittingId usage.",
    "Imports of the prototype presenter, the model and the fixture."
  ],
  "limitations": [
    "No tests, build or browser were run, and no visual QA or screenshots were inspected.",
    "The prototype presenter, model.ts, firstAnswerDetails.ts and the CSS were not read in full. Claims about charts, bucket sums, the focus order, expansion behaviour and the production/dev guards could not be checked.",
    "DrillHistory.tsx, ProgressTopics.tsx, DossierReview and the existing tests were not read in detail.",
    "The Lovable publication steps and the live signed-in data checks are outside what could be inspected."
  ]
}
```

Disposition: accept F1,F2,F3,F5,F6,F7. F4 accept strict provenance validation/tests, keep resolver scoped to Progress rather than changing unrelated protected-review modules. Plan passages replaced to make contracts consistent. No production implementation yet.
