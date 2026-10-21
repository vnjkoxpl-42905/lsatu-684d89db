# A search hit is a finding aid, not the scope of the work it opens

The Question finder searches both banks from one box, so one result list mixes LR
questions and RC questions. The obvious design makes them behave alike: click a hit,
open that hit. RC can express it — **Question subset** already means "the passage
renders in full, but only these questions are asked" — so a one-question RC landing
was available and cost nothing to build.

We rejected it. An RC hit opens its whole passage with every question on it, while an
LR hit opens that one question, and the asymmetry is deliberate.

The reason is pedagogical, not technical. RC questions interrogate one reading. A
student who reads eight hundred words to answer a single question has paid the entire
cost of the passage and collected a seventh of the value, and worse, has practised a
habit the test never rewards — the real section always asks the full set off one read.
LR has no equivalent: its questions are self-contained, so opening one is the whole job.

Consequences worth naming:

- Results are grouped by bank, Logical Reasoning first, rather than interleaved by
  relevance. The grouping is what makes the different landing legible *before* the
  click: the RC group carries "whole passage · N questions" as its heading, so a
  student is never surprised by what opens. Interleaving would have hidden the one
  thing they need to know, and would additionally have required a relevance score
  shared by two rankers (`smartLRQuestionSearch.ts`, `features/rc/lib/rcSearch.ts`)
  that were built separately and do not agree.
- **Question subset** stays in the RC glossary and stays out of this path. It is
  reachable by assembling a set, never by searching. Search does not produce subsets.
- An LR hit opens a real attempt — a one-question type-drill in the drill runner, with
  the explanation withheld until the student commits. There is no path through the
  finder that shows a question without asking for an answer.
- The finder therefore has two destinations, not one, and every result row has to
  declare which it is. A row that does not say its bank is a bug, not a cosmetic gap.

Rejected alternatives: the symmetric one-question RC landing, described above; and
"open the hit, then offer the rest of the passage", which honours the click and
rescues the reading cost but adds a post-submit state whose only job is to undo a
decision we could simply make correctly the first time.
