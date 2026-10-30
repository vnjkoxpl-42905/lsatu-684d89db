# Remaining T10 technical checks

Executed 2026-10-18 against the working branch. These are controlled component regressions with a mocked account controller, not production, physical-device, two-device or learner evidence.

## Automatic RC expiry and reconnect recovery

The prior tests covered standard-budget automatic expiry and failed deliberate Pause/Exit checkpoints. They did not cover automatic expiry with an unacknowledged checkpoint, or expiry using an accommodated/custom acknowledged budget.

Added four cases in `src/components/timed/TimedStandaloneSectionRunner.test.tsx`:

- RC 1.5x budget: 3,150,000 ms.
- RC 2x budget: 4,200,000 ms.
- RC custom acknowledged budget: 2,400,000 ms.
- Automatic expiry checkpoint loses its reply, retains recovery state, withholds close/report, then resumes after deliberate retained-command retry acknowledgement.

Each budget case retains the account budget and selected answer in the checkpoint, checkpoints before closing, exposes the report only after complete authority, and never enters LR overtime. The failure case verifies no premature close/report and exactly one close after recovery. No runtime defect was reproduced, so no runtime change was made.

Command: `npx vitest run src/components/timed/TimedStandaloneSectionRunner.test.tsx`.
Result: **26 tests passed**, including the four new cases.

## What remains outside this evidence

The manual acceptance document remains authoritative for actual screen-reader speech, genuine browser zoom, physical phone/tablet, independently authenticated devices, two authorized actors, and formative learner/competitor tasks. Existing tests already cover disabled creation, expired-writer claim, owner-switch late replies and deliberate save failures; these were not duplicated merely to raise totals. This controlled test adds evidence for acknowledged budget and recovery sequencing, not proof that backend accommodation configuration, network replay or real cross-device concurrency has passed live acceptance. No production flags, records, clocks or backend deployments were changed.

## Final follow-up validation

The integrated component suite passed 819 tests across 80 files before the last network-error wording regression. After that regression, the three affected suites passed 39 tests (26 runner, eight saved service, five saved panel). Typecheck passed. Source/authored/answer-key Node checks passed 18 tests; the separate correction-only CI step now includes nine source/authored tests. Exact final aggregate and build evidence are recorded in PR #222 checks after push, rather than inferred by adding counts.

Independent review cleared the atomic expected-name rename and honest failure wording. The live same-account two-tab conflict/reload sequence is recorded in [CAS rename evidence](rc-t10-cas-rename.md). It is not a physical two-device or two-actor trial. Independent review also verified the LSAC-backed Q10655 restoration, document hash and unchanged E key; the builder import/hashbang syntax error found during that review was repaired before push.

Final local production build passed, including 2,150-question answer-key/index checks (applied key changes: none) and postbuild canonical-content isolation. Existing framework/chunk/CSS warnings remain. The earlier Q10655 identity failure was repaired using only the verified source restoration; the unchanged historical key-authority receipt is still checked.

## Protected-source holdback and final local regression

CI run 39124329175 failed on the attempted official Q10655 prompt restoration: its corrected text no longer matched the protected section's historical frozen source. The prompt change is held from runtime. The PT156 bank and search record have been restored to the previously passing source; builder and key verifier do not apply or normalize the candidate. The LSAC evidence and guarded candidate remain prepared for a coordinated canonical-source version update. No frozen question hash or historical manifest definition was changed to make a test pass.

After holdback, the full workflow regression passed **820 tests across 80 files**. The production build and canonical-content postbuild passed. Answer-key and bank/search/Finder checks passed all 2,150 questions, with no key changes applied. This supersedes the prior intermediate counts and applied-source wording. Actual device, speech, actors, backend fault/concurrency and learner gates remain explicit.

Expanded read-only manifest checks: frozen section-content tests passed 7/7. The historical manifest suite passed 11/12; its raw receipt equality check remains stale. A guarded generated-output comparison found all 59 blueprint definitions, question/passage hashes and queues deeply identical. Only 61 raw-file receipts differ (59 RC banks plus rcSections.ts and rcTypes.ts). No frozen artifact, receipt or test expectation was rewritten to conceal that failure. This expanded suite is distinct from the 820 passing workflow regressions.
