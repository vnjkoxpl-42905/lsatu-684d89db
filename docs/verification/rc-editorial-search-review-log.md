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
## Final inspection round1: REVISE; observed claude-opus-5-5
{
  "verdict": "REVISE",
  "summary": "Most of the plan is implemented, and the safeguards I traced hold. RcQuestionPreview handles a missing q separately from an invalid one, keeps question focus as number|null in the retained launch, and rechecks the account and preview context. Retained launches with a different focus are rejected, and passage-only launches leave q out of the drill URL. The RC-only bank loading is keyed to the live finder view. More results load six at a time up to 60. Timing-default saving only happens on its explicit button, and the fixture adapters are wired into both the preview server and the exporter. One material deviation remains. When a student clicks a passage result, the finder does not keep that passage's id as the resolved plan requires. It rewrites the query as text and looks the passage up again by position in a separately generated address index, without checking that the id it finds matches the result that was clicked. The other findings are low-severity cleanup.",
  "findings": [
    {
      "id": "F1",
      "severity": "medium",
      "path": "src/components/questionfinder/QuestionFinder.tsx",
      "evidence": "The plan's resolved details require: 'Retained passage selection records passageId,pt,section and validates them against the current visible address.' Instead, openHit (line ~231) discards hit.passageId and only writes the text query `PT${preptest} S${section} P${setNumber}`. selectedTarget (lines 211-219) then looks the passage up again in useFinderAddressIndex (/data/finder-address-index.json) by `passage.position === address.pnum`. The search hits come from a different source, loadRcIndex. The two artifacts are generated separately; scripts/build-finder-address-index.mjs maps position from setNumber at build time. If they drift (stale JSON, a renumbered passage, or a passage whose question count differs between them), Open passage can navigate to a different passage id than the one clicked, or quietly disable. Nothing compares the resolved id with hit.passageId. The verification doc even records an 'address-position mismatch' in an earlier fixture, so this kind of drift has already happened in testing. The rcFlow tests only use fixtures where the two sources agree.",
      "fix": "Have openHit store the retained selection as {passageId, pt, section, pnum}. In selectedTarget, open only if the address-index passage at that position has id === retained.passageId; otherwise disable Open and explain the mismatch. Clear the retained selection on the actions the plan lists (typing, Clear, Escape, bank or test/section change). Add a test where the bank and the address index disagree on the id at a position, and assert that Open stays disabled and navigate is not called."
    },
    {
      "id": "F2",
      "severity": "low",
      "path": "src/features/rc/components/RcHubSurface.tsx",
      "evidence": "inspectSet no longer clears selectedSet when it starts (the setSelectedSet(null) call was removed). 'Choose different passages' keeps the same selectionKey. If the new inspection fails ('No passages match…', 'Some passages could not be loaded', 'loaded without its questions', or the catch path), the earlier set stays active. The review stage keeps showing the old passages with Start enabled, and the only feedback is a notice. The student asked for different passages, but Start still launches the old ones. Nothing new is exposed, but the result is ambiguous.",
      "fix": "When an inspection triggered by 'Choose different passages' fails, either state clearly that the previously reviewed passages are still selected, or require explicit confirmation before Start. Add a test for that failure path."
    },
    {
      "id": "F3",
      "severity": "low",
      "path": "src/features/rc/components/RcHubSurface.tsx",
      "evidence": "essentialFilters (line ~949), hiddenFilterSummary (line 912), essentialOpen/essentialRoot with their pointerdown listener effect, essentialKeyDown, setActiveFilters, topicLabel and difficultyLabel are defined but never rendered. A test even asserts `.rc-essential-control` has length 0. This is dead UI logic inside a component that controls launches, and it could break under noUnusedLocals.",
      "fix": "Remove the unused essential-filter code and its CSS, or render it on purpose."
    },
    {
      "id": "F4",
      "severity": "low",
      "path": "src/features/rc/components/RcHubSurface.tsx",
      "evidence": "Plan item 2 says the selection control's accessible name should describe both the action and the current method. The button's aria-label is a fixed 'Change passage selection'. The current method ('Tutor's choice' / 'Selected passages') is only in aria-describedby, so screen readers that skip descriptions announce the name without the method.",
      "fix": "Put the method in the name, e.g. aria-label={`Change passage selection, currently ${method}`}, or drop aria-label so the visible label and value form the name, and update the test."
    }
  ],
  "coverage": [
    "Plan document and the full tracked diff, as provided",
    "QuestionFinder.tsx: panel state, selectedTarget, openHit, more-results, keyboard reset/clamp, BrowseByTest passage/question selectors",
    "questionFinderSearch.ts: parseRcPassageAddress, scoring, rcLimit/rcTotal, LR address grammar left unchanged",
    "useFinderAddressIndex.ts and scripts/build-finder-address-index.mjs: how position maps to setNumber",
    "useQuestionFinderBanks.ts: per-view lazy loading, failure/retry semantics",
    "QuestionFinder.rcFlow.test.tsx contents",
    "RcQuestionPreview.tsx: optional q validation, Pending identity, launch/reveal context checks, passage-only rendering",
    "RcHubSurface.tsx: inspectSet, start/launchKey rechecks, strict-exposure history recheck, timing-default drawer, drawer method switching, dead-code check",
    "Sheet portal and drawer CSS scoping (rcBuilderRefinement.css)",
    "Fixture wiring: rc-finder-fixture.mjs referenced by both start-rc-builder-simple-preview.mjs and export-rc-advisor.mjs; preview route readback in rc-builder-simple-preview.tsx",
    "rc-editorial-search-verification.md claims (read as statements only, not checked against the logs)"
  ],
  "limitations": [
    "I could not run tests, typecheck, build or a browser, so pass/fail claims in the verification doc are unconfirmed.",
    "I did not read the proof logs under AppData/Temp or the Downloads screenshots, and I did not check visual layout at the stated widths.",
    "I skimmed but did not fully review the RcHubSurface.test.tsx changes, the CSS files, the AssignedWorkPanel/useAssignedTodoFeed/assignedWorkSection changes, or RcSavedSetsPanel beyond the diff.",
    "I did not compare the real finder-address-index.json with the RC index for actual drift; F1 rests on code structure, not an observed real-data mismatch.",
    "Binary image artifacts and the historical HTML exports in the manifest were not inspected."
  ]
}
Result: C:/Users/Joshu/AppData/Local/Temp/rc-editorial-inspection-20261021/claudex-gzvw73y9/result.json
Dispositions: accept F1 id/provenance cross-check with mismatch explanation and tests; accept F2 explicit prior-selection notice on failed reroll; accept F3 remove dead essential-filter component/styles; accept F4 accessible current-method name. Host also fixes stale Choose for me/Preview wording in contextual/save management notices to match Tutor's choice/Review selection. Inspection did not examine screenshots/proof logs or fully inspect CSS; second inspection requested to cover currenttask screenshots/CSS and all repairs.
`n## Final inspection 2: APPROVED`nResult: C:/Users/Joshu/AppData/Local/Temp/rc-editorial-inspection-20261021/claudex-w3e9ffi5/result.json`nRequested opus; observed claude-opus-5-5. Fresh read-only session. No production code changed afterward.`n{
  "verdict": "APPROVED",
  "summary": "All four findings from the prior inspection are fixed in the current source. No material functional defects remain in the areas I inspected.\n\n- **F1:** Clicking a result now keeps its passageId, pt, section, pnum, questionId and qnum (`QuestionFinder.tsx:158`, `:245`). The `retainedMismatch` check at `:226-234` compares that kept identity against the address index: same passage id at the same position with questions, same visible address, same question, and an `addressTarget` whose passageId and questionId match. On any mismatch, `selectedTarget` becomes null, so Open stays disabled and an alert explains why. Typing, Clear, Escape-clear, a tab/bank change and selector picks all clear the kept identity by going through `writeQuery`. `openHit` alone calls `setQuery` directly, so its identity survives.\n- **F2:** When \"Choose different passages\" fails, the notice now says the previously reviewed passages are still selected, and tests cover the missing-passage, missing-questions and load-failure cases.\n- **F3:** The dead essential-filter identifiers are gone; a grep finds none.\n- **F4:** The selection control's accessible name now includes the current method (\"Change passage selection, currently Tutor's choice\"), and a test asserts it.\n\nThe rest of the plan's safeguards still hold in source:\n- Missing `q` versus invalid `q` in RcQuestionPreview, and `number|null` question focus in the pending launch.\n- Lazy bank loading keyed to the live finder view.\n- More results six at a time up to 60.\n- Timing default saved only by its explicit button, with status shown after the drawer closes.\n\nWhat's left is three low-severity issues about evidence and polish:\n- **Finder screenshots:** they appear to be captured partway through the fade-in. They show the builder behind the panel, so they can't prove the finder is readable.\n- **Timing at 320px:** the Timing select cuts off its value.\n- **Flaky test:** one 60-result expansion test timed out once.",
  "findings": [
    {
      "id": "G1",
      "severity": "low",
      "path": "C:/Users/Joshu/Downloads/RC-Editorial-Final-2026-10-21/finder-1440.jpg; finder-320.jpg",
      "evidence": "In both finder screenshots the builder behind the panel shows clearly through it: 'Choose your next passage', the Timing/Show answers selects and 'Review selection' are all visible through the panel body. The CSS gives `.qf-panel` an opaque `background: var(--qf-surface-warm)`, and the qfRise (240ms) and qfFade (180ms) animations start at opacity 0 (`questionFinder.css:164-166`, `:908-937`). So these frames were most likely taken mid-animation rather than showing a translucent design. As captured, they cannot support any claim about finder readability or contrast. At 320px the overlap makes the placeholder, hint and row titles hard to read.",
      "fix": "Recapture finder-1440 and finder-320 after the animations finish: wait about 300ms or for animationend, or use prefers-reduced-motion. Then confirm the panel is opaque before citing the images as visual evidence."
    },
    {
      "id": "G2",
      "severity": "low",
      "path": "src/features/rc/rc.css (and src/features/rc/rcBuilderRefinement.css)",
      "evidence": "In setup-320.jpg the Passages stepper and Timing select share one row, and the Timing select shows 'Standard pac' cut off. The pace ('8:45 per passage') is hidden from the main control at the smallest width the plan lists. There's no horizontal page clipping, but the selected value can't be read without opening the select.",
      "fix": "At ≤360px, stack the count and timing controls, or use a shorter option label (e.g. 'Standard · 8:45') so the selected value fits."
    },
    {
      "id": "G3",
      "severity": "low",
      "path": "src/components/questionfinder/QuestionFinder.rcFlow.test.tsx",
      "evidence": "The host reports the full run had one 15s timeout in the 60-result expansion test, which then passed 28/28 on an immediate rerun with no code changes. That means the test that guards the bounded more-results behaviour is timing-sensitive, and a future CI failure could be dismissed as flake.",
      "fix": "Lower the per-click cost (fewer DOM queries, or a smaller fixture of 61 results), or set an explicit timeout for that test. Record the flake in the verification log as observed, not resolved."
    }
  ],
  "coverage": [
    "Prior inspection result.json (F1–F4 text) compared against current source",
    "QuestionFinder.tsx: retainedRcHit state, writeQuery clearing paths, addressTarget, retainedMismatch, selectedTarget/openSelected, openHit, BrowseByTest passage/question selectors and effects (from diff plus grep of current file)",
    "questionFinderSearch.ts: parseRcPassageAddress, pnum filtering, scoring, rcLimit/rcTotal, LR loop skipped on pnum (diff)",
    "useQuestionFinderBanks.ts: lazy loading per view, requested-bank loading/failure, retry (diff)",
    "RcQuestionPreview.tsx and its tests: optional q, raw-q context key, passage-only reveal/start/pending recovery, rejected focus mismatch (diff)",
    "RcHubSurface.tsx and its tests: accessible name with current method, retained-selection failure notice, launchKey vs selectionKey, strict-exposure recheck at Start, timing preference drawer (diff); grep confirming dead essential-filter code removed",
    "questionFinder.css: panel opacity and animation rules",
    "Screenshots viewed with Read: setup-1440.jpg, setup-320.jpg, finder-1440.jpg, finder-320.jpg; visual hierarchy assessed for setup (passage selection first, count beside timing, Show answers below, Review selection primary, quiet save disclosure)"
  ],
  "limitations": [
    "I could not run tests, typecheck, build or a browser. The host's figures (97 finder, 121 builder, 760 total with one timeout, typecheck/build exit 0) are unconfirmed.",
    "I did not re-read the full current QuestionFinder.tsx or RcHubSurface.tsx beyond the diff and targeted greps, and I did not open the new QuestionFinder.rcFlow.test.tsx regression cases. That the nine regression cases failed before the repair is taken from the host's report.",
    "I did not read the verification and review-log markdown files, the fixture scripts or rcBuilderRefinement.css/rcTypography.css in full.",
    "Image reading worked, but the finder screenshots look like mid-animation frames, so I could not assess the finder's final readability visually (see G1). I reviewed no screenshots at 980/768/390, and none of the drawer or review stage.",
    "I did not check the real finder-address-index.json against the RC index for actual position/id drift. The F1 fix is verified only from code structure.",
    "AssignedWorkPanel/useAssignedTodoFeed/assignedWorkSection, RcSavedSetsPanel and the historical prototype artifacts were reviewed only lightly or not at all."
  ]
}
Host disposition: G1 evidence recaptured with reduced motion after review, desktop and320 finder confirmed opaque/readable. G2 retained as known low-priority320px timing-value truncation (opening select shows full pace); no post-inspection source changes. G3 timeout observed and recorded, whole-file rerun28/28 passed unchanged, not declared permanently resolved. Inspection budget2/2 used. Source changes are approved within stated coverage, not an exhaustive production acceptance claim.
