# Conditional opening: what changed and what remains to check

Date: 2026-10-07. Local checkout: `C:/Users/Joshu/dev/ai-os-projects/lsatu-conditional-bootcamp`. This record describes local implementation and Joshua's corrections. It does not certify publication, production persistence, learning outcomes or an identical writing voice.

## The lost local build was recovered before revision

The recovery restored the documented source generation and verified all 47 final files against preservation hashes before the new edits. The source bundle remained unchanged. The main app checkout was kept separate. [Recovery scope](README.md), [hash verification](hash-verification.json), [preview launch diagnosis](preview-launch.md).

The earlier [opening audit](../../../../../ai-os/brainstorms/2026-09-30-conditional-curriculum/2026-10-03-astra-learning-review.md) and retained handoff supplied the six corrections. They were implemented locally: denial of permission rather than non-entry as a counterexample; fresh final originals with negative conditions; a written translation before supplied labels; explicit mixed practice progression; a compact four-case recap; and truthful hidden-family wording. Nine notes/four labs and 25 cards remain. The six original final items were retained and three negative originals appended.

## Practice now combines the skills in one sequence

Joshua replaced the interim three-section mixed lab with one question visible at a time and a progress bar. The local baseline has 24 questions across five learning stages. It reuses exactly seven reviewed single-rule Activity diagrams, d1/d2/d3/d5/d6/d7/d8, and six mixed-family sentences rather than importing the full Activity set. There are no newly imported chains, compound transformations or Groups 3/4 in this opening.

The runner separates first checked answers from corrections. Feedback names the meaning lost by a wrong choice. Error mapping uses the selected option, rather than assuming every error within a stage is the same. Fresh confirmation cases are distinct from the exposed answer. An obligation/compliance error receives another obligation case, instead of an unrelated general equivalence question. Written translations are compared by the learner; the runner does not claim to grade their correctness automatically.

Final local runner/browser checks passed within the bounds listed below. Its answers remain local session state; no production attempt-history or backend recording integration was added.

## Copy must show the learner's decision

Joshua rejected generic labels such as “same rule, different words,” “equivalent-rule comparison,” “find the requirement, then place it,” “read the whole idea,” “first choose the complete target,” and “Keep the complete condition.” He wants the reasoning and the immediate action made concrete.

Local replacements ask who receives a wristband, which kind of key is needed to open a cabinet and which kind of pass entry requires. Worked explanations show why before noon, current and with yellow tags matter. Dropping those words broadens the conditions. Reversing the relationship promises something the original did not establish. Permission stays distinct from entry; required attendance stays distinct from attendance that happened.

The final flow revision is implemented: the landing is titled Conditional translation practice, with a short purpose and Start practice. Question/stage totals and the long stage list were removed from that landing. Each stage introduces its immediate purpose and instructions before the learner continues to its questions. The progress bar pulses gently; reduced motion gives a static bar. Parent checked the rendered landing and stage intro in the Codex browser. [Durable copy corrections](../../../../../ai-os/wiki/COPY-CORRECTIONS.md), [selected voice standard](../../../../../ai-os/references/lsat-teaching-voice-standard.md).

## The loading failure and access gate have separate causes

The composition referenced an Activity module before it existed, causing a failed development import. Startup preflight and safe lazy import recovery address that local load path. BootcampGate now redirects a signed-out visitor through the normal auth return URL, retaining route, query and hash; it still enforces assignments for signed-in students. Parent browser verified the normal lesson route reaches auth. No access grant or auth bypass was added.

The local preview remains on port 8097. Browser work is restricted to the Codex in-app browser. The preview harness does not certify authenticated production state. No commit, push, production merge, publication, backend write or Lovable credit spend has occurred in this refinement work.

## Evidence remains bounded to the tested version

- Recovery evidence: [47-file verification](hash-verification.json).
- Relevant source regressions: `src/components/hub/BootcampGate.test.tsx`, `src/bootcamps/conditionals/components/ConditionalOpeningLesson.review.test.tsx`, `ConditionalReferenceSequence.test.tsx`, `ConditionalLessonNote.test.tsx`, `OpeningMixedDrill.test.tsx`, and `src/bootcamps/conditionals/content/mixedDrillItems.test.ts`.
- Earlier scoped checks passed during development, including four auth-gate tests and the 60-test copy/data pass. Subsequent changes mean these counts are historical snapshots, not final current-tree certification.
- Final tests passed: 237 tests/19 files in serial session 86823, plus 11 assignment tests/one file in an isolated exit-0 run, totaling 248 tests/20 files. The earlier concurrent session 92462 returned 247 passes, one timeout and a Vitest RPC failure under CPU/build contention. A serial rerun passed the same eight runner tests without assertion or source changes to accommodate that timeout.
- Full app TypeScript preflight `--check` passed, session 88051 exit 0. Direct Vite build passed, session 17236 exit 0: 7,160 modules, 1m16s. Canonical exclusion passed across 770 dist files. Scoped ESLint of 13 source files returned 0 errors and 10 existing Fast Refresh warnings.
- The recovery overlay has 31 source changes compare-before-write verified and a 65-file inventory. The original recovery's 47 source files matched their recorded hashes before revision.
- Codex browser verified launch to stage intro to Begin question, wrong qualification/reversed-arrow repairs and the transition after three questions to the next stage's Continue control. Wrong-answer checks partly preceded the final stage-intro layout; the question engine was unchanged. Actual 320px viewport had 305px scrolling width and visible buttons at least 44px; actual 768px viewport had 753px scrolling width, with no horizontal overflow. Sidecar/wide views were also observed, approximately 996px and 1543px. Reduced-motion pulse computed as animation none.
- Final screenshots: [landing](C:/Users/Joshu/.codex/visualizations/2026/10/07/01a117ea-7c95-7813-af3b-866b05ec963a/conditional-landing.jpg), [stage intro](C:/Users/Joshu/.codex/visualizations/2026/10/07/01a117ea-7c95-7813-af3b-866b05ec963a/conditional-stage-intro.jpg).
- The normal lesson route was checked signed out through its auth return flow. Authenticated production persistence and empirical learning outcomes were not measured. The local checkout is detached at an older baseline; integration with current main has not started.

## Ideas to evaluate later, not promised work

These suggestions are not new task-ledger commitments:

- Check delayed retention with another fresh set after a gap, rather than assuming an immediate corrected answer shows durable learning.
- Calibrate individual questions and feedback with real student attempts. Source logic review cannot establish difficulty, clarity or learning effectiveness by itself.
- Consider production attempt/history integration for the local formative runner. That needs a separate data contract and review of existing student-work preservation; no backend work was performed here.
- Verify touch and keyboard behavior on real devices. Emulated viewports and desktop interaction do not certify real phone/tablet hardware or assistive technology.

Task statuses remain unchanged. A production merge and publication require their own concrete verification and release record.

### Final summary wording follow-up

The final summary now says “You answered X of 24 correctly on your first try” instead of “first checks matched the answer.” Fresh-case results distinguish a correct first try from an answer corrected after reading feedback. Written translations remain explicitly learner comparisons, not automatically graded answers. This changes copy, not scoring behavior.

All eight runner regressions passed again after that summary change, session 15397 exit 0. These repeat tests overlap the earlier 248-test set and are not added to its distinct-test total. The regenerated production build passed after the final wording change: session 3104 exit 0, 7,160 modules, 48.53s. The latest canonical exclusion check passed across 770 dist files, checkpoint 8fad43. No release or task status changed. Final result remains local and unpublished.

### Impeccable audit after the refinement

[Full audit, 2026-10-07](impeccable-audit-20261007.md): 13/20, Acceptable; one P1 and five P2 issues. A separate Codex browser tab traversed all 24 main questions, one adaptive follow-up, summary, review and reload. Source and rendered evidence identify faint course labels, session-only saving ambiguity, an inaccurate Review practice action, a 14px independent-stage sentence and nested containers, small drawer controls, and mechanical prompt wording. The earlier broad target-size claim is narrowed to sampled exercise controls; the drawer close is 16px square. No source code changed and no tests were repeated for this audit. Recommendations and remaining physical-device, assistive-technology, theme and text-resize checks are in the report. Task statuses and release state unchanged.


### All six audit fixes, polish, then fresh audit

Implemented the original six findings, then ran Impeccable polish and a fresh audit in the requested order. [Final report](impeccable-polish-audit-20261007.md):16/20 Good, no P0/P1/P2 and one P3 secondary mobile typography item. Final build passed 7,160 modules in 55.07s;258 distinct tests covered, including an isolated timeout rerun, and 18 affected tests passed cleanly after final copy changes. Scoped lint zero errors, one existing warning. Full app startup typecheck passed. Codex-only flow and responsive evidence is in the report. Eleven delta files and a 65-file inventory were hash-preserved separately; prior recovery snapshots remain immutable. Local/unpublished, no task-status or backend changes.

### Remaining audit implemented and independently reassessed

[New report](impeccable-audit-implementation-20261007.md): 18/20 Excellent, no confirmed P0-P3 findings in the scoped pass. Fixed secondary metadata and text-enlargement overflow, implemented scoped light/dark support, memoized retained questions and kept atomic feedback present. 28 affected tests, full app typecheck, changed TSX lint and final build pass. Codex browser verified both themes, actual viewport matrix and root-font 200% enlargement. Physical screen-reader/device profiling remain unverified; 20/20 is not claimed. Four-file source delta and 65-file inventory preserved; local/unpublished, task ledger unchanged.

## 2026-10-07: Remaining keyboard defects fixed

Fixed Compare/retry/diagram focus loss and persistent atomic diagram feedback. 19 affected tests, full app typecheck and direct Vite build passed. Complete Codex browser session plus fresh case and review verified under 6x CPU simulation. Independent review clear. See impeccable-final-keyboard-audit-20261007.md. Score remains18/20 because actual screen-reader/device evidence is unavailable. Seven-file delta, 66-file inventory preserved in keyboard overlay. No release/backend changes.

## 2026-10-08: Teach the arrow before the foundation drill

Joshua explicitly reordered opening steps4and5. Read the must arrow is now step4; Enough, required, or still open? is step5. The shared path updates the course list and Previous/Next navigation. Existing order regression updated; all19course tests passed. Local recovered checkout only.

## 2026-10-09: Explain sufficiency through law-school enrollment

- Replaced only the sufficient reference section with the user-approved law-school enrollment/student relationship. Shared raffle teaching elsewhere remains existing content.
- Added definition, enough-for explanation, rule/fact/conclusion breakdown, guarantee reasoning, a nested student-group figure, absent/reversed-fact comparisons, noncausal distinction, a short necessity bridge, and three feedback checks including medical-school near transfer.
- Capitalized the dedicated sufficient page title and updated its summary. Scoped lesson styles use existing theme tokens and stack on narrow layouts.
- Source basis: three archived Demon sources; Loophole method library; saved 7Sage research; selected teaching-voice standard. Interview/source ledger: C:/Users/Joshu/dev/ai-os/brainstorms/2026-10-09-sufficient-condition-lesson.md.
- Validation: 46 tests across ReferenceSequence, OpeningCourseContent and OpeningCourse; full typecheck; npm build including content checks and postbuild verification. All passed. Existing build warnings remain.
- Codex IAB: checked all three wrong/correct paths, keyboard correction and retry focus; no recorded console errors. Responsive DOM geometry at actual 320, 400, 960, 1200 and 1600 CSS widths; no document horizontal overflow; narrow comparisons stack. Temporary viewport reset; preview remains open at the lesson beginning.
- Screenshot: C:/Users/Joshu/.codex/visualizations/2026/10/07/01a117ea-7c95-7813-af3b-866b05ec963a/sufficient-condition-expanded-20261009.jpg.
- Read-only independent source/integration review found no material issues. Local preview only; no commit, push or publication. Necessary is still next, but its expanded rewrite is not included in this pass.

## 2026-10-09: Kling clips and learner-controlled motion

- Generated and embedded two 15-second 1080p narrated clips; cost 360 credits, confirmed balance 106. Native controls, captions, transcripts and failed-load recovery. Originals preserved and public versions optimized. Final audio transcription matches intended scripts.
- Ivory/ink/brass scope replaces pale green. Dynamic group membership explains guarantee versus open possibilities; rule/fact/inference reveal is controlled by the learner. Existing approved explanation and three checks preserved.
- Independent reviewer found remounted live region; fixed persistent region and added regression coverage. Final 32 tests, full typecheck, full production build and postbuild content check pass. Existing app build warnings remain.
- Codex IAB verifies both videos/caption readiness, keyboard reasoning/replay, three case states and wrong/correct/retry feedback. 320/400/960/1200/1600 widths have no horizontal overflow and all lesson buttons meet 44px targets. Contrast verified; no console errors observed.
- Impeccable polish followed by provisional 18/20 technical audit; outstanding actual assistive technology, devices and slow-network checks recorded in media/README.md. No perfect release-acceptance claim. No commit/push/deploy.
- Screenshot: C:/Users/Joshu/.codex/visualizations/2026/10/07/01a117ea-7c95-7813-af3b-866b05ec963a/sufficient-motion-desktop.png

## 2026-10-09: Define sufficiency before applying a case fact

- Latest Joshua correction removes Enough for what? and fact-first Maya teaching from sufficient. The page now explains trigger, guaranteed outcome and complete conditions through sentence-part exploration and an original interactive SVG group illustration. Three conceptual checks replace individual-case checks; brief necessity bridge preserved.
- Full ingested LSAT Lab Conditional Logic transcript located at ai-os/raw/sources/lsat-lab-lectures/16784/source.en-US.vtt. Opening role explanation, saved Demon sources and selected voice standard guide the revision. Trigger remains a logical metaphor, without causal or temporal claim.
- Both existing Kling clips are preserved and relocated to reference7/missing-requirement with explicit application context. No new spend. Actual player and captions load there.
- Final52 tests, full typecheck, npm build/postbuild pass; independent review found no material defect. Live Codex selection/feedback/retry and actual320/400/960/1200/1600CSS widths pass with no overflow or undersized lesson buttons. Default docked view inspected. Viewport reset, sufficient page retained. Local only; real-device, screen-reader and production checks remain open.

## 2026-10-09: Explanation before participation and coaching voice

Revised sufficient lesson starts with Sufficient means enough and explains the guarantee through law-school enrollment before presenting controls. Replaced procedural wording with direct explanations of what has to be true. Two closing questions now have distinct jobs: interpret sufficiency and distinguish enough from the only way. Necessary-condition bridge follows them. Noncausal distinction is a subordinate aside. Comparison controls and SVG now visibly change, including an explicitly excluded hypothetical exception; stable live regions and reduced-motion behavior retained.

Verification: 52/52 focused tests, full typecheck, full npm build and postbuild check passed. Independent source review found no material defects. Codex browser verified keyboard response, excluded/allowed diagrams and actual CSS widths 320/400/960/1200/1600 without horizontal overflow. Temporary viewport reset. No browser console errors observed. Existing build warnings remain. Local preview only; no commit, push, deployment or additional Kling generation. Physical-device and screen-reader speech acceptance not performed.

## 2026-10-10: Trigger reveals the guarantee

Joshua's four marked corrections: define sufficiency before the example using archived LSAT Lab/Demon sources; trigger alone before activation; conditional-specific wording instead of sentence commentary; replace unrelated cause aside. Implemented definition of enough on its own and guaranteed certainty, outcome-specific aside, reveal/reset interaction with reduced-motion equivalent and focus restoration, and conditional-specific figure feedback. Source pointers: LSAT Lab16784 VTT00:33-01:04; three saved Demon source pages. Initial/revealed/reset browser states verified; widths320-1600 have no horizontal overflow. 53 focused tests and full typecheck pass. No commit/push/deployment or paid generation. Full build receipt: media/trigger-reveal-build.log.

Review follow-up: independent reviewer found sufficient page CSS leaking onto later mounted lessons. Scoped selectors to visible course body. Codex navigation sufficient -> necessary -> sufficient verified selector true -> false and retained reveal/reset. Full final build receipt is media/trigger-reveal-final-build.log. Existing warnings only; no broad cleanup.

## 2026-10-10: Whole-page information and flow review

Reviewed complete sufficient page against original HTML and archived Lab/Demon teaching points. Consolidated definition/certainty, explicitly distinguished hypothetical conditional from actual enrollment, removed repeated grades/graduation aside, added both possibilities when enrollment is absent before group explorer. Two checks now cover transfer/direction and absence leaving result open. Walkthrough copy distinguishes enough/certainty/direction; group highlight explicitly one possible outside-enrollment case. Brief necessity bridge avoids reteaching. 53 tests and full typecheck pass; independent review found no material logical/coverage issue; live reveal and outside-group feedback verified. Full build receipt: media/full-page-flow-build.log. Local only; no commit/push/deployment or media spend.
