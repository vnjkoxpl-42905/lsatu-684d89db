# Local checks of the expanded Conditional Bootcamp

Checked 2026-10-25 in the isolated `lsatu-conditional-full-20261025` checkout. This is not a production release or signed-in acceptance report.

## Source and teaching checks

The owning source audit is [authored-coverage.md](./authored-coverage.md). It maps all 30 existing units to their explicit primary or supplementary homes. New Chapters 3–7 contain 25 lesson homes, including one optional nesting extension, 100 quiz items and 23 productive sets containing 145 items. These are authored-task counts, not mastery or independent transfer counts.

Chapter 3 is explicitly **Group 3 and Group 4**. Its methods preserve either complete idea as a valid starting point. Until retains the time boundary; prohibition does not establish compliance; not-both permits neither; not-all does not mean none. Seven quiz contexts repeated from demonstrations were replaced. Three integrated necessary-assumption tasks now apply the precise negation test to actual arguments.

The saved teaching standard is the approved Contrapositive lesson template in the vault's `bootcamp-builder/references/teaching-preferences.md:181–225`. New lessons follow definition and example, purpose, supporting film, two steps and two learner-controlled demonstrations, error comparisons, habit, and four-item Pop Quiz. Missing source documents and unavailable official questions were not reconstructed.

## Completed automated checks

- TypeScript app check passed again after the final small presentation changes.
- Initial and subsequent production builds passed, including canonical content guards. The dev-only preview route is intentionally absent from production. Stable walkthroughs therefore use a second local dev preview with HMR disabled and generated media excluded from its watcher; it is not a production preview.
- New authored semantics, logic and coverage: latest 78 tests passed in three files, including an audit of all 300 generated quiz options and regressions for grammatical negation.
- OpeningCourse, FullCourseLesson and FullCourseDrill: 70 tests passed in three files, including read-only prior-completion projection, all 25 lesson layouts, lazy transcript behavior, blank productive answers and plain quantity wording.
- Legacy OpeningMixedDrill and ConditionalLessonNote: 24 tests passed cleanly, exit 0, no unhandled RPC errors. See `docs/conditionals/verification/2026-10-25/legacy-ui-yield-final-tests.log`. Test-only event-loop yields and two longer traversal budgets resolved the earlier Vitest worker starvation; assertions were retained.
- Repaired legacy routes, Chapter 2 inventory, and foundation-feedback expectations passed their focused reruns. The earlier broad run itself was not clean and must not be reported as an all-pass broad-suite result.
- Assignment/edition, account isolation, scoped progress, historical targets and Unless deadline/save tests have separate focused proofs. None creates a live learner assignment or verifies production RLS.

## What was actually checked in the browser

The Codex app was asked to open the localhost preview. Ambient app state shows that preview open. Automated browser tools exposed the connected **Chrome extension**, not the Codex in-app browser, so the interaction and screenshot checks below were performed through Chrome against the same localhost application. They must not be described as automated Codex-browser or signed-in production acceptance.

- At 683 × 858: corrected Chapter 3 heading and stacked course-card actions; Group 3 definition and contextual disclosure; wrong answer gives a hint without revealing the model; correct answer advances quiz progress; refresh restores checked answer and progress; productive sides start blank.
- At 390 × 844: Group 4 definition/example and learner-driven two-step demonstration; quantity construction with blank member choices; true/false counterexample construction; no horizontal document overflow in the checked screens.
- At desktop width: direct-chain construction and a hidden chain that requires the second rule's contrapositive. The wrong-order/incorrect-direction attempt keeps Next disabled and offers a hint before explicit reveal. Replacing the last rule with its contrapositive is accepted; progress becomes 50% after the third resolved question.
- Quantity example: all four people made club members refutes the proposed not-all conclusion, receives the specific explanation, and advances to 17%.
- Counterexample example: licensed kayak with no beacon is accepted as violating the universal rule, with its specific explanation.
- Completed all four Group 4 quiz items in the browser. The lesson then displayed Done on the course board and course completion became 1%; the separate drill remained Not started.
- Emulated prefers-reduced-motion through the supported tab developer capability: Pop Quiz title and sweep computed animation names were none, and sweep display was none. Cleared the media emulation afterward.
- At 390 × 844 using keyboard activation: constructed both directions of the ticket/renewal biconditional, accepted at 17%; constructed labelled-item → stored-item to close the woven-mat argument, accepted at 17%. Neither editor supplied the learner's answer in advance. Some pointer activations in the emulated phone viewport were not observed to take effect; keyboard activation and desktop pointer flows were checked separately. This is not complete touch-device acceptance.
- Group 4 video: browser reported readyState 4, playback time advanced, and English captions were showing. Audio was stream-probed, not independently listened to. Initial phone inspection found tiny paragraph text; the media template was changed to concise, large visual cues and complete condition diagrams. All 25 films were rebuilt and passed final source, asset, composition-hash and stream checks. The host read the encoded contact sheet. A square letterboxed player at narrow widths leaves native English captions below the instructional diagram, verified in actual phone-width playback. Full-duration listening of all films was not performed.

Screenshots are retained outside the checkout under `C:/Users/Joshu/dev/ai-os/handoffs/conditional-full-20261025-build-review/`, including `chapter3-docked.png`, `group3-refined.png`, `group4-phone.png`, `quantity-phone.png`, `counterexample-phone.png`, and `chain-contrapositive-desktop.png`. Screenshot labels alone are not evidence of the viewport: compare the actual image and associated browser readback. Development HMR reloads during media updates interrupted some attempted captures; those interrupted captures are not acceptance evidence.

## Still separate

Fresh Claude finished-code inspection is pending. Final media synchronization and the post-pagination production build passed. Production assignment/RLS behavior, signed-in save failure/recovery, every wrong-answer path, full read-aloud calibration and complete human viewing of every film are not certified by these checks. No commit, merge, push or publication has occurred for this expansion.

## Final AND vs OR correction

Lesson 2.1 now has three internal pages: AND, OR, and The contrapositive. IDs and quiz persistence keys are preserved. The first two pages cannot activate scroll completion. The third page explicitly negates every member and switches AND/OR while reversing the complete sides. The recap and quiz remain on page 3. Desktop 1218px and phone 390px screenshots were actually read; the smaller plain heading and separate pages are visible. The reverse, negate and switch demonstration was exercised through all three steps. Latest OpeningCourse and registry tests: 42/42 passed; the separate Chapter 2 pagination tests: 39/39 passed. Final TypeScript and production build both passed after pagination.

## First independent inspection corrections
Claude inspection1 returned REVISE with nine findings. The student query now selects source_table. Teacher v3 assignment creation is behind an explicit default-off release flag and centrally blocked before writes until released. Compatible uncontextualized routes prefer v3; explicit assignment context stays authoritative. Scoped staged and flashcard caches do not read or overwrite historical or other-account keys. Ordinary review preserves completed credit; changed item signatures reopen it. Own-topic practice is accessible through its primary skill; only explicitly cumulative sets retain all-topic gates. A duplicate quantity case was replaced. Registry eligibility is mechanically checked against actual access and route test titles follow AND vs OR.
Post-fix source import and semantic/access checks passed67/67; scoped-cache/completion regressions22/22. Final TypeScript and production build passed on the corrected source. All23 sets and media scripts remain unchanged in count; domain/trigger practice is now focused on its primary operation. No new release or production-policy claim is made. A second fresh inspection is still required.

Final integration fix rerun: all six affected suites144/144 passed, exit0 with no RPC errors, including realistic query projection, teacher default-off guard, no-write/no-notification assertion, shared-step edition choice, current route titles and mechanically checked registry eligibility. See docs/conditionals/verification/2026-10-25/inspection-round1-integration-clean-tests.log. Parent course-screen39/39 also passed after preserving started-on-arrival separately from the page3 completion observer. Final source freeze includes that correction.

## Final review state and bounded corrections
The second fresh Claude inspection returned REVISE after confirming first-round fixes. Five accepted findings were repaired: compatible Resume and revise preserves credit; account-only prefixed tool drafts restore; historical old-edition staged/indicator keys stay historical; empty supplementary sections are hidden; invalid expanded assignments display a recoverable teacher-update notice and grant nothing. One copy-change finding was rejected by exact git baseline comparison: main6a167c85 already contains both current foundation-feedback phrases. Only stale test expectations changed.
Final affected proofs:11/11 edition/deck,113/113 assignment/routes and41/41 course-screen tests passed. TypeScript passed. Two inspections and two fix rounds exhausted the agreed budget; these final fixes are tested but have NOT received a third independent inspection. Do not label the final snapshot independently approved. No production release, RLS acceptance, live assignment or all-answer-path certification is implied.

Final post-round2 production build/postbuild passed, exit0; incidental generated MCP stub restored. Final source remains uncommitted and unpublished. No further independent inspection was performed.

## 2026-10-25 AND/OR wording and scenario-chart correction

Joshua rejected whole group and full group as clunky and requested a checkmarked scenario chart. Written lesson2.1 now says Identify the two conditions and Check which conditions are met. Both four-row charts use text plus green Met checks and Not met labels: AND succeeds only when both documents are shown; OR succeeds for either or both. An unmet sufficient condition does not imply no library card, explicitly explained. The unknown-versus-false checkpoint remains. Adjacent drill is Check AND and OR; IDs and quiz keys unchanged. Shared quiz helper wording corrected without changing logical formulas.

Focused tests70/70 passed (55lesson/teaching/items plus15routes). Final TypeScript/build/postbuild and diff-check passed. Actual localhost desktop1218, phone390 and docked683 images read; phone/docked document widths375/668 respectively, within viewport. Browser was connected Chrome extension, not automated Codex in-app browser. Proof screenshots in handoffs/conditional-full-20261025-build-review/scenario-charts/. Existing recap audio/VTT/transcript retained and still contains the historical phrase; no media rewrite claimed. Five teaching-preference mirrors synchronized plus COPY-CORRECTIONS, no native memory update.

This subsequent requested UI change is outside the preceding scoped Claude approval snapshot. No fresh independent review, commit, push or publication was performed. The two previously reported progress follow-ups remain separate.
