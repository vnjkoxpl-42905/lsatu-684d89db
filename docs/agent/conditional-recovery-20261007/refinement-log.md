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
