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

**Answer Navigator** (the "bubbles"):
The strip along the bottom of the official testing frame: one small empty **oval**
per question in the queue, the question number printed *below* each oval, the
current question's number bold with a thin I-beam tick above it. Rendered by
`OfficialAnswerNavigator`. Joshua calls the ovals "bubbles"; the code calls them
ovals and the strip an answer navigator. Both names mean this one thing.
One oval stands for one **question**, never for an answer choice. This matters
because "bubble" is overloaded: on paper, the bubble you fill in IS your answer
(A-E). Here it is not. An oval is a place to go, so anything that turns it into a
verdict on your answer is out of scope for it by definition.
_Avoid_: pager (that is the RC per-question control that lives in the bar's
`pager` slot), dots, progress bar (it is navigation, not a progress readout),
and using "bubble" for an A-E answer choice.

**Oval State**:
What one oval in the Answer Navigator communicates. Today there are exactly three,
and they are orthogonal: **current** (which question you are on), **answered** (a
qid present in `attemptedQids`, meaning at least one recorded attempt), and
**jumpable** (clicking moves you there, governed by `jumpEnabled`). Notably there
is no correct/incorrect state: a section never reveals, so the strip has never had
to say whether an answer was right.
_Avoid_: "completed" or "done" (answered does not mean finished or correct),
"selected" (that is an answer choice, not an oval).

**Drill Launch**:
Everything the runner needs to be told in order to start a drill: which kind of
drill, and the name of the particular run. It is carried in the URL and nowhere
else, so any drill can be refreshed, bookmarked, or reopened. A Drill Launch
names a run; it does not contain one. The questions, the answers already given
and the position in the queue live in the Run Record.
_Avoid_: route state, config (that word currently means two different things in
the code, a filter and a fixed question list), params, drill options.

**Drill Run Spec**:
A Drill Launch after its row has been read: the mode, the question list or the
filter that draws one, and the ids saying which stored row this run belongs to.
Built by `drillRunSpecFromLaunch` and handed to the runner through context by
`DrillLaunchGate`, which is the only way the runner learns what it is running.
The Drill Launch is what a link says; the Drill Run Spec is what the runner is
told. One is written and read from a URL, the other never touches one.
_Avoid_: route state (the shape this replaced, and it read the URL a second
time), drill config (that word already means a filter or a fixed list), session.

**Run Record**:
The durable row, per student per run, holding what a run actually consists of:
the ordered question list, every attempt, the position, and the clock already
spent. Survives a closed tab, a sign-out, and a different device. It is the
reason a Drill Launch can be short: the launch names the run and the Run Record
supplies its contents. A named generated run is keyed by that name, such as a
Bootcamp day and part or a Guided drill id, so a fresh draw cannot strand the
record behind a different question list.
_Avoid_: resume state (that is what it is for, not what it is), snapshot (that is
one write to it), session (overloaded: `DrillSession` is the in-memory object for
the current screen, and an auth session is a third thing).

**Answer** (the pill):
The on/off control in the session strip that shows which choice is correct.
On: the correct choice's badge goes green, and if the student already submitted
a different choice, that one goes red. Off: both colours leave and the choices
read as untouched. It says nothing about *why*; that is the Explanation pill.
Neither direction locks anything and neither direction touches the logged
attempt. Mirrors LSAT Lab's Answer button ("Show correct answer" / hide).
_Avoid_: reveal (the code's word; fine in code, but "reveal" sounds one-way and
this is a toggle), solution, show answer.

**Explanation** (the pill):
The on/off control beside Answer that opens the whole Question Explanation:
the Argument Breakdown expander under the stimulus and a Choice Note expander
on every noted choice, all closed until the student opens them. Off folds all of it away and leaves the question exactly as it
was, including any Answer colouring already on. Never opens on its own: a wrong
submit does not press it, only the student does. Mirrors LSAT Lab's
Explanation button ("Hide explanations").
_Avoid_: breakdown (that is one half of what it opens), tutor, coach.

**Argument Breakdown**:
The question-level half of a Question Explanation: the ordered labelled steps
(Background, Evidence, Conclusion, Evaluate, Goal, and so on) plus the style
pills (Standard / Brief / Another Way) when the source published more than one
style. Lives under the stimulus while Explanation is on, behind a chevron on a
rule that the student opens, and is repeated in the drawer's Explanation tab.
_Avoid_: explanation (the pill), breakdown steps, analysis.

**Choice Note**:
The per-choice half of a Question Explanation: one choice's tag ("Out of
Scope", "Premise"), its "% of students", and its prose. Rendered as a dropdown
under that choice, closed by default while Explanation is on, behind a chevron
button at the right edge of the choice card that the student opens and closes
per choice. A choice with nothing published gets
no dropdown at all, never an empty one.
_Avoid_: inline explanation (the component's old name), answer explanation,
rationale.

**Reset Response**:
The control under the choices that clears the student's pick and nothing else.
The timer keeps running, the Answer and Explanation pills keep their state, and
an attempt already logged stays logged. Greyed out until a choice is picked.
A pick made after a Reset on an already-attempted question is practice, not a
second attempt. Mirrors LSAT Lab's Reset Response button.
_Avoid_: undo, clear, retry (retry implies a new scored attempt).

**AI Tutor**:
The generated coaching surfaces on the drill screen: the Coach chat that used to
open after a wrong answer, the "Ask Joshua about this question" hand-off on a
question with no authored prose, and the "Explain your reasoning" voice chip.
Distinct from the Question Explanation, which is transcribed LSAT Lab content
and never generated. Off for every student as of 2026-09-12 behind one switch;
the code stays so it can be turned back on.
_Avoid_: tutor mode (the code's flag name), Joshua (the chat's persona; a
student reading "Joshua is having trouble" thinks the person is), coach (one of
its tabs).
