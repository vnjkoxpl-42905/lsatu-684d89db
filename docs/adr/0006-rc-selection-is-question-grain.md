# RC selection is question-grain, and pace is priced per question

RC was built passage-first: `RcDrillSession` carries only `passageIds`, `buildItems()`
emits every question of every passage, and `totalBudgetSeconds()` prices the clock as
`secondsPerPassage × passageCount`. Merging the LR and RC pickers into one surface forced
the question: can a student add a single RC question to a set? We decided yes — the
remediation case (drill the four Inference questions a student keeps missing, across four
different passages) is the one Joshua reaches for most, and refusing it would have meant a
unified picker whose selection grain changed under the mode toggle.

Consequences worth naming, because none of them are visible from the picker:

- `rc_drill_sessions` gains a per-passage question subset. A session with no subset for a
  passage still asks every question in it, so existing rows keep their meaning.
- The passage always renders in full. A subset narrows what is asked, never what is read.
- Pace stops being flat per passage: one reading allowance per passage plus a per-question
  allowance for each question actually asked. Without this a three-question subset would
  have received the full 8:45 and every pace figure on the results page would have been
  wrong for subset sessions.
- `src/features/rc/CONTEXT.md` changed with it: **Passage** is now the unit of reading
  rather than the unit of selection, **Question subset** and **Pace** are new terms, and
  **Set** was taken over by the picker (a passage's positional sense became **Position**).

Rejected: keeping RC passage-only and letting question tags act purely as passage filters.
Simpler, no migration, and faithful to the original glossary — but it makes the commonest
teaching request impossible to express.
