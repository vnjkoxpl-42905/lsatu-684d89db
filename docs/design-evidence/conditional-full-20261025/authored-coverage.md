# Conditional curriculum: authored coverage and teaching review

Date: 2026-10-25. Scope: source reading and authored Chapter 3–7 data in this isolated checkout. This is not publication, signed-in acceptance, or a claim that all source archives were recovered.

## What was actually checked

Read the canonical teaching voice, the LSAT teaching voice standard, COPY-CORRECTIONS and the full bootcamp teaching ledger. The exact approved Contrapositive template is in `C:/Users/Joshu/dev/ai-os/.agents/skills/bootcamp-builder/references/teaching-preferences.md:181–225`: meaning and example; purpose; supporting film; numbered procedure and two learner-driven demonstrations; tempting-error comparison; habit; four-item Pop Quiz. New content uses that structure rather than inheriting a generic worksheet shell.

Authored data: `src/bootcamps/conditionals/content/fullCourseContent.ts` and `fullCourseItems.ts`. There are 25 lesson homes (24 required, one optional nesting extension), 23 interleaved practice sets and 100 lesson quiz items. Group 3 and Group 4 have eight productive practice items each; necessary assumptions has nine; the other sets have six, totaling 145 practice items. Adjacent two-way/contextual lessons share a set, as do direct/hidden chains. These counts describe authored tasks, not independent structures mastered or unique source questions.

Tests checked the actual candidate formulas and keys, not unrelated demonstration formulas. An early pass exposed conditional distractors that were vacuously true under the given facts; those were corrected. The latest completed focused run passed 55 tests (49 authored-bank semantic checks and six coverage/dependency/regression checks). After the seven fresh-scenario wording replacements, the focused rerun also passed all 55 tests. Those wording repairs preserve formulas and stable answer IDs. No learner records were written during source authoring.

## Source evidence and limits

All vault paths here begin at `C:/Users/Joshu/dev/ai-os/`.

| Source actually read | What it supports | Qualification |
|---|---|---|
| `students/asia/conditional-logic-cheat-sheet-2026-08-24.html`, `#cs-negleft`, `#cs-negright`, `#cs-flip`, `#cs-use` | Group 3/4, compound negation, chaining versus fact use | Assigned-note lineage, not a context-free keyword dictionary. Preserve permission and scope. |
| `students/asia/conditional-logic-the-breakdown-2026-08-24.html`, `#bd-3`, `#bd-4`, `#bd-7`, `#bd-8`, `#bd-10`, `#bd-11` | Exceptions/exclusions, contextual otherwise and iff, quantity boundary, linking/triggering | Older fixed `few = most not` and disappearing-rule language are not adopted. The Group 3 provenance anchor was corrected from `#bd-4` to `#bd-3`. |
| `wiki/COPY-CORRECTIONS.md`, Unless correction 2026-10-12 | Choose EITHER complete idea, negate it on the left, retain the other unchanged | Governs over the vendor's narrower target-first procedure. |
| `brainstorms/2026-09-28-recap-format/09-quantity-statements-classroom.md` | Full some/most/all meanings, exact denial, existence, valid propagation, same-group overlap, group-size comparison, invalid combinations | Newer contextual treatment of few/many governs over older fixed-cutoff claims. |
| `corpus/lectures/logical-reasoning/must-be-true/core/2026-08-27-33013/teaching-brief.md` and previously read adapted transcript | Facts, chains, compound requirements, modality and MBT/MSS boundaries | Adapted LSAT Lab teacher material includes explicit corrections; not copied as Joshua's prose. Audio fidelity is not independently certified. |
| `Loophole Lecture/Conditional Reasoning 2026-10-18/How to Diagram Unless`, `How to Diagram Inclusion`, `How to Diagram Exclusion`, `How to Diagram If and Only If`, `How to Chain Conditionals` | Full rendered transcripts, written notes and Unless excerpt: exceptions, pair constraints, both implications and useful contraposition | Native speech capture is automatic. Threshold slip, awkward subject parsing and unsafe blanket shortcuts were flagged rather than adopted. Vendor examples/media are not republished. |
| Same archive: `The Worst Conditional Habit Everyone Has`, `Diagramming Drama`, `Why You Shouldn't Diagram the Contrapositive for No Reason`, `How to Watch All the How to Conditional Videos` | Meaning before symbols, attempt before explanation, readable notes, strategic use of diagrams | Vendor study advice is not an automatic course gate. Lectures expressly supplement a book rather than certify exhaustive coverage. |
| `corpus/loophole-online/bootcamps/conditional-reasoning/` | Initial questions, choices and final observed responses for Unless, compound/two-way/exclusion and Conditional Practice | Site-success keys are not independent logical proof. Diagram-only answer images were not visually audited in this pass. A licensed stimulus in Conditional Practice remains gated. |
| `corpus/loophole-online/workouts/unless-practice-routine/README.md`; `routines/the-conditional-rehab-routine/README.md` | Complete instructions via retrieval `instructions`: warmup and ordered repair routine | Five-second/zero-doubt advice remains vendor advice, not compulsory core progression. |
| App `content/foundations.source.ts` and `content/applications.source.ts` | Complete selected authored unit bodies and item candidates | Old IDs and question snapshots remain unchanged. New productive adaptations use new IDs; availability of a bank is not mastery evidence. |

The old `Conditional LOGIC Group 3 & 4.pdf` megadoc extract is truncated; this work does not claim recovery of its full original PDF or answer key. Advanced quantity/nesting/causal/application source review also has a separate owning-agent report; this artifact does not claim to have independently reread that agent's entire source package.

## Every old unit has an explicit disposition

This table reflects `LEGACY_UNIT_DISPOSITIONS` in `openingCoursePath.ts`, not a migration of old records. Supplementary destinations remain separately gated, outside numbered completion. All 30 units occur exactly once here.

| Existing unit | New-edition home | Disposition |
|---|---|---|
| orientation | Chapter 1 | Primary, preserved |
| sufficient-necessary | Chapter 1 | Primary, preserved |
| group-1 | Chapter 1 | Primary, preserved |
| group-2 | Chapter 1 | Primary, preserved |
| and-or | Chapter 2 | Primary, preserved Claude draft |
| de-morgan | Chapter 2 | Primary, preserved Claude draft |
| group-3 | 3.1 | Primary |
| group-4 | 3.2 | Primary |
| mixed-translation | 3.3 | Primary |
| implicit-conditionals | 3.4 | Primary |
| biconditionals | 4.1–4.2 | One unit, two complementary lesson homes |
| whole-rule-negation | 4.3 | Primary |
| triggering | 5.1 | Primary |
| direct-linking | 5.2–5.3 | One unit, direct and hidden links |
| no-link | 5.4 | Primary |
| domain | 5.5 | Required primary, not supplementary |
| quantifier-meaning | 6.1 | Primary |
| quantifier-negation | 6.2 | Primary |
| quantifier-linking | 6.3 | Primary |
| quantifier-invalid | 6.4 | Primary |
| mbt | 7.1, 7.7; optional 7.8 | Primary, separate conclusion/application purposes |
| sufficient-assumption | 5.6, 7.2 | Primary, construction before application |
| necessary-assumption | 7.3 | Primary |
| principle | 7.4 | Primary |
| parallel | 7.5 | Primary |
| flaw | 7.6 | Primary |
| rules-facts | Chapter 5 | Independently gated supplementary historical destination |
| truth-validity | Chapter 1 | Independently gated supplementary historical destination |
| negation | Chapter 4 | Independently gated supplementary historical destination |
| contraposition | Chapter 1 | Independently gated supplementary historical destination |

## New lesson and practice map

Each row has a concrete anchor, a second demonstration, error comparison, habit and four-item quiz in the authored file. Practice IDs are stable and declared through `afterLessonId`; completion is not inferred from the title. Topic dependencies are explicit `requiredAllOfUnitIDs` on cumulative sets.

| Lesson ID and number | Meaning or distinction | Practice home and actual operations |
|---|---|---|
| exception-language, 3.1 | Group 3; either idea; existing negatives; contextual except/until/without | exception-language-practice: construct original/contrapositive, test reverse/inverse, except transfer and until barrier counterexample |
| exclusion-language, 3.2 | Group 4; exclusions, neither permitted, no/not-all/not-both and policy limits | exclusion-language-practice: exclusion construction, neither case, prohibition/compliance, nobody and fixed-pair not-all contrast |
| negative-translation, 3.3 | Groups 3/4 together; cancel negatives without dropping scope | negative-translation-practice: production, contrapositive and permitted counterexamples |
| implicit-guarantees, 3.4 | Guarantee, prerequisite, passive phrasing, permission versus action | implicit-guarantees-practice: construct rule and test added inference |
| two-way-rules, 4.1 | Both implications and compound sides | Shared contextual-two-way-practice after 4.2; build BOTH implications |
| contextual-two-way, 4.2 | Inclusion/exclusion/exactly-one, neither/nor, contextual otherwise | Shared set: two-rule construction, inclusion construction, neither result and permitted joint case |
| deny-whole-rule, 4.3 | Actual sufficient-without-necessary counterexample | deny-whole-rule-practice: simple, AND/OR, domain and iff countermodels |
| facts-with-rules, 5.1 | Rule versus fact, all four situations | facts-with-rules-practice: case application, negative fact, counterexample and short fact chain |
| direct-chains, 5.2 | Result-to-sufficient matching, subchains, no existence claim | Shared hidden-chain-practice after 5.3; ordered chain construction |
| hidden-chain, 5.3 | Contraposition exposes a match | Shared set: direct and negative chains; equivalent directions |
| failed-connections, 5.4 | Shared result/trigger; incomplete joint condition | failed-connections-practice: countermodels and justified joint-result construction |
| same-domain, 5.5 | Registers, dates, owner versus object, missing restriction | same-domain-practice: subject/domain countermodels and exact time-scope production |
| missing-bridges, 5.6 | Added implication closes a stated gap | missing-bridges-practice: constructive bridge, offered additions and missing conjunct |
| quantity-meaning, 6.1 | Some/most/all, reversibility limits, existence, contextual words | quantity-meaning-practice: finite arrangements refuting stronger count or reversed-majority claims |
| quantity-denial, 6.2 | Exact negations and halfway boundary | quantity-denial-practice: finite countermodels distinguishing denial from stronger opposition |
| quantity-links, 6.3 | Witness propagation, same-group majority overlap and group-size comparison | quantity-links-practice: finite arrangements testing stronger conclusions; opposing-majority denominator comparison |
| quantity-gaps, 6.4 | Different witnesses, denominators and missing existence | quantity-gaps-practice: some/some, most/some, backwards all and different-majority countermodels |
| supported-inferences, 7.1 | Strict MBT versus strongest support; factual/rule conclusions | supported-inferences-practice: justified chain and countermodels to reverse/inverse |
| sufficient-bridges, 7.2 | Premise plus added assumption entails exact conclusion | sufficient-bridges-practice: constructive/candidate bridges, bad repair counterexample and joint conclusion |
| necessary-assumptions, 7.3 | Required commitment versus sufficient repair; precise denial | necessary-assumptions-practice: same-case requirement, broad bridge countermodel, OR requirement and conjunction denial |
| apply-principle, 7.4 | Full case fit and normative strength | apply-principle-practice: principle construction and direction/compliance countermodels |
| match-structure, 7.5 | Preserve inference, negatives and joint conditions across topics | match-structure-practice: reconstructed rules and reverse/inverse contrasts |
| conditional-flaws, 7.6 | Converse, inverse, lost qualification, permission and causation | conditional-flaws-practice: actual premise-true/conclusion-false cases |
| conditional-conclusions, 7.7 | Hypothetical output; proof/counterexample; alternative routes | conditional-conclusions-practice: rule construction, conditional countermodels and compound transfer |
| nested-extension, 7.8 | Outer and inner sufficient scope | nested-extension-practice: combined construction, omissions and whole-scope contrapositive; OPTIONAL |

## Golden-standard editorial checks

These are concrete editorial findings, not a validated learning score and not a claim of visual acceptance.

| Dimension | Evidence in current data | Limit or follow-through |
|---|---|---|
| Ordinary meaning | Each lesson defines its concept before notation. Group 3 opening now says unless means if not, followed by the survey/hillside anchor. | Parent renderer is moving contextual family paragraphs behind the main example to fix first-screen density. |
| Concrete anchor | Each page has one named main example; first demonstration develops that same relationship. | Existing legacy examples are source adaptations, not newly discovered official questions. |
| Visible reasoning | Main explanations spell out why the consequence follows and what remains open. Numbered procedures preserve prerequisites. | Model validation does not establish that every explanation is maximally clear to a beginner. |
| Questions and learner control | Two demonstrations, specific click-action labels across all 25 pages, four quiz checks and productive tasks. | Browser keyboard/focus and stage behavior belong to host acceptance. |
| Tempting errors | Wrong/Right comparisons, specific Group 3/4 distractor hints, actual countermodel tasks. | Some other consequence-quiz hints remain more general than the Group 3/4 hand-authored hints. Final teaching review should inspect them in context. |
| Transfer | Fresh scenarios differ from worked anchors. Seven detected main/demo-to-quiz repetitions were replaced with new contexts while preserving semantics. | Repeated operations on one fresh scenario are deliberately comparison/retrieval within a set, not counted as separate unseen structures. |
| Voice and cadence | Plain terms, meaningful short labels, ordinary readbacks, no letter-code conditions or squiggle negation. | Read-aloud subjective calibration and final Claude review remain separate. |
| Purpose and sequencing | Every set now names its actual task. Adjacent same-topic sets are consolidated after the later prerequisite. | Entry descriptions alone do not establish useful runtime practice. |
| Media | Canonical scripts derive from the same authored definitions, anchor and explanation. | The Group 3 opening revision and a meaningful five-file majority boundary in quantity-denial change two scripts and need regeneration; the other 23 narrations remain unchanged. Title metadata needs the three Chapter 3 title changes. Encoded playback/captions are host checks. |
| Presentation | Data supplies seven sections, two demos and slim error comparisons. Duplicate Step-number prefixes were removed from lesson-step titles. | Pixel layout, density, color, reduced motion and caption readability require real rendered inspection. |

## 2026-10-25 Group 3/4 correction and remaining boundaries

The user rejected generic negative-language chapter framing. Parent owns the chapter title **Group 3 and Group 4**. Data lesson titles are **Group 3: Unless, until and without**, **Group 4: No, none and never**, and **Use Groups 3 and 4 together**. Stable IDs and storage keys did not change.

Source audit found missing except coverage and overly implicit not-both/not-all distinctions. Added their explanations and productive transfer tasks, retained the either-idea method, and made the until barrier limit explicit. Family lists are contextual; no blanket until equivalence or policy-compliance assumption is introduced.

Readbacks and existing demonstrations remain intact. Extra context did not alter the other lesson scripts. Group 3's first definition was subsequently simplified after the parent observed a dense first screen; the media owner was notified that this canonical narration must be regenerated. Quantity-denial also gained a five-file boundary example after its measured narration fell below 60 seconds; its film must be regenerated too. Do not report all 25 final media as synchronized until that guard passes.

Still required before completion claims: final cross-provider teaching/implementation inspection; rendered operation-by-operation drill and quiz checks; media/caption playback; account/access/save-failure acceptance; full reconciled typecheck/build. Static/finite semantic checks do not independently verify every English-to-formula interpretation. This artifact does not certify live authentication, production RLS, assignment creation, publication, paid semantic grading, every wrong-answer branch of captured vendor practice, or complete recovery of missing original source documents.

The Chapter 2 path inventory regression now reads the full COURSE_STEP_REGISTRY rather than the intentionally frozen legacy OPENING_COURSE_PATH. Its focused single-worker run passed all 16 tests. Chapter 2 item data was unchanged.

## Final operation coverage probe, 2026-10-25

The integrated necessary-assumption negation-test gap was corrected with three fresh 7.3 tasks: necessary-assumptions-negation-test-required constructs the exact denial of a conjunction while preserving the actual envelope premise and submission requirement; necessary-assumptions-negation-test-verdict applies that denial to derive not-submitted and reject the author’s proposed conclusion; necessary-assumptions-negation-test-overbroad negates a universal using another-lab witness while the actual local premises still prove the conclusion about M. Neither conclusion is inserted as an extra premise. Exhaustive valuation checks establish that all three allowed conjunction-denial cases force not-submitted, while the overbroad foil has a countermodel in which the actual conclusion remains proved. This closes the specific integrated-operation gap identified against full-bootcamp.build-spec.md:55 and lesson 7.3 steps. Media scripts were unchanged.

The other requested operation probes have concrete teaching and fresh task homes: all four fact states in facts-with-rules quiz 1–4 and its practice; inclusion/exclusion/exactly-one in contextual-two-way quiz 1–4 and pair-constraint practice; direct/hidden/no-link in hidden-chain and failed-connections; subject/owner/time restrictions in same-domain quiz 4 and transfer 4/6; existential and quantifier limits in quantity-meaning transfer 5 and the quantity-link/gap sets; and conditional conclusions in the named 7.7 set. Exactly-one has a fresh comparison quiz rather than its own separate productive set, consistent with the specification’s bounded comparison requirement at lines 33 and 43. Optional nested extension remains optional by the approved registry disposition. This is scoped source/spec coverage, not a claim that every LSAT conditional application is complete.
