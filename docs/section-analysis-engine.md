# Section analysis engine

What the report on a sat section has to say, and how each claim is earned.

The model is the 7Sage tutoring webinar (Chris Nguyen and Scott Milam, 2022-01-11,
`https://www.youtube.com/watch?v=t8SyvQWQtfQ`, full transcript clipped to the vault at
`Clippings/7Sage LSAT Tutoring Webinar.md`). This is not a summary of it. It is the
same diagnosis, written as rules a machine can run over one `section_history` row.

The whole webinar rests on one claim, and the engine exists to act on it:

> "So often we can get fixated on the logic of this question ... when often a huge part
> of the story of why you got any particular question wrong is the timing as much as it
> was your understanding of the underlying material."

A wrong answer is not a finding. **Why** it was wrong is the finding, because each cause
has a different prescription, and two of them are opposites: a fundamentals gap means
*stop sitting sections and go back to the curriculum*, while a test-taking gap means
*sit more sections*. Get the category wrong and the student spends a month on the wrong
work.

---

## 1. The four error categories

Verbatim from the webinar, in its order.

| # | Category | What it is | What it prescribes |
|---|---|---|---|
| 1 | **Reading error** | Misread the stimulus, a grammatical/quantifier slip, misidentified the conclusion, misread the question stem (the EXCEPT question read as an ordinary one) | Slow the read on the specific failure; not a curriculum problem |
| 2 | **Logical reasoning error** (fundamentals) | Conditional reasoning, causation — the underlying logic | **Go back to the core curriculum. Stop taking sections and prep tests for now** |
| 3 | **Question type process error** | Does not know how to run that question type. Necessary assumption run as strengthen; inference run as "must be mentioned in the passage"; a strengthen choice eliminated because "it wasn't stated in the argument" | Rebuild the process for that type, then drill that type |
| 4 | **Test-taking error** | Skipped what should not have been skipped, did not skip what should have been; too long on one question; too long on the stimulus; a wasted second pass; a bad flag decision | **Sit more sections. This is practice, not study** |

Two categories can be true of one question at once. The RC example in the webinar ends
with exactly that: "here we found out one there was a test taking error and two there
was a question type process error."

---

## 2. The rules

Each rule states the signal, the data it needs, and the sentence it produces. A rule
fires or stays silent; it never hedges.

### R1 — Time debt upstream (the section-as-a-whole rule)

The single most important rule, and the one students get backwards.

> "They tend to fixate on anything that's red, especially if it occurs at the bottom,
> and they can completely neglect the fact that the errors that happen at the end of a
> section really are often caused by timing errors or other mistakes that you make
> earlier on in that section."

The webinar runs it twice. RC: the student swore passage 4 was hard; she missed the same
number on passages 2 and 3 while spending far longer on them, and simply ran out of time.
LG: the student blamed game 4; games 1-3 ate the clock, and blind review proved he could
do game 4's questions.

**Signal.** Questions late in the queue that were unanswered, or answered far under the
student's own median, while questions earlier in the queue ran far over the pace owed.

**Needs.** Per-question time, queue order, pace owed (section clock ÷ questions —
accommodation-aware), and unanswered flags. *All present today.*

**Says.** "You did not run out of ability on Q21-26. You ran out of clock. Q7 and Q13
took 4:52 between them and returned one point."

### R2 — Time that bought nothing

> "There's a lot of time being spent here that's not being spent here but she came out
> with the same results from each."

**Signal.** Compare accuracy per minute across halves/quarters of the section (RC: across
passages). Where a slower stretch scores no better than a faster one, the extra time was
not buying accuracy.

**Needs.** Per-question time and correctness, grouped. *Present.*

**Says.** "The first half took 21:10 and scored 8/13. The second took 13:50 and scored
8/13. The extra seven minutes bought nothing."

### R3 — Bang for the buck

> "We spent about six minutes to get one question right. I don't think that's a good bang
> for our buck." · "I see so often ... they waste two, three, four, sometimes even five
> minutes agonizing over a question and then they end up not even getting that question
> right."

**Signal.** Any question over ~2.5× the pace owed. Ranked by cost, wrong ones first.
Cross-referenced with difficulty (R6).

**Needs.** Per-question time, pace owed, difficulty. *Present.*

### R4 — The wasted second pass

> "One two three four five six questions that she came back to on her second round and
> did not change her answer ... if you use your past understanding on your second pass
> you're inevitably going to get to the same reasoning that it was wrong for in the first
> instance."

**Signal.** A question visited more than once where the answer never changed. Time spent
on the later visits is time that bought nothing, and the prescription is specific: on a
flagged question, throw the first reading away and start fresh — "almost like I'm going
back to blind review in my second round."

**Needs.** Per-visit segments. **The answer trail gives the changes; it does not yet give
a revisit that changed nothing.** See §4.1.

### R5 — Confidence errors

Two named errors, opposite shapes, both costly.

- **Overconfidence error** — wrong, and not flagged. The student never knew. This is the
  worst kind, because a flag would have bought a second look: "if she was able to flag
  this question perhaps she would have chosen to go back to question 19 instead of
  spending all of her time on question 13."
- **Underconfidence error** — flagged or revisited, and right all along. "Almost as
  egregious," because the second pass was spent on a question that did not need it.

The webinar's flagging rules, which the report should quote back as the fix:
- Flag when you are down to two answer choices.
- Flag at 89% confidence or below; do not flag at 90-100%.
- Do **not** flag when you confidently eliminated four and simply cannot articulate why
  the fifth is right.
- Flag on time: over 60-90s early in an LR section, over 90-120s later — "speed bump"
  questions.

**Needs.** Flag state (present, `brMarked`), correctness (present), and **confidence at
answer time** (field exists, section runner never asks). See §4.2.

### R6 — Question economics

> "Every single question is worth the exact same amount but they all cost different
> amounts of time in order to resolve. You want to buy the cheapest ones first."

**Signal.** Time sunk into 4-5 star questions while 1-3 star questions were missed,
rushed, or never reached. Also: a second pass spent on the hardest questions rather than
the cheapest — "why go to these types of questions when you can go back to a question
like question seven."

**Needs.** Difficulty (present), time (present), pass order (see §4.1).

### R7 — The answer they had and gave away

> "Notice here how she had the right answer but she changed it to E at the last minute."

**Signal.** An answer trail whose earlier entry is the correct answer and whose final
entry is not. Pair it with the flag state: changed away from correct **and** not flagged
is an overconfidence error with a name.

**Needs.** The answer trail. *Present as of the timeline work.*

### R8 — Process families, not labels

> "At first glance the questions this student got wrong can seem a little random ... but
> actually ... for every single one of these questions we're adding information into the
> argument."

Misses that look scattered by question type often share one process. The engine groups by
family before it reports by type:

- **Add new evidence ("if true")** — Strengthen, Weaken, Resolve/Explain, Sufficient
  Assumption, Principle-Justify, Evaluate. Shared failure: eliminating a choice because
  "it wasn't stated in the argument," which is a valid move on a Must Be True and a
  category error here.
- **Accept the stimulus as true** — Must Be True, Most Strongly Supported, Inference.
  Shared failure: accepting what is *mentioned* rather than what is *supported*.
- **Argument structure** — Flaw, Method, Role, Parallel, Parallel Flaw.
- **Assumption** — Necessary vs Sufficient, whose confusion the webinar treats as its own
  finding ("she was treating the necessary assumption questions like a strengthening
  question").

**Needs.** Question type per question. *Present.* The family map is ours to author.

### R9 — Stem misreads

> "The student immediately just chose A, got it wrong, it was an overconfidence error ...
> but if you look at what type of question it is, it's an accept question."

**Signal.** EXCEPT / LEAST / NOT questions missed at a rate above the student's own base
rate, especially when answered fast. Reported as a reading error, not a process error.

**Needs.** A stem flag on the question bank (derivable from the stem text).

### R10 — Blind review is the separator

The lever that splits the two gaps the whole report exists to distinguish.

- Wrong under time, **right in blind review** → not a knowledge gap. Timing or process.
- Wrong under time, **wrong again in blind review** → knowledge gap. Category 1, 2 or 3.
- Right under time, wrong in blind review → a guess that landed. Not a point to count on.

The webinar uses it exactly this way on the LG section: "it kind of reinforces that with
how when the student was doing blind review he was able to get the questions correct as
well, so the error here wasn't game four."

**Needs.** Blind review results. *Present.*

### R11 — Section-shape benchmarks

RC: about 8 minutes per regular passage, about 9 for the comparative pair. Over that, look
there first. LG: a game over target time is worth fool-proofing **even when every question
was right** — "that's a huge part of what it means to truly master a game."

**Needs.** Passage/game segmentation of time. RC segmentation exists; LR sections have no
equivalent grouping and use the pace-owed line instead.

---

## 3. The report

One section, one report, stored at completion so it is fixed history and can be compared
over time. Never regenerated on read — a report that changes when the rules change stops
being a record of what was said.

**Structure, in the webinar's own order:**

1. **The headline.** One sentence naming the dominant cause, not the score. "This section
   was a timing section, not a knowledge section."
2. **The four categories**, each with: how many questions, what percent of the misses,
   and **the specific questions** — never a category without its examples.
3. **The section story.** R1 and R2: where the clock went and what it bought.
4. **The specific findings.** R3-R9, each a sentence with question numbers and times.
5. **What to do next time**, split by category, because the prescriptions differ:
   fundamentals → curriculum, process → that type's drills, test-taking → more sections.
   The webinar's own instruction to the student: *write down before your next test what
   you thought the issue was and what you will do differently.*
6. **Over time.** Category mix, pace, flag accuracy, and family accuracy across every
   section sat — so a student can see whether last month's diagnosis was acted on.

**Rules of the report.** Every claim carries its questions. Nothing is stated as a
percentage without the count behind it. A rule with no signal is silent rather than
reassuring, and a report with nothing to say says so.

---

## 4. What we would have to capture

Everything above runs on data we already keep, except these. Each is small, and each
unlocks a rule that is otherwise guesswork.

### 4.1 Per-visit segments (unlocks R4, sharpens R6)

We record each answer with the time it was put down. We do not record a **visit that
changed nothing** — the six questions in the webinar that were revisited and left alone
are invisible to us. Capture: pass number and time per visit, which the section runner
already knows every time it navigates.

### 4.2 Confidence at answer time (unlocks R5 properly)

The field exists and the section runner never asks. Without it, an overconfidence error
is inferred from the absence of a flag, which is weaker than the webinar's version. The
cheapest honest version is the one the webinar itself prescribes: a single tap at 89%-or-
below, which *is* the flag — so the fix may be to teach the flag's meaning rather than add
a control.

### 4.3 Eliminations, with times (unlocks the flag rule in R5)

We already track eliminated choices in the runner and throw them away at the end.
Persisting them gives "down to two answer choices" — the webinar's primary flag
criterion — and turns R5's advice from a general rule into "on Q19 you were down to two
and did not flag."

### 4.4 Time before the first commitment (unlocks the stimulus half of category 4)

"I spent too much time on the stimulus when I should have skipped." The first entry in
the answer trail already approximates this: time to first answer. Worth naming and
reporting rather than adding new capture.

### 4.5 The student's own miss reason (sharpens every category)

One tap during blind review — misread / fundamentals / process / timing — is the single
highest-value addition. It turns inference into evidence, and it is the same act the
webinar asks students to perform by hand.

### 4.6 EXCEPT / LEAST / NOT stem flag (unlocks R9)

Derivable from the stem text once, stored on the question bank.

---

## 5. What this is not

Not a score predictor, not a grade of the student, and not a list of every question they
got wrong — they already have that. It is the tutor's read of one sitting: what the clock
did, what the process did, what the fundamentals did, and which of the three to spend the
next week on.

---

## 6. Everything else worth capturing

§4 lists what the eleven rules need. This is the wider sweep: what would make the report
a tutor's read rather than a scorer's, ordered by what it costs us to get.

### 6.1 Already in the data, unused

Nothing to capture. These are rules we have not written yet.

- **Reasoning tags on the question bank.** Every question already carries `reasoningType`
  and `questionFeatures` — conditional, causal, quantifier. This is the direct detector
  for error category 2, which is otherwise the hardest to tell from category 3: misses
  clustering on conditional-tagged questions *is* a conditional reasoning gap, and it
  names the curriculum page to go back to. The webinar reaches this conclusion by hand
  ("the student needed a little help on conditional reasoning and causation"); we can
  reach it from the tags.
- **Which wrong choice was chosen, and how many people choose it.** The bank's
  explanations carry per-choice text and, where transcribed, the share of test takers who
  pick each one. "You took the trap that 38% take" is a finding. "You took a choice
  almost nobody takes" is a different finding — that is a reading error, not a trap.
- **Cohort accuracy per question.** Difficulty stars are coarse. Missing a question that
  85% of test takers get right is the single most actionable line a report can contain,
  and it is what makes R6's economics real rather than nominal.
- **Repeat exposure.** `question_usage` and `question_views` already know whether this
  student has seen this question before. A miss on a question they have already worked is
  a different fact from a miss on a fresh one.

### 6.2 Cheap capture, high value

- **The section timeline in absolute clock offsets.** We store how long each question
  took. We do not store *when in the section* it happened. That one field turns the
  per-question list into the timing bar chart the whole webinar is read off — where the
  gaps are, when the second pass started, and what was happening in the last four minutes.
  Everything in R1 gets sharper and the report gains a picture.
- **Skip decisions.** A question entered, worked, and left unanswered is a decision; a
  question never reached is a clock failure. Today both land as "unanswered" and the
  webinar's category 4 depends on telling them apart ("I skipped something I wasn't
  supposed to skip" versus "I didn't skip when I should have").
- **Flag events, not final flag state.** A flag placed and then removed says the student
  talked themselves out of a doubt they were right to have. When it was placed — during
  the first pass, or at the end — is the difference between flagging as a working tool and
  flagging as an afterthought.
- **Bulk-fill at the buzzer.** Answers landing in the last sixty seconds are guesses, and
  counting them as knowledge inflates every category. With absolute offsets this is free.
- **Pause count and duration.** A section sat in three chunks over two days is not a
  section, and no report should compare it to one sat straight through. We now resume
  sections across devices, which makes this necessary rather than nice.
- **When it was sat.** Date, hour, and how many sittings it took. "Sat at 11:40pm across
  three sittings" explains a result that otherwise looks like a knowledge collapse.
- **Highlighting.** The runner already has highlights and discards them. Whether a student
  annotated the stimulus at all is a real signal in RC, where the webinar's prescription
  is literally to move time out of the questions and back into the passage.

### 6.3 Bigger builds, worth naming now

- **RC: reading time versus question time, per passage.** The webinar's central RC advice
  is to take time out of the questions and put it back into the passage. We cannot say
  whether a student is doing that without splitting the two. This is the one measurement
  that would let the RC half of the report stand on its own.
- **The pre-test note.** The webinar tells students, in as many words, to write down
  before the next test what they thought the issue was and what they will do differently.
  A field on the next sitting holding that note closes the loop no other product closes:
  the following report can open with whether they did the thing they said they would.
- **The tutor's own tag.** One field per question where Joshua records his read after
  working it with the student. The engine's category is inference; his is evidence, and
  over a term it becomes the training set for every rule here.
- **Stamina.** Accuracy by position in the section, tracked across every section sat.
  Nothing in one sitting reveals it; twenty sittings do, and it changes what a study plan
  should look like.
