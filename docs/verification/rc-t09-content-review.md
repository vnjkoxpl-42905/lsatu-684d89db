# RC T09 content review, 2026-10-18

This review completes a bank-wide structural pass and a bounded substantive review. It does not certify every existing explanation or fill the missing bank with generated reasoning. Passage text, question wording, answer keys and student records remain unchanged by this work.

## Source and method

Read the T09 criteria and parity ledger in the canonical PLAN, the existing explanation inventory, the selected LSAT teaching voice standard, and the actual review/choice/summary/Markdown pipeline. Parsed every `public/data/rc/RC-PT101.json` through `RC-PT159.json` using Python's standard JSON library. Checked source identities, nonempty content, five-letter choice shape, credited-answer consistency, explanation presence, placeholder strings, HTML/media references, imported percentage bounds and blank walkthroughs.

The original bank SHA-256 (numeric filename order; filename + LF + bytes + LF) was `bd6c7674ed1ce3d3213ea517a2d8dc1222d2cbcbce64f80d863846cda1adf732`, matching the existing inventory. A reviewed summary correction changes the resulting hash; regenerate the inventory after all concurrent content repairs finish. Source presence is not a correctness or teaching-quality score.

## Exhaustive structural results

| Check | Result across the entire bank |
|---|---|
| Files / passages / questions / choices | 59 / 320 / 2,150 / 10,750 |
| Duplicate passage IDs / question IDs | 0 / 0 |
| Empty passage text / question stems / choice text | 0 / 0 / 0 |
| Choice letters not exactly A through E | 0 |
| Credited answer differs from the sole `choice.correct` flag | 0 |
| Imported choice percentages outside 0 through 100 | 0 |
| Passage question counts | 38 passages have 5; 91 have 6; 114 have 7; 77 have 8 |
| Questions with any explanation prose | 1,594 present; 556 missing |
| Questions with all five choice explanations | 1,591 |
| Partial per-choice coverage | Q6216: only C; Q1722: B missing; Q1214: B/C/D missing |
| Standard passage summaries | 316 present; four missing, passage IDs 1760 through 1763 |
| Brief / Another Way summaries | 47 each; 273 missing each |
| Written-explanation flag disagrees with prose | Eight: 5346, 5351, 4895, 5813, 6811, 1998, 10805, 10809 |
| Nonempty headings with empty bodies | Q4153, one block |
| Summary/block/choice text fields inspected for HTML/media/placeholder patterns | 13,046 |
| Script/iframe/video/audio/img/anchor HTML references | 0 |
| Markdown media or HTTP links in those fields | 0 |
| TODO/TBD/lorem ipsum/insert explanation matches | 0 |
| Fields containing four consecutive asterisks | 1,626; inspection candidates, not automatically malformed |

The consecutive-asterisk count is a triage signal. Markdown can interpret some nested emphasis legitimately. Do not rewrite passage text or globally remove asterisks on this count: source offsets and stored annotations require a separate audit.

The 556 missing questions and eight flag disagreements have exact source addresses in `rc-explanation-coverage.md`. PT159 alone has 54 missing question explanations. Missing content remains a content-production backlog, rather than a broken answer-key bank.

## Substantive sample actually read

Read the complete source passages, question prompts, all five answer choices, and every supplied choice explanation for the 22 questions below. This is 110 choices, with authored explanation prose in 19 questions and no prose in three. Also reviewed the standard summary for passage 218, comparative summary for passage 168, and all three summary styles for passages 1680 and 1682. This sample spans standard/comparative, older/recent bank entries, difficulty 1 through 5, Big Picture/Stated/Implied/Beyond Passage tasks, detailed walkthroughs, choice-only explanations and missing explanations. It is a deliberately stratified diagnostic sample, not a representative error-rate estimate or all-question teaching approval.

| Source | Questions | Review outcome |
|---|---|---|
| PT139 S3 P1, passage 218, Improving Farm Economics | 2371 through 2377 | Credited answers align with the passage. Q2372 correctly explains why customer requests do not necessarily prohibit chemicals. Q2375 D correctly combines the minimum-ten rule with the only-requested-crops rule. Three questions lack explanation prose. Summary and several distractor explanations need the corrections below. |
| PT157 S1 P2, passage 1730, Descriptivist Grammarians | 10489 through 10494 | Credited answers are supported. Q10491 distinguishes an unsupported claim from overwhelming contrary evidence; Q10492 C cites the word-origin example; Q10493 D correctly identifies both groups' recognition of change. Some distractor explanations turn absence of support into unnecessarily categorical claims. |
| PT123 S4 P2, passage 168, The Capacity for Music | 687 through 692 | Credited choices fit the shared question, music/emotion overlap, adaptive-value disagreement, brain-size overlap, modern-behavior evidence and divergent conclusions. Imported highlight references and paragraph addresses are not consistently usable in the current reader. Q689 D loses an important qualifier. |
| PT158 S1 P1, passage 1680, Deep Well Injection | Summary styles only | Standard/Brief capture the three risks, but Another Way adds unsupported events, stronger certainty and invented motives. Another Way was rewritten against the passage; questions in this passage are not counted as substantively reviewed here. |

| PT158 S1 P3, passage 1682, Plagiarism | 10100, 10102, 10105 | Reviewed the complete comparative passage, all summary variants and all five explanations for this question. Repaired unsupported attribution to Rosenthal in B, the wrong support location for the credited answer, and the misleading account of A paragraph 2. |

## Confirmed content findings and disposition

1. **PT158 p1680 Another Way, corrected in this change.** The source says a casing gap threatened an aquifer, and underground accidents can remain undiscovered. The summary turned that into a specific event that nobody noticed for ages, asserted there was no better affordable alternative, and used invented motives and outcomes. The replacement distinguishes threat from actual contamination, preserves uncertainty and describes the author's prediction of increasing use. Only the `anotherWay` summary string was changed. It does not alter text, question records or keys.
2. **PT139 p218 Standard summary.** The source says harvesting accounts for 50 percent of production cost; the summary says the plan slashes half the usual harvesting costs. Those are different quantities. Replace with the stated production-cost relationship. The main-point summary should attribute profitability to Whatley's claim and retain smart management/hard work and practical conditions rather than present success as established.
3. **Q2375 B/C and Q2377 C.** B offers a speculative supermarket-convenience/price-elasticity story that the passage never establishes; the reason to reject is that long-term profits after increasing prices are unknown. C changes a distance of 40 miles into a 40-minute drive. Q2377 C's explanation drops the answer's important claim that one center supports at least fifty farms, shifting the explanation to whether any 25-acre farm could exist there. Explain why 1,000 members per farm and a population of 50,000 do not establish fifty viable memberships, suitable land and conditions.
4. **Q687 C / Q688 B, unavailable highlight references.** Correct explanations depend on 'the highlighted passage', but this bank does not supply those highlight anchors. Replace with actual A/B paragraph references and the relevant relationship. Q687 D cites A paragraph 1 for neurological systems, which is paragraph 2; Q687 E places the performance contrast in paragraph 3, but it is paragraph 2.
5. **Q689 D, qualifier loss.** The source A says music had *little adaptive value of its own* and most likely developed with language. The explanation says it *does not have adaptive value*. Keep the weaker claim; the answer's *great* adaptive value is what separates the authors.
6. **Q10493 B/E and Q10494 E, categorical shortcuts, corrected here.** 'Oppose prescriptivism across the board', 'opposing schools, not collaborators' and 'different conclusions' overstate what is needed. The relevant defect is that the passage never attributes the specific endorsement, success-measurement dependency or observation claim. Opposing schools can collaborate or share observations. This is a reasoning-quality repair, not an answer-key change.

7. **PT158 p1682 Brief/Another Way and Q10105, corrected here.** The summaries invented Kewes reviewing and rejecting Rosenthal's book, attributed shoddy projection of modern ideologies to that book, and misgendered Rosenthal. Passage B never names Rosenthal. Replaced those summaries with the actual moral-judgment/historical-reconstruction distinction. Q10105 B now cites A paragraph 1; A acknowledges the moral-exclusion criticism while distinguishing the stem's target; D correctly attributes fluidity to B paragraph 1; E attributes bad-history reasoning to B paragraph 3.

Findings 2 through 6 were subsequently repaired in the owning bank files. PT139 passage218 summary now preserves the production-cost quantity, attribution and conditions; Q2375 B/C and Q2377 C reject unsupported outcomes without invented travel time or supermarket behavior. PT123 explanations now cite actual A/B locations and preserve little-versus-great adaptive value. PT157 categorical shortcuts were replaced with the precise absent claims. PT158 Q10100 E and Q10102 B were also corrected to distinguish moral evaluation, historical reconstruction and endorsement. Parent independent review and final authored-field validation establish release disposition.

## Rendering repairs made here

- `RcReviewLayer` now explicitly names missing per-choice explanations when coverage is partial and keeps the contextual tutor-draft action available. Previously one authored choice could suppress the whole-question missing state while four choices silently lacked reasoning.
- Blank walkthrough bodies are filtered before disclosure rendering, preventing Q4153's heading-only block from becoming an empty expandable shell or the automatically opened first block.
- Walkthrough buttons now connect to their rendered panels with `aria-controls`.
- Added a regression covering the partial A/B/D/E case, omission of a blank block and the panel association. Targeted command `npx vitest run src/features/rc/components/RcReviewLayer.recovered.test.tsx` passed all seven tests.
- Added optional typed question media with native controls, no autoplay, explicit playback speed, video caption metadata and readable transcripts. Unsafe URL forms and missing accessibility metadata prevent loading; supplied transcripts remain available when video captions are missing. Load errors retain transcript access.
- An existing bare MP4 URL at the beginning of p1682 Standard summary is now recognized as legacy media and gets the honest unavailable state because caption/transcript metadata is absent. The URL is not fetched automatically.
- Added `scripts/verification/rc-t09-browser.html` and `.tsx`, a deterministic actual-component fixture using real bank Q6216. It makes no account writes and can run in the Codex browser through the normal Vite server. Browser proof and integrated checks belong in the parent T10 acceptance record; this report does not substitute jsdom for browser evidence.

## Media and completion boundary

No bank passage or question has typed media metadata. A follow-up exhaustive bare-URL search found one legacy MP4 reference at the start of passage1682 Standard summary; the initial Markdown-link/HTML scan did not detect a bare URL. This correction matters: the bank does contain a media reference, but no captions or transcript metadata. Optional accessible playback support is now implemented and tested; no external media file was fetched or invented, and playback/caption synchronization is not proven without a real accessible asset. Missing media production remains separate from player support.

The coverage inventory, honest missing/partial states and this substantive review are complete for the exact scope above. A blanket claim that all 2,150 explanations are teaching-approved would be false. Missing-content authoring and review of the remaining 2,128 questions require tracked content-owner work; the sample findings demonstrate why bulk generated reasoning must not be marked approved automatically. Media production remains separately budgeted under the plan. Learner trials and actual assistive-technology use remain T10 evidence, not conclusions from prose inspection.

Final targeted checks: 14 tests across RcExplanationMedia, RcReviewLayer.recovered and RcPassageSummary passed. Typecheck passed after the media addition. Browser fixture partial notice, explanation Enter activation and summary Enter activation were verified by the parent reviewer in the Codex browser. Missing-caption transcript fixture is available for its final readback.

Independent cross-review: read the other reviewer's changed choice-explanation bodies against the actual source passages across PT101/110/120/125/129/132/139/145/149/151/155. Most repairs correctly narrowed false absence claims and restored qualifiers. Corrected Q3031 E to retain normally in the source conditional. Corrected Q3032 E to explain the stem's both-together-but-not-individually requirement, rather than declare the environmental counterfactual unsupported by B. This cross-review does not expand the substantive all-question sample count above.

Synthetic media browser fixture uses a locally generated two-second, 320 by 180 navy video with no audio and an explicitly synthetic WebVTT caption/transcript. It is not authored LSAT content, imported media, evidence of instructor coverage or a claim of real caption synchronization. The parent reviewer generated the video and owns native playback/browser proof.

Final independent cross-review also corrected Q10102 A/C: B defends historical reconstruction rather than warning against historical study itself, and it explicitly acknowledges shoddy historical scholarship. Both distractors now fail on the actual task, without those false absence claims.
