# Activity Centre

The home for bespoke, coach-led skill exercises (e.g. Negation Station) that a student is assigned and works through conversationally. Distinct from the question-bank MCQ **Drill** engine: Activities are authored content with their own answer keys, not timed runs over `qid` questions.

## Language

**Activity Centre**:
The module that hosts and lists Activities. The student's home for assigned skill work that isn't question-bank drilling.
_Avoid_: Activities Centre, Skills Centre, Drill Centre

**Activity**:
One bespoke skill exercise — a titled, self-contained set of authored items with an answer key, worked through with a coach (e.g. "Negation Station"). The unit a teacher assigns.
_Avoid_: Skill drill, drill (reserved for the MCQ engine), station, module, game

**Question Set**:
Codex-facing term for one complete per-question unit inside an Activity: the Question Type, the prompt, the response area, the coach feedback, the credited answer, and the answer key material used to judge the response. In the UI, this should still be labeled "Question N"; when Joshua says "question set," he means this full unit, not the collection of all questions.
_Avoid_: Question collection, drill set, item bank

**Question Type**:
The classification pill inside a Question Set that names what kind of statement or reasoning form the student is working with (e.g. "Universal Statement," "Conditional Statement," "Causal Statement"). This is the canonical term for the label currently shown above the prompt.
_Avoid_: Category, tag, badge, label

**Drill**:
Reserved term. The existing question-bank engine: a timed run over multiple-choice questions pulled by `qid`. An Activity is NOT a Drill.

**Item**:
One prompt within an Activity that the student responds to (e.g. a single statement to negate). Ordered easy→hard as authored.
_Avoid_: Question (overloaded with the qid question bank), problem, task

**Credited answer**:
The author-supplied correct response to an Item, used as ground truth when the coach judges a student's response. Some Items carry several acceptable phrasings.
_Avoid_: Solution, key answer, right answer

**Coach**:
The conversational AI tutor that presents Items one at a time, reads the student's free-text response, and gives immediate supportive feedback against the credited answer. Built on the existing AI-gateway tutor pattern (`analyze-stem-response`).
_Avoid_: Tutor (reserved for the standalone Tutor surface), bot, grader

**Verdict**:
The coach's judgement of a single student response: `correct`, `partial`, or `incorrect`. `partial` captures a near-miss the Activity exists to teach (e.g. a polar-opposite instead of a true negation). Drives the assignment score and future weakness analytics.
_Avoid_: Grade, mark, result

**Activity assignment**:
A per-student issued copy of an Activity, snapshotting its content at assign time and tracking the student's progress/score. Mirrors the homework `assignment` pattern; immutable snapshot once issued.
_Avoid_: Homework (that's the MCQ-set pattern), task
