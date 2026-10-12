# Activity Centre

The home for bespoke, coach-led skill exercises (e.g. Negation Station) that a student is assigned and works through conversationally. Distinct from the question-bank MCQ **Drill** engine: Activities are authored content with their own answer keys, not timed runs over `qid` questions.

## Language

**Activity Centre**:
The module that hosts and lists Activities. The student's home for assigned skill work that isn't question-bank drilling.
_Avoid_: Activities Centre, Skills Centre, Drill Centre

**Activity**:
One bespoke skill exercise — a titled, self-contained set of authored items with an answer key, worked through with a coach (e.g. "Negation Station"). The unit a teacher assigns.
_Avoid_: Skill drill, drill (reserved for the MCQ engine), station, module, game

**Activity start page**:
An individual Activity's intro page: the page that shows the Activity title, item count, overview copy, example, and Start action before the student begins the first Question Set.
_Avoid_: Homepage (that word now means the Classroom's Home), LSAT U landing page, Foyer, Activity Centre list

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
Conditional Rephrase is the exception: its constrained `If ..., then ...` responses are judged by an authoritative local parser, so the Activity works without AI credits or a network request.
_Avoid_: Tutor (reserved for the standalone Tutor surface), bot, grader

**Verdict**:
The coach's judgement of a single student response: `correct`, `partial`, or `incorrect`. `partial` captures a near-miss the Activity exists to teach (e.g. a polar-opposite instead of a true negation). Drives the assignment score and future weakness analytics.
_Avoid_: Grade, mark, result

**Activity assignment**:
A per-student issued copy of an Activity, snapshotting its content at assign time and tracking the student's progress/score. Mirrors the homework `assignment` pattern; immutable snapshot once issued.
_Avoid_: Homework (that's the MCQ-set pattern), task

### Read, Recall, Colour

The four-step vocabulary of the RRC runner, plus the language its grading uses.
The source method's own words for these steps are listed under `_Avoid_` and are
never used in the product.

**Chunk**:
An authored cut of a stimulus, roughly a sentence, carrying the Details that fall inside it. A guide for her eye and the unit content is written in, never a boundary she is held to: she reads, recalls and colours in whatever units she likes.
_Avoid_: Line, segment, piece, part

**Read** (step 1):
The silent reading of a chunk. Nothing is spoken.
_Avoid_: Skim, study

**Retelling** (step 2):
Saying a chunk back out loud in her own words. **Retelling** is the word we use to each other and in code; the label a student reads is always **Tell it back**.
_Avoid_: Reading Recall (its former name, which put "Recall" on two different steps), Say it back (the old student label), translate, translation, paraphrase, summary, repeat-back

**Colouring In** (step 3):
Her spoken reaction to the chunk she just recalled — a thought, doubt, example, or joke that fits that chunk and no other.
_Avoid_: Quip, comment, annotation, reaction

**The Recall** (step 4):
The end of a stimulus, worked with the text gone: she says the whole argument back from memory. Graded on Coverage.
_Avoid_: Retelling (that is step 2), CLIR, recap, rebound, takeaway, The Read (see below: that is now the other number, not this step's former name)

**The Read**:
The analytical takeaway, and the second graded number: what the argument is DOING, as opposed to what it says. Authored per stimulus as `the_read`, judged as two flags, `read_given` and `read_matches` ([ADR 0025](../../../docs/adr/0025-the-read-is-the-second-number.md)). It is a dimension of the grading, never a fifth step she is asked to perform out loud.

It was step 4's name until [ADR 0012](../../../docs/adr/0012-the-recall-is-a-recap-from-memory.md) renamed that step to The Recall, and this entry did not exist for the six days between 0012 and 0025, so "The Read" read as simply retired. It is not. On the Report Card, **Your Read** is correct and must not be collapsed into The Recall: they are the reasoning half and the memory half, and they fail differently.
_Avoid_: Takeaway, the point, the gist, analysis

**the move**:
What a stimulus's Read turns on, in the judge's and the card's shorthand: the loophole, inference or conflict the argument runs on. Always defined on a surface before it is used, because "you found the move" means nothing to a student reading it for the first time.
_Avoid_: The trick, the gotcha, the key (reserved for the authored answer)

**Detail**:
One of the small authored facts a stimulus contains. PT102.S3.Q1 holds 21.
_Avoid_: Point, fact, bullet, item (reserved for an Activity's prompt)

**Coverage**:
How many of a stimulus's Details she carried, counted across everything she said about it rather than against any one Chunk.
_Avoid_: Accuracy, completeness, recall rate

**Reciting**:
Saying a stimulus back close to word-for-word. A failure of the Retelling, not a step of its own: Coverage looks perfect and nothing was understood.
_Avoid_: Parroting, copying, verbatim recall, memorising

**Listing**:
Delivering a stimulus as a flat run of facts rather than a story in her own words. The opposite failure to Reciting: Coverage looks perfect and the argument was never held together.
_Avoid_: Shopping list, itemising, enumerating

**Report Card**:
What a finished section produces: every stimulus graded on its own merits, showing what she missed and what she got perfect, with her own recording playable beside it. One player per stimulus, never per question, because two questions can share a stimulus and she recorded it once.
_Avoid_: Scorecard (informally taken by the MCQ Drill results screen), Verdict (that is the coach judging live, which this surface never does), results, grade, review

**Clip**:
One stimulus's worth of her recording, playable on the Report Card. A Clip is cut out of the single unbroken section recording after she finishes; it is never recorded as its own file, because the drill forbids stopping the microphone mid-section.
_Avoid_: Take, snippet, segment (that is the timing record the Clip is cut from), track

**Attempt**:
One complete run of one section by one student. A section may be attempted any number of times, and every Attempt keeps its own date, its own recording and its own Report Card. Nothing is overwritten and nothing is hidden once done.
_Avoid_: Try, retry, session (reserved for a tutoring session), run

**Ungraded**:
A stimulus the judge never answered for, because the call to it failed. Distinct from a stimulus she said nothing about, which is a real zero: this one has no measurement at all. It is excluded from Coverage and from every count of her habits, because reporting our outage as her behaviour is worse than reporting nothing.
_Avoid_: Failed, missing, unscored, zero, error

**Sweep**:
The scheduled re-drive of a finished section that never got a grade, or got a partial one. The client asks for grading the moment she stops and does not wait on the answer; the Sweep is what makes that ask safe to lose. A closed tab never costs a Report Card.
_Avoid_: Retry, cron, job, backfill, reconcile

### The section launch surface

The page a student meets before a section run, and the parts of it that carry
names. Nothing here is a phase of the runner; these are things drawn on one
page.

**Section Launch**:
The page a student lands on before running an RRC section: the method as four Beats, her last few Attempts, and the one control that starts the run. `SectionLaunch` in code, `.sl-` in CSS. It replaces the editorial intro for section mode only; the eight typed Activities keep theirs.
_Avoid_: The Chamber (the approved mockup's name for it, and already a world under `worlds/chamber/`), Activity start page (that is an Activity's own intro page), Homepage (that is the Classroom's Home), intro, splash, lobby, dashboard

**Beat**:
Internal code term for one of the four method steps shown on Section Launch. It may remain in implementation names, but it is never student-facing. Students see **step**: Read it, Tell it back, Colour it, Recall it.
_Avoid in student-facing copy_: Beat, beats, phase, tab, card

**Tick**:
One mark in the row that draws a past Attempt: one per stimulus slot, placed at its authored `item_order` rather than its array position. Four states, because three would lie — `recorded`, `notJudged` (the judge never answered, so the mark is hollow), `silent` (she spoke nothing into that stimulus), `missing`.
_Avoid_: Dot, pip, square, cell, bar

**Target**:
The clock the section was meant to fit, taken from the assignment's time goal at her resolved accommodation. It measures elapsed time and nothing else, and a run is only ever compared against a Target equal to its own.
_Avoid_: Goal (`within_goal` in the database also carries method conditions, which Target deliberately excludes), limit, par, deadline, pace
