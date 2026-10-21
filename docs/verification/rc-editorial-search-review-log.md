# RC Editorial/search review log
Codex builder; Claude Opus reviewer/inspector. Local implementation authorized. Max2 plan rounds, max2 final inspections. Baseline aeecce9bd038eb6e5b637f1ab22f348b2fa860c1.
## Plan round1: REVISE; observed claude-opus-5-5
{
  "verdict": "REVISE",
  "summary": "The plan's direction is sound, and most of what it says it found in the source holds up: openHit drops passageId, selectedTarget needs an exact question, the RC loop fills its six slots with prompt matches before the passage loop runs, the RC-only finder still waits on the LR bank, the fixture uses an inert button, and Timing preference is a write to localStorage. But step 5 relies on a route that doesn't do what the plan assumes: /rc/preview rejects any URL without a valid q. Several other steps leave state and loading behaviour unspecified in ways that will cause regressions. The plan needs revision before implementation.",
  "findings": [
    {
      "id": "F1",
      "severity": "high",
      "path": "src/features/rc/pages/RcQuestionPreview.tsx",
      "evidence": "Lines 24-25 and 49-51: questionId = Number(params.get('q')), and the effect sets 'That question address is invalid.' whenever questionId is not a positive safe integer. Number(null) is 0, so the plan's 'Open passage to existing /rc/preview?passage=... with returnTo' (step 5) always shows an error. Several other parts also depend on q: line 54 (question must be in the passage), the pending-launch key comparison at line 69, the drill navigation at line 99 (q=request.questionId), and rendering at lines 129/137 (question required). The current QuestionFinder test at line 227 only uses passage+q.",
      "fix": "Choose one approach and state it in the plan. (a) Open a passage-only selection at the passage's first question (lowest position in the address index), and say so in the UI. Or (b) extend RcQuestionPreview to support passage-only metadata preview. Option (b) must keep: no text before an explicit reveal, exposure recorded per passage, and a pending-launch identity and drill handoff that work without q. Add RcQuestionPreview.test.tsx to the verification suites, with cases for passage-only and invalid/missing q."
    },
    {
      "id": "F2",
      "severity": "medium",
      "path": "src/components/questionfinder/useQuestionFinderBanks.ts",
      "evidence": "The hook takes only `enabled` and awaits LR and RC together (line 109). In QuestionFinder.tsx, `view` is only seeded from `bank` (line 161), and the bank tabs (lines 318-334) let a student in the RC-hosted finder switch to All or LR. If the plan's RC-only change skips the LR load based on the host `bank`, then switching tabs gives empty LR results, or a misleading 'Nothing matched' (showNoResults only checks banks.loading). The rule that `error` is set only when both banks fail (line 135) and the lrFailed warning also assume both banks were requested.",
      "fix": "Key loading to the active view, not the host prop: load RC for rc, LR for lr, both for all. Start loading LR lazily the first time the tab moves to LR or All. Track per-bank loading so each tab shows its own 'Loading…' state. Only show the LR failure warning and the combined error for banks that were actually requested. Add tests: an RC-hosted finder never calls questionBank.load until the LR/All tab is chosen; switching then loads LR and shows a loading state rather than a false no-results message."
    },
    {
      "id": "F3",
      "severity": "medium",
      "path": "src/components/questionfinder/QuestionFinder.tsx",
      "evidence": "Lines 222-225: openHit writes only a query string, and selectedTarget (208-214) is derived from results.address. Keeping passageId will add new selection state beside `query`. Nothing in the plan says when that state is cleared. Typing, Clear, Escape-clear (236), switching bank tabs (325-329), BrowseByTest PT/section changes (646-672), the host-bank reset effect (169-172), and the RC section auto-select effect (615-620) all rewrite the query. A stale passageId could then send 'Open' to a passage that no longer matches the visible address, or to a different PT/section.",
      "fix": "Store the selected passage as {passageId, pt, section} and derive its validity from the current query/address: keep it only while the address equals that PT/section. Clear it on every query write that doesn't come from the passage pick itself, on view/bank change, and on reset. Add regression tests that pick a passage, then change PT/section, type, clear, and switch tabs, and check that Open is disabled or retargeted."
    },
    {
      "id": "F4",
      "severity": "medium",
      "path": "src/features/rc/components/RcHubSurface.tsx",
      "evidence": "saveTimingDefault (lines 843-852) writes the main applied `timing`/`customSeconds` to localStorage straight away. Its notice renders next to the main timing select (line 874). Step 3 moves this button into the drawer, which has Apply/Cancel transaction semantics ('Cancel restores applied configuration'). The plan leaves three things unspecified. Does Save use main timing or a drawer draft? Is the write undone by Cancel (it can't be: localStorage has already been written)? Where is the role=status notice shown once the drawer closes? A student could press Save, then Cancel, and believe nothing was saved. The existing test (RcHubSurface.test.tsx:818) clicks the 'Timing preference' summary and will need a new path.",
      "fix": "Specify all of this in the plan. Save stores the currently applied main timing, not drawer draft state. It is an immediate action that Cancel doesn't undo, and the drawer text says so. The success/failure notice stays visible after the drawer closes (or lives in the main timing field). The button stays disabled when customInvalid or there is no actorId. Add tests: opening, Apply and Cancel never write `lsatu:rc-timing-default:v1:*`, and Save then Cancel keeps the saved value and shows the notice."
    },
    {
      "id": "F5",
      "severity": "medium",
      "path": "docs/verification/rc-builder-simple-preview.tsx",
      "evidence": "QuestionFinder imports useQuestionFinderBanks and useFinderAddressIndex at module level, with no props or context to inject them. Those hooks call questionBank.load(), which fetches /data/_bank.generated.json (src/lib/questionLoader.ts:884), plus loadRcIndex/loadRcQuestionIndex and fetch('/data/finder-address-index.json'). The fixture imports production modules directly (lines 4-13). Step 7's 'deterministic synthetic finder bank and address-index adapters' has no seam to plug into. Mounting the real QuestionJump in the fixture would either load the real public bank, which makes the 'synthetic' claim false, or need a production-code change that the plan doesn't describe.",
      "fix": "Name the injection mechanism. Options: a Vite alias/resolve override used only by the fixture build, or an optional context provider with production defaults, covered by a test that production callers are unchanged. Make the fixture route readback show the exact navigated /rc/preview URL. Label the fixture data as synthetic on screen."
    },
    {
      "id": "F6",
      "severity": "low",
      "path": "scripts/build-finder-address-index.mjs",
      "evidence": "Lines 81-93 add every RC passage, including passages with no indexed questions (questions: []). useQuestionFinderBanks.ts:84 drops passages with questionCount === 0. An explicit passage selector built from the address index (step 5) would list passages that search never returns and that /rc/preview cannot open (see F1).",
      "fix": "Filter out passages with zero questions in the passage selector, or disable them with a reason. Add a test with a passage that has no questions."
    },
    {
      "id": "F7",
      "severity": "low",
      "path": "src/components/questionfinder/QuestionFinder.tsx",
      "evidence": "Keyboard navigation (lines 240-256) indexes into the combined `hits` = [...lr, ...rc], and RC row positions are offset by results.lr.length (453). A bounded 'more results' control for RC (step 6) changes the list length, and in mixed view the offsets. `active` is reset only when the query changes (192), so after expanding it can point at the wrong row, or past the end once the list collapses back. The plan's verification doesn't cover keyboard behaviour with more results.",
      "fix": "Reset or clamp `active` whenever the RC limit or view changes. Make the more-results control a focusable button inside the existing Tab cycle. Say what the bound is (e.g. pages of 6 up to N, with a visible total). Add tests that ArrowDown/Enter still open the correct hit after expanding, in both rc and all views."
    },
    {
      "id": "F8",
      "severity": "low",
      "path": "src/components/questionfinder/questionFinderSearch.ts",
      "evidence": "The plan asks for a reproduction of the 'six earlier prompt matches suppress the exact-title passage' bug, but verification only names the component suites. The ranking fix belongs in runFinderSearch (lines 328-389, where the passage loop is gated on rcHits.length < limit). questionFinderSearch.test.ts exists but isn't in the planned command, so pure-engine regressions, including LR exact-address scanning at 304-318, may not be exercised.",
      "fix": "Add src/components/questionfinder/questionFinderSearch.test.ts to the test command. Write the title-suppression regression and the LR exact-address/limit tests against the pure engine."
    }
  ],
  "coverage": [
    "Read in full: src/components/questionfinder/QuestionFinder.tsx, useQuestionFinderBanks.ts, useFinderAddressIndex.ts, questionFinderSearch.ts, QuestionJump.tsx",
    "Read the RC preview route src/features/rc/pages/RcQuestionPreview.tsx (lines 17-151): q requirement, exposure reveal, launch handoff",
    "Read src/pages/AcademyMainhub.tsx lines 190-579: both QuestionJump mounts, lookupReturnTo, finder=open handling, RC builder branch",
    "Read RcHubSurface.tsx lines 840-879 (timing default save and settings) and grepped the selection-control and drawer method markup plus the test expectations ('Review drill', 'Timing preference', 'Change passage selection')",
    "Read scripts/build-finder-address-index.mjs lines 55-114 (passage id/position identity, zero-question passages)",
    "Read the start of docs/verification/rc-builder-simple-preview.tsx (imports, launch readback) and questionLoader fetch points",
    "Grepped all QuestionFinder/QuestionJump callers (ClassroomHomeView, AcademyMainhub) and the tests that mock the hooks"
  ],
  "limitations": [
    "This is a review of the plan, not the implementation: none of the proposed changes exist yet, so findings are based on source reading.",
    "I could not run tests, the build, or a browser, and couldn't reproduce the passage-hit regression. I didn't read the plan's recorded failure logs or screenshots.",
    "I didn't fully read RcHubSurface.tsx (only the timing/settings region and grep hits), RcHubSurface.test.tsx, the QuestionFinder test suites, rcSearch.ts, rcExposure, or safeRcReturnTo.",
    "I didn't check that passage ids in the RC index match finder-address-index.json in the generated public data beyond what the build script shows.",
    "I didn't verify the plan's SHA256 against the file on disk."
  ]
}
Dispositions: Accept F1-F8. Plan revised inline plus resolved details; optional-q preview chosen; active-view loading, selection invalidation, explicit timing-write semantics, Vite fixture hook adapters, zero-question exclusion, bounded keyboard-safe more-results, pure-engine tests.
Result: C:/Users/Joshu/AppData/Local/Temp/rc-editorial-plan-review-20261021/claudex-1yodxc0n/result.json
## Plan round2: APPROVED; observed claude-opus-5-5
{
  "verdict": "APPROVED",
  "summary": "The revised plan resolves all eight earlier findings (F1–F8), and I found no new material defects. I checked the claims it depends on against the source. The fixture change for F5 has a real hook point: the preview server and the exporter both already swap in synthetic modules through a resolveId hook. The drill player already works without q, so passage-only launches can safely leave q out. The optional-q preview design keeps the existing safeguards: a q that is present but bad is still rejected, a retained launch must match passage and q (or no q) exactly, nothing is revealed without an explicit reveal that records passage-level exposure, and Start still creates a whole-passage session.",
  "findings": [],
  "coverage": [
    "F1: RcQuestionPreview.tsx lines 17-151. Current code validates q at line 49, checks retained launch identity at line 69 (passage, q, return path), sends q to the drill at line 99, and keys reveal exposure by passage at line 108. The plan's handling of q as number-or-null, plus rejecting an empty, zero, malformed or non-member q, fits this structure.",
    "F1 follow-through: RcPlayer.tsx:160 already treats a missing q as no target question (null), so leaving q out of a passage-only handoff is safe.",
    "F2/F3/F7: re-checked against QuestionFinder.tsx (results view at line 161, bank tabs 318-334, query writers 172/236/328/374/646-672, auto-select effect 615-620, keyboard focus 240-256) and useQuestionFinderBanks.ts. The resolved items cover every query and view writer I identified.",
    "F4: re-checked RcHubSurface.tsx lines 843-874. Saving the current main timing immediately, labelled as such, with the notice kept after Cancel, matches what saveTimingDefault actually does.",
    "F5: read scripts/verification/start-rc-builder-simple-preview.mjs in full and the resolveId section of scripts/verification/export-rc-advisor.mjs. Both swap in synthetic modules by import path and replace the backend client with a proxy that throws. Replacing ./useQuestionFinderBanks also keeps the real questionLoader and the @/features/rc/lib/rcBank import (which the existing '../lib/rcBank' mapping doesn't catch) out of the fixture.",
    "F6: scripts/build-finder-address-index.mjs lines 81-93 output passages with zero questions; the plan now filters or disables these.",
    "F8: the test command now includes questionFinderSearch.test.ts and RcQuestionPreview.test.tsx."
  ],
  "limitations": [
    "This reviews the plan only. The implementation doesn't exist yet, so nothing has been run, and I'm not claiming any tests pass.",
    "I didn't read RcPlayer.tsx beyond the line that reads q, or how it handles a session that has no target question.",
    "I didn't fully read RcHubSurface.tsx, the existing test suites, export-rc-advisor.mjs beyond its resolveId section, or the generated public data files.",
    "I didn't verify the plan's SHA256 against the file on disk."
  ]
}
Approved plan hash f4a02d30ca6a9bfd29cbd1d18076da9b0c5a391609f6cd27ab3a3a7809c52dfe. Implementation authorized previously by user.
Implementation detail: finder may derive retained passage identity from explicit typed PT/S/P address plus validated index, avoiding independent stale hidden state; must satisfy all reviewed invalidation/membership requirements.
## Implementation verification before final inspection
All changes authored by Codex agents. Full749tests passed across63files; typecheck test-typing repairs followed by typecheckpass+145affectedtests; buildpass. Actualbefore/after pairedfinder repro and publicindexchecks recorded in verification report. Sourcefrozen beforeinspection.
Snapshot includes intended preexisting uncommitted RCwork; inspector should inspect currenttask+relevantinteractions, not claimcompleteindependentreviewofallhistoricalconceptfiles. No publication authorized.
