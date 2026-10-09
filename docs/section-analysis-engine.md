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

---

## Appendix A — the complete tip inventory

Every instruction, threshold, and heuristic stated in the webinar, in the order it is
said, with what it means and what the engine does with it. Nothing from the source is
left out, including the parts said in the Q&A rather than the presentation, because
half the usable thresholds are in the Q&A.

Each entry is: **timestamp · the tip · what we do with it.** "Detector" means the engine
can fire on it from data. "Prescription" means it is text the report hands the student
when a detector fires. "Teaching" means it belongs in the product's own copy, because no
report can enforce it from the outside.

### A.1 The frame (1:10 - 5:29)

1. **1:10 · Read the score report after every section.** The report exists at the end of
   blind review and holds the timing breakdown and every right and wrong answer. The
   student in the first example had never opened hers. *Teaching — the report has to
   arrive rather than wait to be found.*
2. **1:42 · Classify every error into one of four types.** Reading, logical reasoning
   (fundamentals), question type process, test taking. *The engine's whole output shape.*
3. **2:05 · Reading error** — misread something, a grammatical issue, a quantifier or a
   conclusion taken wrongly. *Category 1.*
4. **2:21 · Logical reasoning error** — causation, conditional reasoning, the fundamentals
   underneath the question. *Category 2.*
5. **2:21 · Question type process error** — "I don't know how to do a necessary assumption
   question," "I don't know how to do a most strongly supported question." *Category 3.*
6. **2:43 · Test-taking error** — skipped what should not have been skipped, did not skip
   what should have been, too long on a question, too long on the stimulus. *Category 4.*
7. **3:28 · Classification decides the prescription, and two of them are opposites.** A
   fundamentals error means it may be wrong to be sitting sections or prep tests at all
   right now — go back to the core curriculum. A test-taking error means the opposite:
   you are in the right place, sit more sections and more prep tests. *The report's
   "what to do next" block branches on category and must say which of these two it is.*
8. **4:30 · Diagnosis exists to produce a plan.** The point of naming the error is the
   remedy that follows from it, not the naming. *A finding with no prescription is not
   shipped.*
9. **4:57 · Students stop at the first label and miss the rest.** "I got this wrong
   because I misread" and then nothing — when the timing breakdown holds most of the
   story. *Why the report leads with the section's timing story, not the miss list.*

### A.2 The RC section (5:29 - 13:26)

10. **6:16 · Equal misses, unequal time, means the time bought nothing.** Passage 4 felt
    hard; she missed the same number on passages 2 and 3 while spending far longer there.
    *Detector R2.*
11. **6:42 · Know your own tool's quirks.** He warns the audience off a five-minute figure
    that was the comparative passage's B half, not a real reading. *Our own segmentation
    must never produce a number that needs explaining away.*
12. **7:14 · The last passage was not the problem; the earlier ones were.** She did not
    struggle with passage 4, she ran out of clock before it. *Detector R1 — the headline
    rule.*
13. **7:46 · Look at what the misses have in common within the slow stretch.** All of hers
    were inference questions, which turns a timing story into a timing *and* process
    story. *Detector R8, run inside the window R1 identifies rather than across the whole
    section.*
14. **8:30 · Time spent on questions can be moved back into the passage.** If the extra
    minutes on the questions are not buying accuracy, spend them understanding the
    passage instead and answer more efficiently. *Prescription, RC only, fires with R2.*
15. **9:02 · Rereading the passage hunting for a phrase is an inference-question process
    error.** Three minutes of scanning for something explicitly stated, on a question type
    whose answers are never explicitly stated. *Prescription attached to inference misses
    with long times.*
16. **9:47 · Mentioned is not supported.** The definitive line for the accept-the-stimulus
    family: something mentioned in the passage and something supported by the passage are
    different things. *Prescription text, verbatim in spirit.*
17. **9:47 · One section can carry two categories at once.** Test-taking and process, both
    real, both named. *The report never picks a single cause when two fired.*
18. **10:55 · Re-work every question of the failing type in that set, including the ones
    you got right.** You may have got them right for the wrong reason. *Prescription — the
    assignment generated from a process finding covers the whole type, not just the
    misses.*
19. **11:39 · The golden retriever example.** The author says all dogs are cute; an
    inference answer about golden retrievers is supported without ever being mentioned.
    *Teaching copy for the inference prescription.*
20. **12:01 · Write down, before the next test, what the issue was and what you will do
    differently.** *Product feature — §6.3's pre-test note. The next report opens on it.*
21. **12:22 · Treat every passage as if you were rushed.** She got the same results on the
    rushed passage as on the slow ones, so the slow pace was not buying anything and the
    rushed pace was not costing anything. *Prescription attached to R2 in RC.*

### A.3 The LG section (13:26 - 15:58)

Logic games are gone from the modern LSAT, so these do not run as detectors. The reasoning
transfers exactly to RC passages and to LR question clusters, which is why they are kept.

22. **13:44 · Slow-but-correct earlier work causes wrong answers later.** Questions he got
    right, taken slowly, are what cost him game 4. *Detector R1 counts time spent on
    correct answers, not only on misses. This is the part everyone leaves out.*
23. **14:32 · Blind review proves it was not a knowledge gap.** He got game 4's questions
    right in blind review, so the failure was the clock. *Detector R10, the separator.*
24. **14:55 · Fool-proof the earlier items until they come in under target time.*** The
    remedy is applied to the fast-and-slow ones at the start, not the ones missed at the
    end. *Prescription — the assignment targets the upstream items.*
25. **15:37 · Do not fixate on red at the bottom.** The most common mistake he sees in new
    clients' analytics. *Why the report's first paragraph is the section story and the
    miss list comes after it.*

### A.4 The second pass, round two (16:20 - 21:08)

26. **16:20 · Gaps in the timing bars are the second pass.** A gap means the student came
    back to that question later. *Requires absolute clock offsets (§6.2). This is the
    single field that makes the second pass visible at all.*
27. **17:09 · Six questions revisited, none changed.** He counts them out loud, by number.
    *Detector R4 — and the report must name the numbers the same way.*
28. **17:59 · The reason: reusing the first reading.** Going back with the understanding
    that produced the wrong answer inevitably reproduces the wrong answer. *Prescription.*
29. **18:38 · The fix is fewer questions, more time each.** Scrap some, spend the round-two
    minutes on the two you can actually convert; two points is the gap between a 150 and a
    160. *Prescription attached to R4.*
30. **19:26 · The two she did change were both the same question type.** Necessary
    assumption, twice — a process finding hiding inside a timing finding. *Detector R8
    run over the changed-answer subset specifically.*
31. **19:53 · Necessary assumption run as strengthen.** The specific, named confusion, with
    its cousin: pseudo-sufficient versus sufficient assumption. *Prescription.*
32. **20:40 · "Round two" means going back during the timed section, not blind review.**
    The distinction the whole of A.4 depends on. *Our data must not conflate an in-section
    revisit with a blind-review visit; they are different passes.*

### A.5 Confidence, flags, and question economics (21:24 - 38:38)

33. **22:21 · Overconfidence error — wrong, and never flagged.** The student did not know
    they were in trouble, so they never came back. *Detector R5.*
34. **22:53 · A five-star question is a bad place to spend a second pass.** Anyone has a
    better chance of converting a three-star than a five-star. *Detector R6.*
35. **23:19 · She had the right answer and changed it to E at the end.** *Detector R7,
    straight off the answer trail.*
36. **23:40 · If you are down to two answer choices, flag it.** His primary flag criterion.
    *Detector once eliminations are persisted (§4.3); prescription until then.*
37. **24:29 · Two to five minutes agonizing, then getting it wrong, is common and costly.**
    Scott's addition. *Detector R3, with the report naming the minutes.*
38. **24:56 · Even getting the hard question right can be the error.** If an easier one was
    available and unconverted, the time was misallocated whatever the outcome. *Detector
    R6 must not exempt correct answers.*
39. **29:36 · The accept/EXCEPT question chosen instantly and wrongly.** Picking the choice
    that *does* resolve, on a question asking which does not. *Detector R9 — fast answer,
    EXCEPT stem, wrong.*
40. **30:25 · The most time went to must be true and must be false.** Time clustering on
    one family, whether or not it produced misses. *Detector — time by family, not only
    accuracy by family.*
41. **31:10 · That cluster was a fundamentals gap.** Conditional reasoning and causation,
    not the question type's process. *Detector: cross the slow/missed cluster against the
    bank's reasoning tags (§6.1). This is the cleanest path to category 2 we have.*
42. **31:28 · Know when a must-be-true has become too hard, and leave it.** *Prescription.*
43. **31:58 · Six minutes across two questions for one point.** He names both numbers and
    the better use — a two-star strengthen left on the table. *Detector R3 in its strongest
    form: cost in minutes, return in points, and the cheaper question that went unworked.*
44. **25:40 · Misses that look random by label share one process.** Strengthen, weaken,
    resolve, evaluate, sufficient assumption — all of them add new information to the
    argument. *Detector R8, the family map.*
45. **27:15 · "It has nothing to do with the argument" is the wrong elimination.** Valid on
    a must-be-true, invalid on anything in the add-evidence family, where the answer is
    additional evidence and is not supposed to be in the stimulus. *Prescription — the
    single most reusable teaching line in the webinar.*
46. **33:01 · Underconfidence error — flagged or revisited, and right all along.** "Almost
    as egregious," because the second pass went to a question that did not need it.
    *Detector R5, the other half.*
47. **34:16 · Judge the section as a whole, not the one question that went wrong.**
    Restated on a near-perfect section. *Report structure.*
48. **35:21 · She went back to the questions she thought were hardest.** Q23 and Q24, both
    already right, while Q7 sat there cheap and unconverted. *Detector R6 over the
    second-pass set: what did the revisits cost, and what was available instead.*
49. **36:32 · Not going back to a flagged five-star question is correct play.** A flag is
    not an obligation. *Prevents the report from scolding a student for an unreturned flag
    when the economics were right.*
50. **37:09 · The goal is maximum points, not every question.** Going after the hard ones
    reads as a student trying to get everything right, which is the wrong strategy below
    a 180 target. *Report tone, and the basis of R6.*
51. **38:03 · Time economics, stated exactly.** Every question is worth the same and they
    cost different amounts of time, so buy the cheapest first — true even for a 180
    scorer. *The sentence R6 hands back.*

### A.6 The Q&A (38:38 - 1:01:14)

52. **39:46 · For RC, comprehension comes before tactics.** Skimming or reading too fast
    produces the low score, and no tactical fix outranks understanding what you read.
    *Prescription, RC.*
53. **40:48 · Diagnose which RC problem you have before choosing a fix.** Only reaching
    three passages is a timing problem; finishing with two minutes left and still missing
    is a comprehension problem. Same score, opposite remedies. *Detector: reached-count
    and leftover clock, which needs skip-versus-never-reached (§6.2).*
54. **41:25 · Accurate diagnosis is the hardest skill and the one they spend most time
    training.** *The reason this engine is worth building.*
55. **42:56 · Over target time with a near-perfect score is still a finding.** *Detector —
    a stretch can be flagged on time alone, with no misses in it.*
56. **43:24 · Split diffuse slowness from a single sink.** One question that ate the time
    is a different problem from a few extra seconds on every question; the second is a
    workflow problem, not a question problem. *Detector: compare the max single overage
    against the median overage before naming the cause.*
57. **44:28 · Fool-proof for inefficiency, not only for errors.** Mastery is getting it
    right *and* leaving time for the rest of the section. *Prescription.*
58. **46:02 · Flag to convert questions, not to express unease.** *Teaching.*
59. **46:18 · Do not flag when you confidently eliminated four and cannot articulate why
    the fifth is right.** That is a finished question. *Teaching — and it stops the report
    from treating every unflagged miss as an overconfidence error.*
60. **47:10 · The threshold: flag at 89% confident or below, do not flag at 90-100%.** If
    you flagged everything under 100% you would flag the whole section. *Detector once
    confidence is captured (§4.2); teaching until then.*
61. **47:25 · Flagging changes purpose as the test approaches.** Early on, flag for blind
    review; close to test day, flag only to convert points under time. *Report tone shifts
    with proximity to their test date, which we know.*
62. **47:45 · Flag on the clock: over 60-90s early in LR, over 90-120s later.** The "speed
    bump" rule, and the mechanic behind it — flagging and moving on relocates the question
    to the end of the section. *Detector: a question over the threshold for its position
    that was neither flagged nor left.*
63. **49:40 · On a flagged question, throw the first reading away.** You flagged it because
    something went wrong and you do not know what; treat it as wrong and redo it with a
    fine-tooth comb. Yes, it takes longer, and there is no other way to be confident.
    *Prescription attached to R4.*
64. **52:54 · Anything unflagged should be a 90% or better.** *Teaching, the mirror of 60.*
65. **53:15 · Under time you are not trying to get everything right.** Flagging everything
    destroys the signal — you can no longer tell a real doubt from nerves. *Teaching.*
66. **54:06 · The assumption-family pattern: slow when right, fast when wrong.** Her
    sufficient assumption and weaken questions took forever when she got them and were
    quick when she missed them. *Detector: per-family, compare mean time on correct
    answers against mean time on misses. A large gap in either direction is a finding —
    slow-right means no process, fast-wrong means a process being applied wrongly at
    speed.*
67. **54:25 · Know the goal of the question type, which is the fix for all of it.** For
    sufficient assumption: plug the choice in as a premise and ask whether the conclusion
    is now true, yes or no. *Prescription.*
68. **55:16 · "It was not stated in the stimulus" is not an objection to additional
    evidence.** Second statement of the same error as 45, on a different family.
    *Prescription.*
69. **55:36 · Sufficient assumption's bar is 100%, strengthen's is "more likely."** Meeting
    the strengthen bar on a sufficient assumption question is the specific failure.
    *Prescription.*
70. **56:34 · RC benchmarks: about 8 minutes a regular passage, about 9 for the
    comparative.** Over 12 on a comparative is where the problem is. And the read-A,
    answer, read-B method is legitimate but costs time. *Detector R11.*
71. **58:28 · Blind review must mirror the timed process.** Ask "under time conditions, how
    can I get this right," not "how can I get this right." *Teaching — the copy on the
    blind review screen itself.*
72. **1:00:00 · A blind review you could never reproduce under time is worse than none.**
    Taking your sweet time and reaching for a dictionary trains a habit the section will
    not allow, and confuses which process you are meant to be running. *Teaching.*

### A.7 What is in the source that we deliberately do not implement

- **Logic games detectors.** The section no longer exists. Their *reasoning* is kept
  wherever it transfers (22, 23, 24, 55, 56, 57).
- **The 7Sage star ratings as such.** We have our own difficulty plus, where transcribed,
  real cohort accuracy — which is strictly better than a star and should be preferred
  wherever a rule says "five-star."
- **Nothing else.** Every other tip above is either a detector, a prescription, or copy.
