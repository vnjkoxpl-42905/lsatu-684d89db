# Guided Drills & Explanations

The practice domain: how LSAT U presents drills, the questions inside them, and the teaching that wraps each one. Covers the drill surface (`src/components/drill/`, `src/pages/Drill.tsx`), the question bank (`src/lib/questionLoader.ts`, `public/data/PT*-LR.json`), and the guided-drill catalog (`src/lib/guidedDrills.ts`, `src/data/guidedDrillHtmlManifest.ts`).

## Language

**Question Explanation**:
The question-level teaching shown *after* a student answers one specific question. In the schema this is the `breakdown` (conclusion, conclusionSimple, evidence, justification, objection, prediction, crucialInsight) plus `answerChoiceExplanations` (per-choice verdict + whyCorrect/whyIncorrect) on an `LRQuestion`. One per question. Currently authored for **0 of 3,964** questions — this is the headline gap (Phase 2).
_Avoid_: explanation (ambiguous), breakdown (that's only one half), answer key, rationale.

**Drill Instruction Card**:
The drill-level teaching panel shown *before* a student starts a guided drill — teaches the pattern the drill targets ("these six questions all hide the conclusion in the first sentence..."). One per guided drill. Stored as `instruction_card: { left_md, right_md }` on a guided drill. The LSAT Lab equivalent is its "Info" card (captured verbatim in `[[LSAT-LAB-LR-INFO-CARDS]]` in the vault).
_Avoid_: info card (that's LSAT Lab's name), intro, launch card, explanation.

**Question Type**:
The LSAT task a question asks — *Main Conclusion, Flaw, Necessary Assumption, Strengthen, Paradox, Must Be True*, etc. Stored as `questionType` on a question (and `question_types[]` on a guided drill). The bank's raw values are messy (110 variants, casing dupes, 67 "Unknown") and need a canonical set (~25 types).
_Avoid_: qtype in prose (fine in code), category (that's Patterns/Process), question kind.

**Question Feature**:
A finer-grained pattern tag layered on top of the type — *First Sentence Conclusion, Explain Curious Fact, Anti-Causal, Famous Flaws, Conditional Diagramming, Missing Link / Idea*. Stored as `questionFeatures[]`. 60 clean values; this vocabulary effectively defines the guided-drill taxonomy.
_Avoid_: tag, pattern (overloaded), reasoning type (that's a separate field).

**Reasoning Type**:
The underlying logical structure — *Causation, Conditional Logic, Comparisons*. Stored as `reasoningType[]`. Distinct from Question Feature.
_Avoid_: using interchangeably with Question Feature.

**Drill Signature** (proposed):
The accurate definition of what a guided drill drills = the set of Question Types + Question Features of the *actual questions in its pool* (its qids), NOT the types/features merely mentioned in its Drill Instruction Card text.
_Avoid_: deriving a drill's targets from card prose alone (it over-captures).

**Guided Drill**:
A curated, fixed practice set of LSAT questions with a Drill Instruction Card and (target state) a deterministic ordered question list. 108 exist (`guidedDrillHtmlManifest.ts`).
_Avoid_: drill (too generic — could mean Smart Drill), set, assignment.
