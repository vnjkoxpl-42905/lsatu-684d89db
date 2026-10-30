# Conditional lessons: writing, practice and source audit

Reviewed 2026-10-27 for Joshua's request to improve Groups 3 and 4, AND/OR, lesson/drill titles, inline checks and integration of existing drills/homework. This is an audit and proposal, not implemented or published curriculum.

Comparative source and homework reading was performed by read-only audit agents; host verification below separately identifies direct browser and live-email checks. This report does not imply the host personally opened every PDF page.

## Confirmed decisions

- Students build translations before seeing completed answers: drag or select an idea, place it on the appropriate side, perform the negation themselves and place the other idea.
- Small lesson checks are ungraded, with hints and retries. They do not become completion gates. The existing Unless Drill follows as fluency practice.
- Propose separate lessons for negating AND/OR and building their contrapositives.
- Preserve local/uncommitted status. This new grill-by-Claude invocation authorizes discovery, interview and a reviewed plan, not implementation.

## Current lessons and concrete problems

Groups 3 and 4 are already distinct pages. `openingCoursePath.ts:111–113` and `fullCourseContent.ts:57–73` identify 3.1 exception-language, 3.2 exclusion-language and 3.3 negative-translation. Each has its own following practice. Keep these separate: Group 3 negates the chosen IF idea; Group 4 keeps the IF idea and negates the THEN idea. Share interaction mechanics, not an identical operation.

| Finding | Evidence | Proposed correction |
|---|---|---|
| Group 3 choosing is presented as construction | UnlessLesson.tsx:46–54 switches emphasis while both answers are already visible. | Learner builds first; compare the two complete answers after a checked attempt or explicit reveal. |
| Group 3 checks stop too early | UnlessLesson checks meaning and negating rain, but supplies every later step. | Add small construction, repair, existing-negative, without and until checks beside the distinction being taught. |
| Group 4 demos expose steps instead of eliciting them | FullCourseLesson.tsx:7–9; rendered Group 4 button says “Click here to keep loaned sculpture on the left.” | Ask which idea/side, let the learner perform the operation, then explain their attempt. |
| Group 4 introduction puts vocabulary before the example's immediate decision | Current opening: “An exclusion says two conditions cannot hold together in the stated setting”; purpose jumps to negative links in chains. | Start with what the sentence rules out, ask about the sculpture overlap, then name/define exclusion and teach the two moves. Preserve useful technical terms. |
| Group 4 hides distinctions that its practice needs | Not both, not all and cannot are in one collapsed disclosure. | Teach these as short visible sections with distinct checks before corresponding practice. |
| Correct quiz feedback loses essential reasoning | FullCourseDrill.tsx:108 truncates embedded correct feedback after its first sentence. | Target lessons retain a concise COMPLETE explanation: operation, unchanged idea, readback and relevant limit. Do not impose the change on unrelated lessons without checking their callers. |
| OR takeaway can be read too broadly | AndOrLessons.tsx:172–179 says seeing OR means a missing half requires the other after discussing OR inside conditionals. | Distinguish an asserted A OR B from an OR inside an unactivated conditional. A missing member of an OR trigger does not establish its other member. |
| Negation description says preserve meaning | openingCoursePath.ts and andOrItems.ts describe negating conditions “without changing their meaning.” | Negation makes the opposite claim while preserving subject, restrictions and scope. An equivalent rewrite/contrapositive preserves the original rule's meaning. |
| One AND/OR success explanation omits its conclusion | andOrItems.ts:127–131, ao-transfer-2; AndOrPractice.tsx:81 uses that explanation. | Explain the denied requirements AND conclude that the visitor is not allowed to stay late. |

Current AND/OR builder answer leakage reported in older reviews was not reproduced: initial stem is the sentence, learner arrangement drives the diagram, expected arrangement/readback appears after success/reveal. Do not relabel a historical defect as current. “AND conjoins two conditions” was explicitly selected by Joshua in COPY-CORRECTIONS; keep the term and explain it instead of treating its mere presence as a defect.

Root directly inspected the rendered Group 4 accessibility tree in the local v3 preview. All other comparative findings above were source audits. No new tests or full runtime drill exercise was performed in this planning audit. Earlier implementation tests do not validate these proposed changes.

## Existing components and drills worth reusing

- ContrapositiveVisuals.tsx:153–173: stepwise operation, visible change, English readback, restart.
- AndOrPractice.tsx:146–166: learner-driven side placement and NOT controls. Standard buttons provide a usable keyboard model; no existing drag handlers were found in the conditional feature.
- AndOrPractice.tsx:78–111: attempt, specific hint, retry, explicit reveal after two misses, focus to feedback, and revealed completion distinct from earned correctness.
- AndOrVisuals.tsx:40: typed rule data generates a diagram and English readback. Avoid separate grading and display interpretations.
- FullCourseDrill.tsx:33–63 and fullCourseLogic.ts:169–173: existing formula AST, semantic response checking and equivalent-orientation support. The broad existing editor exposes too much NOT/AND/OR/nesting for an initial two-card task; share its model, not all its controls.
- ConditionalIndicatorsRefresher DiagramDrills: existing embedding hooks and d10–d12 unless/without/until, d13–d16 no/never/not-both/none. Reuse selected cases through a deliberate adapter; do not leak its default persistence into lesson checks.
- Standalone Unless Drill: `/quick-drills/unless-drill`, also in the refresher. Four symbolic statements per round; either valid orientation accepted; starts at 10 seconds and unlocks 5. Use after untimed construction as optional fluency practice. It does not establish understanding of without/until or preserving full English meaning.
- Existing full-course Group 3/4 practice: eight items per set, four quiz questions per lesson. Already includes construction, equivalent orientations and counterexamples. Keep IDs/saved runs; inline checks use separate formative state.
- Sort Drills: optional word-family recall, subordinate to translating whole sentences. Linking drills fit later chaining/application. Negation Station negates an ENTIRE statement and belongs later; do not confuse it with negating one idea or writing an equivalent conditional.

## Homework found and actually read

Primary selected copies are under `C:/Users/Joshu/Desktop/Conditionals - Final Set/`. Its README and `C:/Users/Joshu/Desktop/Conditionals Attachments/_index.csv` document copies from sent email. Originals were not edited, moved or deleted.

| File relative to Final Set | Reading coverage | Fit |
|---|---|---|
| `08 Group 3 (Sep 10)/Homework/2025-09-10_Group3Conditionals.pdf` and sibling `Answer Key/2025-09-10_Group 3 Answer Key.pdf` | Entire extracted text, 17 and 24 pages | 8 idea-negation exercises, 10 translations, 10 paragraph extractions, 5 repair questions. Use staged progression; review keys before grading. |
| `09 Group 4 Worksheet (no key was sent)/Homework/2025-09-10_Group4 Worksheet.html` | Entire document text and HTML notation | 8 idea-negation exercises, 10 translations, 10 paragraph extractions. No sent key documented. Independently derive/validate answers; move mixed cannot-without examples later. |
| `06 Group 3 and 4 Homework PT 1/Homework/2025-07-03_Group3&4 homework PT 1 (1).pdf` and sibling `Answer Key/2025-07-03_Answer key for group 3 and 4 HW  (1).pdf` | Entire extracted text, 1 and 2 pages | Five unless/without questions: Group 3 despite mixed title. Do not file as representative Group 4. |
| `05 And-Or/Homework/2025-07-03_And_Or worksheet (1) (1).pdf` and sibling `Answer Key/2025-07-03_And-OR_ Answer Key  (3) (1).pdf` | Entire extracted text, 1 and 4 pages | Twelve original/contrapositive tasks, including Group 3 and compound negation. Later mixed practice, not first AND/OR teaching. |
| `12 Notes (not homework)/Breakdowns/2025-06-23_Group 3&4 breakdown .pdf` and `2025-09-10_Group3&4 Recap .pdf` | Entire extracted text, 3 and 2 pages | Joshua's contrasting side-of-negation methods. Notes need individual corrections. |

Additional full extracted-text reads under `C:/Users/Joshu/Desktop/Conditionals Attachments/`: `2026-04-05_NegationStationDrill (1).pdf` (8 pages), its answer key (16), `2025-08-12_Conditional homework drill.pdf` (2), `2025-08-27_Linking Drill.pdf` (7) and `Linking Drill PT2.pdf` (11). The citation-only sheet has five sets of five official citations and a duplicate PT119.S2.Q2; no official question text/answers were independently checked.

### Source issues to adjudicate before importing

- AND/OR key repeatedly writes AND for English OR: career OR personal life, math OR science, and other items. Q6 introduces an unexplained third concept for financial independence requiring disciplined saving.
- Group 3 key explanations sometimes disagree with their own correct if/then sentences about negating compounds (Gym Entry p12; similar text pp15,17–20). A policy example also shifts between permission and actual conduct.
- Group 4 tasks sometimes use cannot-without (mixed family), unnamed pairs of audits/revisions, or a single archive-opening prohibition rather than two clear ideas. Sequence/clarify these before beginner use.
- June notes have a correct American -> not attending diagram but prose reverses which condition is necessary.
- Negation Station has separate whole-statement-negation issues. It is not ready for automatic grading reuse.

These are textual/source concerns, not a completed item-by-item adjudication. PDF extraction drops graphical slash strokes. No missing extracted negative mark was treated as a source defect on that basis. Before adopting an item, inspect the rendered source where marks matter, preserve the original, derive the correct relationship independently, test equivalents/counterexamples and record any correction. No answer key is an automatic grading authority.

### Live email provenance verified

Using read-only `gws` Gmail calls, the host fetched the seven primary attachment bytes and compared SHA256 with the selected Desktop copies. All matched. September message `19933b44e890811a`, dated 2025-09-10, contains Group4 HTML, Group3 PDF/key and recap. July message `197d373e7f4784be`, dated 2025-07-03, contains AND/OR PDF/key and joint Group3/4 PDF/key. A 2025-07-01 message contains earlier same-sized filename variants but was not claimed byte-identical without downloading those variants. A broad search returned many unrelated attachment messages; it was narrowed by exact filenames. This is not a complete mailbox audit.

Hash/provenance receipt: `C:/Users/Joshu/AppData/Local/Temp/conditional-teaching-source-audit-20261027/verified-attachment-provenance.json`. Attachment bytes were used for hashing in memory; originals were unchanged. No email sent/modified.

## Loophole sources, kept separate

Followed `C:/Users/Joshu/dev/ai-os/corpus/loophole-online/AI-RETRIEVAL.md`: search, resolve with open, read complete instructions and all pagination/linked blocks.

- Unless Practice Routine: `.../workouts/unless-practice-routine/README.md`, authored spans84–167 and335–337. All3 blocks on one output page, no reported gaps. Ellen selects three of four abstract unless forms, varies letters/forms, practises repeatedly and prescribes speed targets. Relevant as a separate fluency reference. Joshua's existing drill deliberately uses all four patterns and its own timing; do not overwrite that with the vendor prescription.
- Conditional Rehab Routine: `.../routines/the-conditional-rehab-routine/README.md`. All22 returned blocks and canonical linked instructions read, one page/no routing gaps. Unless Practice -> Question Stem Training (3+ sections) -> Acronym LR Section -> Unofficial Diagramming Marathon. Intermediate, 2–4 hours: later optional transfer, not an inline beginner check or completion gate.
- Unofficial Diagramming Marathon: `.../workouts/unofficial-diagramming-marathon/README.md`, authored spans80–117 and283–285. Revisit previously seen questions and actively inspect opportunities to diagram. Fits later transfer after basic construction.
- No separate AND/OR workout was established by bounded searches. This is a search limit, not proof none exists.

Captured written instructions were read; no source media was played. Vendor wording/examples are not approved Joshua lesson copy. Adopt only deliberately attributed procedural ideas, author original examples and preserve Joshua's method.

## Boundaries

No lesson, media, grading key, live assignment or progress record changed in this audit. Copy and interaction examples in the implementation plan are proposals. Final lesson writing, all incorporated source questions/answers, mobile/touch/keyboard behavior, save/resume, and completed/revealed outcomes require verification after separately authorized implementation.
