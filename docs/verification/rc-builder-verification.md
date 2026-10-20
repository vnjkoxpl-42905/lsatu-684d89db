# RC builder verification, 2026-10-20

Implemented locally on `codex/rc-builder-layout`, based on `a52b3ff5`.
No merge, push, deployment, or production practice attempt was performed.

## What changed

- Neutral dark RC Create panel within light Practice, following the existing LR controls and typography.
- Equally visible automatic/manual modes first, configuration left and sticky Your drill summary right.
- Narrow layouts stack and provide keyboard-accessible links between settings and the summary.
- Separate automatic/manual filter and invalid-range drafts; manual order survives mode switches. Timing/reveal remain shared drill settings.
- Active mode exclusively supplies preview/launch IDs and source. Empty manual selection has no automatic time total.
- Reset filters preserves selection, mode, count, timing, reveal and search. Search has explicitly labeled clearing.
- Precise, validated PrepTest inputs; active restrictions remain visible. No-result recovery requires an explicit action.
- Passage title/reference search, selected order, matching/selected counts, existing paging and remove/reorder controls.
- RC Saved navigation opens RC work; exact passages and reusable settings have distinct save actions.
- Existing preview invalidation, content snapshot checks, shortfall acknowledgment, actor scope, exposure/hidden-result protection and launch/retry safeguards retained.

## Automated checks

- Six focused suites passed: 142 tests total across RcHubSurface, RcAdaptiveSummary, RcSavedSetsPanel, AcademyMainhub.section, rcBuilderSummary and rcSavedSetCodec.
- RcHubSurface rerun after final copy/accessibility changes: 80/80 passed.
- `npm run typecheck` passed.
- `npm run build` passed, including bank/index identity verification and postbuild canonical-content scan. Existing Browserslist, ambiguous Tailwind classes, missing noise asset, dynamic-import and large-chunk warnings remain.
- Static review identified an empty manual timing-total issue; corrected with regression coverage. No other high-confidence selection/launch regression was reported.

## Browser evidence

Used Codex in-app browser against `http://127.0.0.1:8092/docs/verification/rc-builder-preview.html`.
The fixture mounts the real RC components and production Classroom/index CSS in a light Practice scaffold. Account, bank, saved-work and persistence adapters are synthetic. It is not a signed-in production acceptance test or a complete application-shell test.

- Layout checked at 320, 390, 768, 1024 and 1440 CSS pixels; measured no horizontal page overflow. Desktop summary computed as sticky, 280px wide, background rgb(24,24,26). Builder computed background rgb(9,9,11), border rgb(56,56,58), heading rgb(239,239,237).
- Corrected a real CSS specificity conflict discovered when the light host initially overrode the dark outer panel.
- Selected two passages, reordered them, switched automatic/manual and verified retained order and separate automatic count.
- Zero-result search retained selected passages, with explicit clear-search/review-filter recovery.
- Reference `PT140 S3 P1` returned its exact passage.
- Manual preview showed 2 passages, 7 questions, 17:30 total at standard pace and At the end reveal. Simulated launch readback preserved IDs `[1189,1188]`, `source: manual`, `secondsPerPassage: 525`, `reveal: end_of_set`.
- Failed preview kept Preview available for retry and exposed no Start action. Failed history disabled Preview. Failed simulated start displayed its error.
- Expanded hidden-result adaptive details exposed no numeric grades or target difficulty.
- Opened an exact saved passage set and verified return to RC Create in manual mode with 2 passages/7 selected questions; it required preview before launch.
- Keyboard: Tab moved between modes with a visible rgb(214,214,209) outline; Space switched mode. Enter on mobile summary/settings links moved focus to their named targets.
- Invalid From > To remained on screen, disabled preview and produced a sidebar correction message even after filters were collapsed.
- Temporary browser viewport override was reset.

Screenshots: `rc-builder-desktop.jpg`, `rc-builder-mobile.jpg`, `rc-builder-mobile-summary.jpg`.
Harness: `node scripts/verification/start-rc-builder-preview.mjs`. Failure scenarios: `?fail=history`, `?fail=preview`, `?fail=start`; hidden results: `?hidden=1`; saved view: `?savedView=1`.

Not verified: signed-in local/production persistence after these changes, physical mobile devices, screen-reader speech, real network failures or concurrent-device behavior. Existing unit safeguards provide regression evidence, not deployed acceptance.

## RC landing correction after the LR screenshot

The user's LR screenshot referred to the landing page, not the deeper LR configuration screen. RC Create now opens a dedicated landing page with two equally visible choices above Your practice and Assigned work. The existing detailed builder appears after either choice. LR implementation files remain unchanged.

- New `RcPracticeLanding` and shared `RcPracticeResume` render the real entry panel and identifiable resume row. Production uses existing owner-scoped normalized runs and the unchanged `AssignedWorkPanel`.
- Automatic and manual entry use `builder=automatic` / `builder=manual`. Saved, passage, timing, assignment and protected deep links continue to open setup. Legacy stage-only links continue to open setup after normalization. Back to RC practice clears setup parameters.
- Builder regression suite: 81/81 passed. Navigation suite: 36/36 passed, including both landing entries, identifiable resume, preserved deep links and LR isolation.
- Build and final typecheck passed. Typecheck initially caught an unsupported `exact` option in the new Testing Library assertion; corrected before the passing rerun.
- Codex browser visual checks performed at measured 1440, 390 and 320 CSS pixel widths. Browser zoom was 80%; viewport overrides were adjusted based on measured `innerWidth`. No horizontal page overflow was measured. Hero and lower panels stack on narrow layouts.
- Both entry buttons were exercised; automatic opened Choose for me, manual opened an empty Pick passages mode with Preview disabled, and Back returned to landing. Tab moved between entry buttons with a visible focus outline; Enter opened manual setup.
- The preview uses the real landing, resume, assigned-work and builder components with synthetic account adapters. Its Open a question control is a fixture placeholder. It is not a signed-in production acceptance result.
- Screenshots: `rc-landing-desktop.jpg`, `rc-landing-mobile.jpg`, `rc-landing-320.jpg`, and `rc-landing-preview.jpg`. Browser sizing was reset and the RC landing tab left open.

## Single Opus 5.5 design review and repairs (2026-10-20)

Exactly one Claude round completed using observed claude-opus-5-5, verdict REVISE. Full response, scope limitations and each disposition are recorded in rc-design-review-log.md. Later fixes were not independently re-reviewed.

Repairs cover Back history, mode URL synchronization without resetting either draft, an RC-only lightweight resume loader, request-key loading state, accurate completed-history copy, actual host tokens and resume adapter in the fixture, and readable mobile assigned rows. The compatibility branch is documented rather than removed. Automatic choice now explicitly explains that passages are selected to match filters.

158 focused tests passed (84 builder, 39 routing, 7 saved controls, 2 adaptive component, 21 summary, 5 codec). Typecheck and production build passed. Current browser proof at 1440, 390 and 320 CSS pixels showed no horizontal page overflow and readable assigned rows. Keyboard Enter, retained manual selection across modes, empty search recovery, failed preview, and preview-to-simulated-launch consistency were rechecked. The sample launched ID1188 with manual source, unlimited timing and per_passage reveal, matching preview.

Current screenshots: rc-landing-opus55-desktop.jpg, rc-landing-opus55-mobile.jpg, rc-landing-opus55-320.jpg. These supersede earlier fixture screenshots where the root token and synthetic resume copy differed from production. The fixture remains a synthetic scaffold, not the full signed-in application. No production acceptance, publishing, real persistence, screen-reader speech or physical-device proof is claimed. LR implementation and Reading Center RC Recall remain untouched.
