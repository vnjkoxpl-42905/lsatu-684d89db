# CONTENT INVENTORY — Table A (human view)

**Status:** Gate 2 draft. Pending Joshua's sign-off.
**Generated:** 2026-04-30 (manual; build-time import script will refresh at scaffolding).
**Source of truth:** `CONTENT_INVENTORY.json` in this folder. This Markdown is auto-generated for review.

---

## Totals

| Surface | Count |
|---|---|
| Modules | 6 |
| M1 Lessons (incl. capstone 1.13) | 13 |
| M2 Reference sections (incl. 2.J QRC + 2.K capstone) | 11 |
| M3 Drills | 9 |
| M4 Simulator sections | 8 |
| Trap Master traits | 7 |
| M5 Hard Sentences sections (incl. 5.8 capstone) | 8 |
| M6 Diagnostics sections | 10 |
| Named tools | 15 |
| Worked examples preserved verbatim | 23 |
| Voice passages preserved verbatim | 23 |
| Indicator categories | 6 |
| Conclusion types | 5 |
| Notes source files | 49 |
| Homework source files | 21 |
| Netlify prototypes (unique) | 5 |
| Canonical Simulator questions (the 20-arg drill) | 20 |
| **Items on Table A** | **173** |
| **Items on Table B** | **see [NOT_INCLUDED_IN_V1.md](NOT_INCLUDED_IN_V1.md)** |

---

## Module 1 — Lessons (`/lessons`)

**Voice register:** Register 2 (whimsical) dominant for prose; Register 1 (decisive) for callouts.

| ID | Title | v1 | Named tools | Verbatim refs |
|---|---|---|---|---|
| MC-LSN-1.1 | What's an argument? | v1 | — | EX-cake-on-blocks, VP-hark-simple-argument, VP-claimy-judgments, VP-conclusions-hot-mess |
| MC-LSN-1.2 | Premises and conclusions: what each one is | v1 | — | EX-monica-dinosaurs, VP-claimy-judgments |
| MC-LSN-1.3 | Indicator words: the visible signposts | v1 | NT-FABS | — |
| MC-LSN-1.4 | Main Conclusion: the most salvageable question type ever | v1 | NT-Upside-Down-Argument | VP-most-salvageable, VP-most-lovable, VP-dont-over-complicate |
| MC-LSN-1.5 | Hiding spot 1: the first sentence | v1 | — | EX-vision-test |
| MC-LSN-1.6 | Hiding spot 2: after the pivot (Rebuttal-styled) | v1 | — | EX-tomato-fruit-seeds |
| MC-LSN-1.7 | Intermediate conclusions vs multi-premise arguments | v1 | NT-Stegosaurus-Interrogation | EX-EV-cars-three-stage, EX-stegosaurus-eucalyptus |
| MC-LSN-1.8 | The Trojan Horse: opposing viewpoints and concessions | v1 | NT-Trojan-Horse-Concession, NT-Concession-Decoder | EX-William-Harry, EX-all-nighter-paper |
| MC-LSN-1.9 | The five types of conclusions | v1 | — | EX-eddie-arsonist (+ four type-examples) |
| MC-LSN-1.10 | Pre-phrase: replace the pronouns before you say the conclusion back | v1 | NT-Pre-Phrase-Goal, NT-Pronoun-Reference-Library | EX-gun-laws-pronoun-replacement |
| MC-LSN-1.11 | The 2-Part Conclusion Check | v1 | NT-2-Part-Conclusion-Check | EX-tornado-syntax-equivalence, EX-3-classic-traps |
| MC-LSN-1.12 | The trap landscape (preview) | v1 | NT-Trap-Master | — |
| MC-LSN-1.13 | End-of-module calibration drill (CAPSTONE) | v1 | NT-Coach-Note, NT-Trap-Master | — |

---

## Module 2 — Reference + Indicator Vault (`/reference`)

**Voice register:** Register 1 (decisive) dominant.

| ID | Title | v1 | Notes |
|---|---|---|---|
| MC-REF-2.A | The Indicator Vault | v1 | 6 categories, 50+ words, NT-Indicator-Vault, NT-FABS |
| MC-REF-2.B | The 2-Part Conclusion Check | v1 | NT-2-Part-Conclusion-Check |
| MC-REF-2.C | FABS — the support indicator quartet | v1 | NT-FABS |
| MC-REF-2.D | Stimulus Tendencies — where LSAC hides the conclusion | v1 | Heat map |
| MC-REF-2.E | The Five Types of Conclusions | v1 | Recommendations · Causal · Rebuttals · Predictions · Judgments |
| MC-REF-2.F | The Rebuttal Structure | v1 | Counterpoint → Pivot → Conclusion → Support |
| MC-REF-2.G | The Three Incorrect-Answer Trap Types (legacy gateway) | v1 | Premise / Last Claim / IC |
| MC-REF-2.H | Pronoun & Reference Library | v1 | NT-Pronoun-Reference-Library, NT-Pre-Phrase-Goal |
| MC-REF-2.I | The Concession Decoder | v1 | NT-Concession-Decoder |
| MC-REF-2.J | Quick Reference Card (printable) | v1 | 8-panel one-page printable |
| MC-REF-2.K | Reference-as-Companion (CAPSTONE — implicit) | v1 | No standalone test |

---

## Module 3 — Drills (`/drills`)

| ID | Title | Mechanic | Stages × items | v1 |
|---|---|---|---|---|
| MC-DRL-3.1 | Indicator-Word ID | tap-category-on-word | 4 stages, 30+ items | v1 |
| MC-DRL-3.2 | X-Ray Drill (Argument Structure Highlighting) | tap-sentence + assign-role + X-Ray reveal | 4 stages, ~50 stimuli | v1 |
| MC-DRL-3.3 | First-Sentence Reading Drill | read-only, no scoring | 9 stimuli | v1 |
| MC-DRL-3.4 | Rebuttal vs First-Sentence (Stage-Gate Tracker) | type-toggle + reason + restated conclusion + self-grade | 4 × 5 = 20 questions | v1 (sourcing OQ-DRL-3.4) |
| MC-DRL-3.5 | Intermediate vs Multi-Premise (chain mapping) | drag-arrow chain mapping | 4 stages, ~12 items | v1 |
| MC-DRL-3.6 | Design-the-Conclusion (Whimsical Premise) | type valid + invalid; AI evaluates | 3 volumes, 24 items | v1 (AI per OQ-DRL-3.6-AI) |
| MC-DRL-3.7 | Pronoun-Replacement Drill (NEW) | type replaced conclusion; AI verifies | 4 stages, ~15 items | v1 |
| MC-DRL-3.8 | R&R Drill (Read & Restate, Voice-Record) | live mic + cover-and-rephrase + AI flags | session size ~25 stimuli | v1 templated diff; v1.5 LLM semantic |
| MC-DRL-3.9 | Nested Claims & Hybrid Arguments (fashion-themed) | bracket nested claim + underline IC + TRUE/FALSE hybrid | ~10 items | v1 (re-author per OQ-DRL-3.9-OCR) |

---

## Module 4 — Question Simulator + Trap Master (`/simulator`)

### Sections

| ID | Title | v1 |
|---|---|---|
| MC-SIM-4.1 | How the Simulator works (overview) | v1 |
| MC-SIM-4.2 | The 20-Argument Classification Drill (canonical spine) | v1 |
| MC-SIM-4.3 | The Trap Master — 7 traits in depth | v1 |
| MC-SIM-4.4 | Two Answer-Key Views (narrative vs structured-table) | v1 |
| MC-SIM-4.5 | Coach's Note — per-question explanation | v1 |
| MC-SIM-4.6 | Trait Diagnostic — performance analytics by trap-trait | v1 |
| MC-SIM-4.7 | The Hard Question Mastery layer | v1 |
| MC-SIM-4.8 | Simulator UX Spec | v1 |

### Trap Master traits

| ID | Name | PT example |
|---|---|---|
| MC-TRAIT-1 | Trap statement that sounds like the conclusion but has no support | PT58 S1 Q13 |
| MC-TRAIT-2 | Main conclusion not explicitly stated in the stimulus | Tomato example |
| MC-TRAIT-3 | Correct answer doesn't match the conclusion word for word | Tornado syntax-equivalence |
| MC-TRAIT-4 | Subtle shift in scope | (catalog) |
| MC-TRAIT-5 | Wrong answer expresses something the author would agree with — but isn't the conclusion | PT24 S2 Q12 — extraterrestrial life |
| MC-TRAIT-6 | Correct answer vaguely worded, placed next to an attractive wrong answer | (catalog) |
| MC-TRAIT-7 | Intermediate Conclusion traps and Cause/Effect traps | EV chain |

### The canonical 20 stimuli

1. Vision-test driver license (First-Sentence)
2. Freedom of speech / Policy Adviser (First-Sentence)
3. Trade Europe-East Asia / yeti analogy (First-Sentence)
4. No computer / human minds / mechanical rules (First-Sentence)
5. Toy-labeling law / Consumer advocate (First-Sentence)
6. Diet refined sugar / adult-onset diabetes (First-Sentence)
7. Legal theorist / incarceration / threat (First-Sentence)
8. Nylon industry / cotton vs nylon natural (Rebuttal)
9. Mayor McKinney / wealthy residents / property taxes (Rebuttal)
10. Apatosaurus / galloping (Rebuttal)
11–18. Real LSAT-style rebuttal-styled stimuli
19. Implementing recycling program (First-Sentence)
20. Mr. Tannisch / fingerprints / gloves (Rebuttal)

---

## Module 5 — Reading Hard Sentences (`/hard-sentences`)

**Voice register:** Register 2 (whimsical) dominant — Cluster Sentences Review is a voice anchor.

| ID | Title | v1 |
|---|---|---|
| MC-HSL-5.1 | Why this module exists | v1 |
| MC-HSL-5.2 | What's a cluster sentence? | v1 |
| MC-HSL-5.3 | Specifiers — what makes cluster sentences a cluster | v1 |
| MC-HSL-5.4 | The decomposition method — Alex/Jordan red-sensor walkthrough | v1 |
| MC-HSL-5.5 | Optional elements vs core elements (middle-out 2-comma rule) | v1 |
| MC-HSL-5.6 | Practice — decomposition drills (3 levels) | v1 |
| MC-HSL-5.7 | The Cluster Sentence Decomposer — interaction spec | v1 |
| MC-HSL-5.8 | End-of-module calibration drill (CAPSTONE, 5 sentences) | v1 |

---

## Module 6 — Diagnostics + AI Tutor + Progress (`/diagnostics`)

| ID | Title | v1 capability | v1.5 upgrade |
|---|---|---|---|
| MC-DIA-6.1 | Diagnostic philosophy — calibration after teaching | v1 | — |
| MC-DIA-6.2 | Stage-Gate progression (universal drill wrapper) | v1 | — |
| MC-DIA-6.3 | Performance analytics (mechanic + trait) | v1 | — |
| MC-DIA-6.4 | Weak-area surfacing — recommendation engine | v1 templated | LLM-grounded |
| MC-DIA-6.5 | Pronoun-replacement live verification | v1 | — |
| MC-DIA-6.6 | Smart hints — when stuck | v1 templated | — |
| MC-DIA-6.7 | R&R voice-record review | v1 templated diff | LLM semantic comparison |
| MC-DIA-6.8 | AI Tutor overlay | v1 templated routes | live LLM Q&A |
| MC-DIA-6.9 | Progress tracking + persistence (adapter pattern) | v1 LocalStorage + IndexedDB | SupabasePersistence swap |
| MC-DIA-6.10 | LSAT U integration spec | v1 design-only | auth wrap + adapter swap + migration |

---

## Named tools (15)

Per `rules/named_tools_lexicon.md`. Two also serve as UI / module surfaces (Indicator Vault, Coach's Note); render once per role.

| ID | Name | Origin | Surfaces |
|---|---|---|---|
| NT-FABS | FABS | role_merged + Indicator word list | MC-REF-2.C, MC-LSN-1.3, MC-LSN-1.10 |
| NT-2-Part-Conclusion-Check | 2-Part Conclusion Check | Synopsis + Recap | MC-REF-2.B, MC-LSN-1.11, MC-REF-2.J |
| NT-Upside-Down-Argument | Upside Down Argument | Synopsis | MC-LSN-1.4 |
| NT-Trojan-Horse-Concession | Trojan Horse Concession | argumentslr prototype | MC-LSN-1.8, MC-REF-2.I |
| NT-Pre-Phrase-Goal | Pre-Phrase Goal | Synopsis | MC-LSN-1.10, MC-REF-2.H, MC-DRL-3.7 |
| NT-Skeptic-Ear-Check | Skeptic's Ear Check | R&R Drill Stage 2 Instructions | MC-DRL-3.8 |
| NT-Stegosaurus-Interrogation | Stegosaurus Interrogation | Hybrid argument notes | MC-LSN-1.7, MC-DRL-3.5 |
| NT-Indicator-Vault | Indicator Vault | New (lifted from MC Companion UI label) | **also Module 2 surface** (MC-REF-2.A) |
| NT-Coach-Note | Coach's Note | Masterclass workbooks + argumentslr | **also Module 4 surface** (MC-SIM-4.5) |
| NT-R-R-Drill | R&R Drill (Read & Restate) | R&R Drill Stage 2 Instructions | **also Module 3 drill** (MC-DRL-3.8) |
| NT-X-Ray-Scan | X-Ray Scan | logicalreasoningfoundation prototype | MC-DRL-3.2, MC-LSN-1.1-1.8 quote blocks, MC-SIM-4.5 |
| NT-Trap-Master | Trap Master | New + Advanced MP Question Traps + masterclass | **also Module 4 surface** (MC-SIM-4.3, MC-DIA-6.3) |
| NT-Stage-Gate-Tracker | Stage-Gate Tracker | mainconclusionrebuttalvsfirst (MC Companion) | MC-DRL-3.4 + universal frame for all M3 drills, MC-DIA-6.2 |
| NT-Pronoun-Reference-Library | Pronoun & Reference Library | New | MC-REF-2.H, MC-DRL-3.7 |
| NT-Concession-Decoder | Concession Decoder | New | MC-REF-2.I, MC-LSN-1.8 |

---

## Worked examples preserved verbatim (23)

| ID | Name | Source | Used in |
|---|---|---|---|
| EX-cake-on-blocks | Cake-on-blocks | Logical_Reasoning_Notes_Final.pdf (S) | MC-LSN-1.1, MC-LSN-1.2 |
| EX-stegosaurus-eucalyptus | Stegosaurus / eucalyptus interrogation | Hybrid argument notes (S) | MC-LSN-1.7, MC-DRL-3.5 |
| EX-William-Harry-standardized-testing | William and Harry standardized testing | Argument Core & Periph (A) | MC-LSN-1.8 |
| EX-gun-laws-pronoun-replacement | Gun-laws pronoun replacement | Synopsis (S) | MC-LSN-1.10, MC-REF-2.H, MC-DRL-3.7 |
| EX-EV-cars-three-stage | EV cars three-stage chain | LOGICAL CHAIN (S) | MC-LSN-1.7, MC-DRL-3.5, MC-TRAIT-7 |
| EX-monica-dinosaurs | Monica claimed dinosaurs | logicalreasoningfoundation (S) | MC-LSN-1.2 |
| EX-tomato-fruit-seeds | Tomato / fruit / seeds | Skeletal Breakdown LR (A) | MC-LSN-1.6, MC-REF-2.E, MC-REF-2.F, MC-TRAIT-2 |
| EX-all-nighter-paper | All-nighter paper concession | Argument Core & Periph (A) | MC-LSN-1.8, MC-REF-2.I |
| EX-tornado-syntax-equivalence | Tornado syntax-equivalence | Recap (S) | MC-LSN-1.11, MC-TRAIT-3 |
| EX-alex-jordan-red-sensor | Alex / Jordan red-sensor | Cluster Sentences Review (S) | MC-HSL-5.4 |
| EX-fashion-fedora-fez-trucker | Fashion-themed nested-claim drill (fedora, fez, trucker hats) | Intermediate Conclusions & Nested Claims Drill (A, image-only) | MC-DRL-3.9 |
| EX-red-bull-wings | Red Bull actually does give you wings | Hybrid argument notes (S) | MC-DRL-3.9 |
| EX-felipe-atoms | Felipe believes we're all atoms bumping together | Hybrid argument notes (S) | MC-DRL-3.9 |
| EX-vision-test | Vision test for driver's license | MCFIRST (S) | MC-LSN-1.5, MC-SIM-4.2 Q1, MC-SIM-4.4 |
| EX-eddie-arsonist | Eddie / arsonist / gas can | spec L2A | MC-REF-2.A, MC-REF-2.E |
| EX-tea-boba-FABS | Tea / boba FABS examples | role_merged (S) | MC-REF-2.A, MC-REF-2.C |
| EX-recycling-program-verification | Recycling program 2-Part Check | spec L1733 | MC-REF-2.B |
| EX-mediterranean-diet-verification | Mediterranean diet 2-Part Check | spec L1742 + main_conclusion_questions | MC-REF-2.B |
| EX-eating-meat-recommendation | Eating meat / vegetarian recommendation type | Skeletal Breakdown LR (A) | MC-LSN-1.9, MC-REF-2.E |
| EX-millennials-genz-prediction | Millennials / Gen-Z prediction type | Skeletal Breakdown LR (A) | MC-LSN-1.9, MC-REF-2.E |
| EX-miguel-blueberry-pie | Miguel's blueberry pie judgment type | Skeletal Breakdown LR (A) | MC-LSN-1.9, MC-REF-2.E |
| EX-3-classic-traps-recycling | Three classic traps (Premise / Last Claim / IC) | Synopsis (S) | MC-LSN-1.11, MC-REF-2.G |
| EX-transit-policy-concession | Transit policy concession | spec L1702 | MC-REF-2.A, MC-REF-2.I |

---

## Voice passages preserved verbatim (23)

Two registers per `rules/voice_calibration.md`:
- **R1 (decisive, verdict-style, procedural):** Reference, Question Simulator audits, drill instructions, named-tool callouts.
- **R2 (whimsical, parodic, metaphor-led):** Lessons prose, drill setup framing, voice-rich teaching.

| ID | Passage (excerpt) | Reg | Source | Used in |
|---|---|---|---|---|
| VP-hark-simple-argument | HARK, A SIMPLE ARGUMENT | R2 | Logical_Reasoning_Notes_Final | MC-LSN-1.1 |
| VP-claimy-judgments | claimy judgments that are usually wrong | R2 | Logical_Reasoning_Notes_Final | MC-LSN-1.1, 1.2 |
| VP-conclusions-hot-mess | conclusions are worthless and ridiculous like this... a hot mess on the floor | R2 | Logical_Reasoning_Notes_Final + Valid Conclusion Homework + Note | MC-LSN-1.1 |
| VP-most-salvageable | the most salvageable question type ever | R1 | Synopsis | MC-LSN-1.4 (1× cap) |
| VP-most-lovable | the most lovable question type ever | R1 | role_merged | MC-LSN-1.4 (1× cap) |
| VP-dont-over-complicate | Don't over-complicate this | R1 | Synopsis | MC-LSN-1.4 |
| VP-monsters-cluster-sentences | monsters called cluster sentences | R2 | Cluster Sentences Review | MC-HSL-5.1, 5.2 |
| VP-aghhhhhhhhh | (aghhhhhhhhh) | R2 | Cluster Sentences Review | MC-HSL-5.3 (1× cap) |
| VP-bad-writing-called-to-action | This is called bad writing... As an LSAT test taker, you are called to action. | R2 | Cluster Sentences Review | MC-HSL-5.3 |
| VP-purpose-of-writing | The purpose of writing is one thing... they create monsters called cluster sentences. | R2 | Cluster Sentences Review | MC-HSL-5.1 |
| VP-MEMORIZE-tattoo | MEMORIZE (TATTOO IT IF YOU HAVE TO) | R2 | Valid Conclusion Question Mastery SET docx | MC-DRL-3.6, MC-REF-2.A (1× cap) |
| VP-beautiful-starships | We call these beautiful starships valid conclusions. | R2 | Valid Conclusion Homework + Note | MC-DRL-3.6 |
| VP-world-of-the-premises | These whimsical premises keep you... the world of the premises is your whole world. | R2 | Valid Conclusion Worksheet HW | MC-DRL-3.6 |
| VP-stay-narrow | Stay narrow. | R1 | Masterclass Part 1 | MC-SIM-4.5, MC-TRAIT-5 |
| VP-too-strong | Too strong. | R1 | Masterclass | MC-SIM-4.5 |
| VP-unsupported | Unsupported. | R1 | Masterclass | MC-SIM-4.5 |
| VP-out-of-scope | Out of scope. | R1 | Masterclass | MC-SIM-4.5 |
| VP-masterclass-150s-160s-intro | For the student stuck in the 150s or 160s... | R1+ | Masterclass Part 1 | MC-SIM-4.7 |
| VP-take-time-on-answer-choices | Take just as much time to look over the answer choices as the stimulus, if not more. | R1 | Masterclass Part 1 | MC-SIM-4.7 |
| VP-feeling-the-pattern | This exercise is about getting our brains used to the feel of a pattern... | R2 | First sentence Conclusion (Reading Drill) | MC-DRL-3.3 |
| VP-attribution-pivot-opinion | the govt argues = attribution; but = Pivot; it is clear that = Opinion; misguided = Opinion / Rebuttal | R1 | Main Conclusion Drill Answer Key | MC-SIM-4.5 |
| VP-very-interesting-life | you live a very interesting life in this example | R2 | Logical_Reasoning_Notes_Final | MC-LSN-1.1 |
| VP-call-out-author-bad-writer | Remember all those things your English teachers used to write on your essays? | R2 | Cluster Sentences Review | MC-HSL-5.1 |

---

## Indicator categories (6)

Each renders as a color-coded card on the Indicator Vault (MC-REF-2.A) and has a chip set:

| ID | Category | Color | Word count (min) |
|---|---|---|---|
| IND-conclusion | Conclusion Indicators | --role-conclusion #10b981 | 12 |
| IND-premise-FABS | Premise Indicators (FABS) | --role-premise #60a5fa | 8 |
| IND-pivot | Pivot Indicators | --role-pivot #f97316 | 6 |
| IND-opinion | Opinion Indicators | --accent #E8D08B | 11 |
| IND-opposing | Opposing Viewpoint Indicators | --role-opposing #a855f7 | 8 |
| IND-concession | Concession Indicators | --role-concession #facc15 | 8 |

---

## Source files — Notes (49)

S-tier (15) → all v1. A-tier (17) → mostly v1, some v1.5. B-tier (5) → v1 supplemental. C-tier (1) → drop or absorb. D-tier (1) → Table B. (See `CONTENT_INVENTORY.json` for the per-file destination list.)

### S-tier highlights (preserve, full ingestion)
`_scan_Main conclusion part 1.pdf`, `_scan_Main conclusion part 2.pdf` (masterclass) · `Main Conclusion Synopsis.pdf` · `Intermediate conclusion and Hybrid argument notes _dup1.docx` · `MCFIRST SENTENCE : REBUTTAL.pdf` · `LOGICAL CHAIN.pdf` · `Logical_Reasoning_Notes_Final.pdf` (voice anchor) · `main_conclusion_role_merged_note.pdf` · `Main conclusion (recap)_dup1.pdf` · `Lecture 1 Notes LR Arguments Foundation_dup1.pdf` · `Cluster Sentences Review.docx` (cluster anchor) · `Cluster Sentences Review.docx.pdf` · `Intermediate_Conclusions_Practice_Full.docx` · `Valid Conclusion Worksheet HW_dup1.pdf`.

(Full per-file map in `CONTENT_INVENTORY.json` → `source_files.notes[]`.)

---

## Source files — Homework (21)

S-tier (7) → all v1. A-tier (8) → all v1. B-tier (3) → v1 supplemental + 1 Table B (superseded). C-tier (2) → drop or absorb (twins of Notes versions).

### S-tier highlights
`main_conclusion_answer_key_dup1.pdf` (primary answer key) · `Main Conclusion Drill Answer Key.pdf` · `Argument structure answer key.docx_dup1.pdf` · `R&R Drill Stage 2 Instructions.pdf` · `AP Answer Key.pdf` · `Argument Structure (refresher worksheet)_dup1.pdf` · `Premise & Conc exercise_dup1.pdf`.

(Full per-file map in `CONTENT_INVENTORY.json` → `source_files.homework[]`.)

---

## Source files — Netlify prototypes (5 unique, 6 deployed)

| ID | Alias | UX | Code | Local file | v1 use |
|---|---|---|---|---|---|
| PR-mainconclusionrebuttalvsfirst | MC Companion (Stage-Gate Tracker) | S | S | index (4).html | mechanic ports to MC-DRL-3.4 + MC-DIA-6.2 |
| PR-logicalreasoningfoundation | LR Field Manual | S | S | index (3).html | X-Ray + Gap Simulator + Focus Mode mechanics + sidebar nav port |
| PR-mainconclusion | MC Drill (cyberpunk) | A | A | index (6).html | chunk-tap + keyword-glow port; cyberpunk identity rejected |
| PR-introconclusiondrill | MC Analysis Lab | A | A | index (5).html | role-reveal-on-success mechanic ports; original stimuli on Table B |
| PR-argumentslr | LSAT Logic Tool | A | B | index (1).html (= index (2).html, byte-identical) | Trojan Horse + Coach's Note framings port; multi-topic content on Table B |

(Per-prototype detail in `CONTENT_INVENTORY.json` → `source_files.prototypes[]`.)

---

## Open questions (6)

See `CONTENT_INVENTORY.json` → `open_questions[]` for full text. Headlines:

1. **OQ-DRL-3.4** — Drill 3.4 Stage-Gate content sourcing (PT bank refs vs canonical 20 reuse vs placeholders). *Recommended: reuse canonical 20.*
2. **OQ-SIM-4.2-AC** — Module 4 Simulator missing answer-choice authorship (Joshua vs Claude). *Recommended: Joshua authors at Stage 4.*
3. **OQ-DRL-3.6-AI** — Drill 3.6 v1 evaluation (templated similarity vs LLM). *Recommended: pre-authored model answers + local-only sentence embeddings (transformers.js).*
4. **OQ-DRL-3.9-OCR** — Drill 3.9 source PDF re-OCR vs re-author. *Recommended: re-author.*
5. **OQ-RR-MOBILE** — R&R Drill mobile fallback shape. *Recommended: single-piece-at-a-time, no continuous recording on mobile.*
6. **OQ-CALIBRATION-CONTENT** — M1.13 + M5.8 capstone calibration content sourcing. *Recommended: curate calibration-only subset from canonical 20 + Cluster Sentences walkthrough variants.*

These are inputs to Gate 3 architecture and Gate 4 module builds. None block Gate 2 sign-off; all should land before Gate 3 lock.
