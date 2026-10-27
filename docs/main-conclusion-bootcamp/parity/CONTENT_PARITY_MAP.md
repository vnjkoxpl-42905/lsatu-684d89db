# CONTENT PARITY MAP (human view)

**Status:** Gate 2 draft. Pending Joshua's sign-off.
**Generated:** 2026-04-30 (manual; build-time import script will refresh).
**Source of truth:** `CONTENT_PARITY_MAP.json`. This Markdown is auto-generated for review.

Every inventory ID maps to: source path(s) → destination route → component(s) → parity_status. Gate 5 re-verifies the built app against this map.

**Parity status legend:** `specced` → not yet implemented · `scaffolded` → component placeholder exists · `implemented` → built · `verified` → matches source verbatim where required (Gate 5) · `drift` → diverged from source (Gate 5 fail).

All entries below currently `specced`. Gate 4 advances to `implemented`. Gate 5 advances to `verified`.

---

## Module 1 — Lessons

| ID | Route | Components | Sources |
|---|---|---|---|
| MC-LSN-1.1 | /lessons/1.1 | `modules/lessons/Lesson.tsx`, `components/argument-structure-map/CakeOnBlocks.tsx` | spec.html#L1235; Notes/Logical_Reasoning_Notes_Final.pdf; Notes/Argument parts (core)_dup1.pdf; Notes/Lecture 1 Notes LR Arguments Foundation (1)_dup1.pdf |
| MC-LSN-1.2 | /lessons/1.2 | `modules/lessons/Lesson.tsx` | spec.html#L1261; Notes/Logical_Reasoning_Notes_Final.pdf; Notes/Lecture 1 Notes...pdf; Netlify/index (3).html |
| MC-LSN-1.3 | /lessons/1.3 | `modules/lessons/Lesson.tsx`, `components/indicator-vault/CategoryCard.tsx` | spec.html#L1291; Notes/Indicator word list .pdf; Notes/main_conclusion_role_merged_note.pdf; Notes/Keyword.pdf |
| MC-LSN-1.4 | /lessons/1.4 | `modules/lessons/Lesson.tsx` | spec.html#L1316; Notes/Main Conclusion Synopsis.pdf; Notes/main_conclusion_role_merged_note.pdf; Notes/Main conclusion (recap)_dup1.pdf |
| MC-LSN-1.5 | /lessons/1.5 | `modules/lessons/Lesson.tsx` | spec.html#L1339; Homework/First sentence Conclusion (Reading Drill).md; Notes/MCFIRST SENTENCE : REBUTTAL.pdf; Notes/Main Conclusion Synopsis.pdf |
| MC-LSN-1.6 | /lessons/1.6 | `modules/lessons/Lesson.tsx` | spec.html#L1368; Notes/Main Conclusion Synopsis.pdf; Notes/main_conclusion_role_merged_note.pdf; Notes/Skeletal Breakdown LR (1)_dup1.pdf |
| MC-LSN-1.7 | /lessons/1.7 | `modules/lessons/Lesson.tsx`, `components/argument-structure-map/ChainMap.tsx` | spec.html#L1402; Notes/LOGICAL CHAIN.pdf; Notes/Intermediate conclusion and Hybrid argument notes _dup1.docx; Notes/Intermediate_Conclusions_Practice_Full.docx |
| MC-LSN-1.8 | /lessons/1.8 | `modules/lessons/Lesson.tsx` | spec.html#L1446; Notes/Argument Core & Periph_dup1.pdf; Notes/Skeletal Breakdown LR (1)_dup1.pdf; Netlify/index (1).html |
| MC-LSN-1.9 | /lessons/1.9 | `modules/lessons/Lesson.tsx` | spec.html#L1485; Notes/Skeletal Breakdown LR (1)_dup1.pdf |
| MC-LSN-1.10 | /lessons/1.10 | `modules/lessons/Lesson.tsx` | spec.html#L1512; Notes/Main Conclusion Synopsis.pdf; Notes/main_conclusion_role_merged_note.pdf |
| MC-LSN-1.11 | /lessons/1.11 | `modules/lessons/Lesson.tsx` | spec.html#L1544; Notes/Main conclusion (recap)_dup1.pdf; Notes/Main Conclusion Synopsis.pdf |
| MC-LSN-1.12 | /lessons/1.12 | `modules/lessons/Lesson.tsx`, `components/trap-master/TraitPreviewGrid.tsx` | spec.html#L1581; Notes/Advanced- MP Question Traps_dup1.docx; Notes/_scan_Main conclusion part 1.pdf; Notes/_scan_Main conclusion part 2.pdf |
| MC-LSN-1.13 | /lessons/1.13 | `modules/lessons/Capstone.tsx`, `components/coachs-note/CoachsNote.tsx`, `components/trap-master/TraitTag.tsx` | spec.html#L1605 |

---

## Module 2 — Reference

| ID | Route | Components | Sources |
|---|---|---|---|
| MC-REF-2.A | /reference/indicators | `modules/reference/IndicatorVault.tsx`, `components/indicator-vault/CategoryCard.tsx` | spec.html#L1644; Notes/Indicator word list .pdf; Notes/main_conclusion_role_merged_note.pdf; Notes/Keyword.pdf; Netlify/index (4).html |
| MC-REF-2.B | /reference/2-part-check | `modules/reference/TwoPartCheck.tsx` | spec.html#L1715; Notes/Main conclusion (recap)_dup1.pdf; Notes/Main Conclusion Synopsis.pdf; Homework/Main Conclusion Drill Answer Key.pdf |
| MC-REF-2.C | /reference/fabs | `modules/reference/FABS.tsx` | spec.html#L1755; Notes/main_conclusion_role_merged_note.pdf; Notes/Indicator word list .pdf |
| MC-REF-2.D | /reference/stimulus-tendencies | `modules/reference/StimulusTendencies.tsx` | spec.html#L1782; Notes/Main Conclusion Synopsis.pdf; Notes/main_conclusion_role_merged_note.pdf; Notes/Main conclusion (recap)_dup1.pdf |
| MC-REF-2.E | /reference/conclusion-types | `modules/reference/ConclusionTypes.tsx` | spec.html#L1803; Notes/Skeletal Breakdown LR (1)_dup1.pdf |
| MC-REF-2.F | /reference/rebuttal-structure | `modules/reference/RebuttalStructure.tsx` | spec.html#L1845; Notes/main_conclusion_role_merged_note.pdf; Notes/Skeletal Breakdown LR (1)_dup1.pdf; Notes/Argument Core & Periph_dup1.pdf |
| MC-REF-2.G | /reference/three-traps | `modules/reference/ThreeTraps.tsx` | spec.html#L1881; Notes/Main Conclusion Synopsis.pdf; Notes/Advanced- MP Question Traps_dup1.docx |
| MC-REF-2.H | /reference/pronoun-library | `modules/reference/PronounLibrary.tsx` | spec.html#L1907; Notes/Main Conclusion Synopsis.pdf; Notes/main_conclusion_role_merged_note.pdf |
| MC-REF-2.I | /reference/concession-decoder | `modules/reference/ConcessionDecoder.tsx` | spec.html#L1945; Notes/Argument Core & Periph_dup1.pdf; Notes/Skeletal Breakdown LR (1)_dup1.pdf; Notes/Indicator word list .pdf |
| MC-REF-2.J | /reference/quick-card | `modules/reference/QuickReferenceCard.tsx`, `lib/print/QuickReferenceCard.print.tsx` | spec.html#L1969 |
| MC-REF-2.K | /reference/companion-mode | `components/workspace-shell/RightDrawer.tsx` (reference overlay handler) | spec.html#L2030 |

---

## Module 3 — Drills

| ID | Route | Components | Sources | Open questions |
|---|---|---|---|---|
| MC-DRL-3.1 | /drills/3.1 | `modules/drills/IndicatorWordID.tsx`, `components/stage-gate/StageGateTracker.tsx`, `components/primitives/Chip.tsx` | spec#L2068; Notes/Indicator word list, role_merged, Keyword; Homework/Argument Structure refresher + answer key | — |
| MC-DRL-3.2 | /drills/3.2 | `modules/drills/XRayDrill.tsx`, `components/x-ray-scan/XRayScanToggle.tsx`, `components/stage-gate/StageGateTracker.tsx` | spec#L2108; Notes/LR BODY DRILL PT 1, LSAT argument id Homework, premise/conc indicators pt2; Homework/Premise & Conc exercise, Dissect LSAT, prem+conc level 2, Argument parts exercise + AP key; Netlify (3),(5),(6) | — |
| MC-DRL-3.3 | /drills/3.3 | `modules/drills/FirstSentenceReading.tsx` | spec#L2156; Homework/First sentence Conclusion (Reading Drill).md | — |
| MC-DRL-3.4 | /drills/3.4 | `modules/drills/RebuttalStageGate.tsx`, `components/stage-gate/StageGateTracker.tsx`, `lib/pdf/StageGatePdfReport.ts` | spec#L2180; Homework/Rebuttal_vs_First_Sentence_Updated; Homework/_scan_Main Conclusion Homework; Homework/Main Conclusion Drill Answer Key; Netlify/index (4).html | OQ-DRL-3.4 |
| MC-DRL-3.5 | /drills/3.5 | `modules/drills/ChainMapping.tsx`, `components/argument-structure-map/ChainMap.tsx` | spec#L2222; Notes/LOGICAL CHAIN, Hybrid argument notes, Intermediate_Conclusions_Practice_Full, Intermediate Conclusion Practice | — |
| MC-DRL-3.6 | /drills/3.6 | `modules/drills/DesignTheConclusion.tsx`, `lib/ai-templates/whimsical-evaluator.ts` | spec#L2265; Notes/Valid Conclusion Worksheet HW, Valid vs Invalid mastery, Valid Conclusion PT 2, MEMORIZE TATTOO docx; Homework/_scan_Valid Conclusion Drill | OQ-DRL-3.6-AI |
| MC-DRL-3.7 | /drills/3.7 | `modules/drills/PronounReplacement.tsx` | spec#L2304; Notes/Main Conclusion Synopsis, role_merged; Homework/main_conclusion_answer_key | — |
| MC-DRL-3.8 | /drills/3.8 | `modules/drills/RRDrill.tsx`, `components/rr-recorder/Recorder.tsx`, `components/rr-recorder/ReviewForm.tsx`, `lib/audio/MediaRecorder.ts`, `persistence/IndexedDBPersistence.ts` | spec#L2342; Homework/R&R Drill Stage 2 Instructions; Homework/R&R Drill Review Form | OQ-RR-MOBILE |
| MC-DRL-3.9 | /drills/3.9 | `modules/drills/NestedClaims.tsx` | spec#L2402; Notes/Intermediate Conclusions & Nested Claims Drill; Notes/Hybrid argument notes | OQ-DRL-3.9-OCR |

---

## Module 4 — Question Simulator + Trap Master

### Sections

| ID | Route | Components | Sources | OQ |
|---|---|---|---|---|
| MC-SIM-4.1 | /simulator | `modules/simulator/Overview.tsx` | spec#L2460 | — |
| MC-SIM-4.2 | /simulator/bank | `modules/simulator/QuestionBank.tsx`, `components/question/QuestionCard.tsx` | spec#L2477; Notes/main_conclusion_questions; Notes/MCFIRST; Homework/main_conclusion_answer_key (per-question source_anchor in `simulator_questions[]` JSON section) | OQ-SIM-4.2-AC |
| MC-SIM-4.3 | /simulator/trap-master | `modules/simulator/TrapMaster.tsx`, `components/trap-master/TraitDeepDive.tsx` | spec#L2513; Notes/Advanced MP Traps, masterclass parts 1+2, LOGICAL CHAIN, Synopsis | — |
| MC-SIM-4.4 | /simulator/answer-key-views | `components/coachs-note/AnswerKeyToggle.tsx` | spec#L2723; Notes/MCFIRST; Homework/main_conclusion_answer_key | — |
| MC-SIM-4.5 | /simulator (per-question) | `components/coachs-note/CoachsNote.tsx` | spec#L2769; Notes/masterclass parts 1+2; Netlify/index (1).html | — |
| MC-SIM-4.6 | /diagnostics/trait-profile | `modules/diagnostics/TraitDiagnostic.tsx` | spec#L2800 | — |
| MC-SIM-4.7 | /simulator/hard-mode | `modules/simulator/HardQuestionMode.tsx` | spec#L2825; Notes/masterclass parts 1+2; Notes/LR MASTERY | — |
| MC-SIM-4.8 | /simulator (UX shell) | `modules/simulator/SimulatorShell.tsx` | spec#L2843 | — |

### Per-question source-anchor table (the canonical 20)

Audit ran 2026-04-30 per Joshua's Gate 2 conditional-approval directive #1. **Result: all 20 trace. No OQ-7.**

| ID | Title | Family | Anchor (primary file) |
|---|---|---|---|
| MC-SIM-Q1 | Vision test for driver's licenses | First-Sentence | Notes/MCFIRST — Q1 (also referenced at spec L1358 + L2735 + L2747) |
| MC-SIM-Q2 | Freedom of speech / Policy Adviser | First-Sentence | Notes/MCFIRST — Q2 |
| MC-SIM-Q3 | Trade Europe-East Asia / yeti analogy | First-Sentence | Notes/MCFIRST — Q3 |
| MC-SIM-Q4 | No computer / human minds / mechanical rules | First-Sentence | Notes/MCFIRST — Q4 |
| MC-SIM-Q5 | Toy-labeling law / Consumer advocate | First-Sentence | Notes/MCFIRST — Q5 |
| MC-SIM-Q6 | Diet refined sugar / adult-onset diabetes | First-Sentence | Notes/MCFIRST — Q6 |
| MC-SIM-Q7 | Legal theorist / incarceration / threat | First-Sentence | Notes/MCFIRST — Q7 |
| MC-SIM-Q8 | Nylon industry / cotton vs nylon natural | Rebuttal | Notes/MCFIRST — Q8 |
| MC-SIM-Q9 | Mayor McKinney / wealthy residents / property taxes | Rebuttal | Notes/MCFIRST — Q9 |
| MC-SIM-Q10 | Apatosaurus / galloping | Rebuttal | Notes/MCFIRST — Q10 (Netlify/index (6).html paraphrase exists, NOT used as v1 stimulus) |
| MC-SIM-Q11 | (untitled in spec — stimulus 11/18) | Rebuttal | Notes/MCFIRST — Q11 (title resolves at Gate 3 OCR pass) |
| MC-SIM-Q12 | (untitled in spec — stimulus 12/18) | Rebuttal | Notes/MCFIRST — Q12 (title pending) |
| MC-SIM-Q13 | (untitled in spec — stimulus 13/18) | Rebuttal | Notes/MCFIRST — Q13 (title pending) |
| MC-SIM-Q14 | (untitled in spec — stimulus 14/18) | Rebuttal | Notes/MCFIRST — Q14 (title pending) |
| MC-SIM-Q15 | (untitled in spec — stimulus 15/18) | Rebuttal | Notes/MCFIRST — Q15 (title pending) |
| MC-SIM-Q16 | (untitled in spec — stimulus 16/18) | Rebuttal | Notes/MCFIRST — Q16 (title pending) |
| MC-SIM-Q17 | (untitled in spec — stimulus 17/18) | Rebuttal | Notes/MCFIRST — Q17 (title pending) |
| MC-SIM-Q18 | (untitled in spec — stimulus 18/18) | Rebuttal | Notes/MCFIRST — Q18 (title pending) |
| MC-SIM-Q19 | Implementing recycling program | First-Sentence | Notes/MCFIRST — Q19 (also spec L1733-1740 as MC-REF-2.B verification example) |
| MC-SIM-Q20 | Mr. Tannisch / fingerprints / gloves | Rebuttal | Notes/MCFIRST — Q20 |

Every stimulus has secondary + tertiary anchors at `Notes/main_conclusion_questions_dup1.pdf` and `Homework/main_conclusion_answer_key_dup1.pdf` respectively (the Stage 1 audit confirms all three files contain the same 20 arguments). Title-pending entries (Q11–Q18) anchor at file level; titles resolve at Gate 3 build time via OCR over the three source PDFs (first 6–8 words of each stimulus). The answer-choice gap (full A-E sets) remains under OQ-SIM-4.2-AC and is distinct from stimulus-text anchoring.

### Trap Master traits

| ID | Route | Component | PT example | Source |
|---|---|---|---|---|
| MC-TRAIT-1 | /simulator/trap-master/1 | `components/trap-master/TraitDeepDive.tsx` | PT58 S1 Q13 | spec#L2522; masterclass part 1 |
| MC-TRAIT-2 | /simulator/trap-master/2 | (same) | Tomato example | spec#L2556; masterclass part 1 |
| MC-TRAIT-3 | /simulator/trap-master/3 | (same) | Tornado syntax-equivalence | spec#L2583; masterclass part 1 + Recap |
| MC-TRAIT-4 | /simulator/trap-master/4 | (same) | (catalog) | spec#L2615; masterclass part 1 |
| MC-TRAIT-5 | /simulator/trap-master/5 | (same) | PT24 S2 Q12 — extraterrestrial life | spec#L2640; masterclass part 2 |
| MC-TRAIT-6 | /simulator/trap-master/6 | (same) | (catalog) | spec#L2674; masterclass part 2 |
| MC-TRAIT-7 | /simulator/trap-master/7 | (same) | EV chain | spec#L2693; masterclass part 2; LOGICAL CHAIN |

---

## Module 5 — Hard Sentences

| ID | Route | Components | Sources | OQ |
|---|---|---|---|---|
| MC-HSL-5.1 | /hard-sentences/why | `modules/hard-sentences/Why.tsx` | spec#L2899; Notes/Cluster Sentences Review.docx + .docx.pdf | — |
| MC-HSL-5.2 | /hard-sentences/what-is-cluster | `modules/hard-sentences/WhatIsCluster.tsx` | spec#L2917; Notes/Cluster Sentences Review.docx | — |
| MC-HSL-5.3 | /hard-sentences/specifiers | `modules/hard-sentences/Specifiers.tsx` | spec#L2935; Notes/Cluster Sentences Review.docx; Notes/complicated sentence notes.docx | — |
| MC-HSL-5.4 | /hard-sentences/decomposition-method | `modules/hard-sentences/AlexJordanWalkthrough.tsx`, `components/cluster-decomposer/Decomposer.tsx` | spec#L2960; Notes/Cluster Sentences Review.docx | — |
| MC-HSL-5.5 | /hard-sentences/optional-vs-core | `modules/hard-sentences/OptionalVsCore.tsx` | spec#L2998; Notes/complicated sentence notes.docx | — |
| MC-HSL-5.6 | /hard-sentences/practice | `modules/hard-sentences/Practice.tsx`, `components/cluster-decomposer/Decomposer.tsx` | spec#L3024; Notes/Cluster Sentences Review.docx; Notes/complicated sentence notes.docx | — |
| MC-HSL-5.7 | /hard-sentences/decomposer | `components/cluster-decomposer/Decomposer.tsx` | spec#L3048; Notes/Cluster Sentences Review.docx | — |
| MC-HSL-5.8 | /hard-sentences/capstone | `modules/hard-sentences/Capstone.tsx` | spec#L3073 | OQ-CALIBRATION-CONTENT |

---

## Module 6 — Diagnostics + AI Tutor + Progress

| ID | Route | Components | Sources |
|---|---|---|---|
| MC-DIA-6.1 | /diagnostics | `modules/diagnostics/Philosophy.tsx` | spec#L3095 |
| MC-DIA-6.2 | (applied across all drills) | `components/stage-gate/StageGateTracker.tsx` | spec#L3110; Netlify/index (4).html; Homework/_scan_Main Conclusion Homework, Rebuttal_vs_First_Sentence_Updated |
| MC-DIA-6.3 | /diagnostics/dashboard | `modules/diagnostics/Dashboard.tsx` | spec#L3122 |
| MC-DIA-6.4 | /diagnostics/recommendations | `modules/diagnostics/Recommendations.tsx`, `lib/recommendations/decisionTree.ts` | spec#L3163 |
| MC-DIA-6.5 | (in-line in drills 3.4/3.7 + simulator pre-phrase) | `lib/pronoun-verifier/check.ts` | spec#L3181 |
| MC-DIA-6.6 | (global; appears on stuck-state) | `components/smart-hints/HintTrigger.tsx`, `lib/hints/templates.ts` | spec#L3198 |
| MC-DIA-6.7 | /diagnostics/rr-review | `modules/diagnostics/RRReview.tsx`, `components/rr-recorder/ReviewForm.tsx`, `lib/transcripts/diff.ts` | spec#L3215; Homework/R&R Drill Stage 2 Instructions, R&R Drill Review Form |
| MC-DIA-6.8 | (global drawer) | `components/ai-tutor/Drawer.tsx`, `lib/ai-tutor/templates.ts` | spec#L3242 |
| MC-DIA-6.9 | (infrastructure) | `persistence/Persistence.ts`, `LocalStoragePersistence.ts`, `IndexedDBPersistence.ts`, `records.ts` | spec#L3277 |
| MC-DIA-6.10 | (infrastructure) | `hooks/useUser.ts`, `persistence/index.ts` | spec#L3323 |

---

## Named tools (15)

| ID | Route | Component | Verbatim source |
|---|---|---|---|
| NT-FABS | /reference/named-tools/fabs | `modules/reference/NamedToolEntry.tsx` | rules/named_tools_lexicon.md; spec#L1755 |
| NT-2-Part-Conclusion-Check | /reference/named-tools/2-part-check | (same) | spec#L1715 |
| NT-Upside-Down-Argument | /reference/named-tools/upside-down-argument | (same) | spec#L1316 |
| NT-Trojan-Horse-Concession | /reference/named-tools/trojan-horse | (same) | spec#L1446 |
| NT-Pre-Phrase-Goal | /reference/named-tools/pre-phrase-goal | (same) | spec#L1512 |
| NT-Skeptic-Ear-Check | /reference/named-tools/skeptics-ear-check | (same) | spec#L2362 |
| NT-Stegosaurus-Interrogation | /reference/named-tools/stegosaurus-interrogation | (same) | spec#L1434 |
| NT-Indicator-Vault | /reference/indicators (the surface itself) | `modules/reference/IndicatorVault.tsx` | spec#L1644 — **also UI surface** |
| NT-Coach-Note | /simulator (per-question, embedded) | `components/coachs-note/CoachsNote.tsx` | spec#L2769 — **also UI surface** |
| NT-R-R-Drill | /drills/3.8 (the drill itself) | `modules/drills/RRDrill.tsx` | spec#L2342 — **also drill surface** |
| NT-X-Ray-Scan | (applied across drills) | `components/x-ray-scan/XRayScanToggle.tsx` | spec#L2113 |
| NT-Trap-Master | /simulator/trap-master | `modules/simulator/TrapMaster.tsx` | spec#L2513 — **also module surface** |
| NT-Stage-Gate-Tracker | (universal frame for all M3 drills) | `components/stage-gate/StageGateTracker.tsx` | spec#L2180; Netlify/index (4).html |
| NT-Pronoun-Reference-Library | /reference/pronoun-library | `modules/reference/PronounLibrary.tsx` | spec#L1907 |
| NT-Concession-Decoder | /reference/concession-decoder | `modules/reference/ConcessionDecoder.tsx` | spec#L1945 |

**Double-counting note** (per Gate 1 #2): Indicator Vault, Coach's Note, Trap Master, R&R Drill are both named tools and module/UI surfaces. The Reference module's "Named Tools" listing renders each tool once as an entry; the corresponding module surface owns the live experience. The lexicon page links out, the live surface is the tool.

---

## Indicator categories — render targets

All six render together at `/reference/indicators` (MC-REF-2.A) using `components/indicator-vault/CategoryCard.tsx`. The Concession card also surfaces standalone at `/reference/concession-decoder` (MC-REF-2.I); the FABS card also surfaces at `/reference/fabs` (MC-REF-2.C).

---

## Cross-cutting parity rules

1. **Source-backed slot rule** (handoff §6 + §6A): every component renders or exposes the source-identity slots (`source_item_id`, `question_id`, `lesson_id`, `named_tool_id`, `reference_id`, `trap_tag`, `correct_choice_id`, `review_queue_status`, `parity_status`). Type-checked against `src/types/source-slots.ts`.
2. **Manifest** (`src/data/manifest.generated.json`): `scripts/import-content.ts` emits one entry per Table A item with the resolved source path, content hash, and importer version. Gate 5 grep verifies every entry has a render site.
3. **Voice passages**: every `VP-*` ID's text appears verbatim in at least one rendered surface. Gate 5 greps the build output.
4. **Worked examples**: every `EX-*` ID renders in each of its `used_in` sections.
5. **Named tools**: names are case-sensitive. No "Two-Part Conclusion Check" or "FABS Acronym" — only the exact `rules/named_tools_lexicon.md` form.
