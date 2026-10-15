# 0030 — The card says one thing to do next

Date: 2026-09-04
Status: accepted
Extends [0018](./0018-full-coverage-is-not-a-hundred-percent.md).

## Context

The 2026-09-03 audit asked one question of the Report Card that none of the
numbers on it answer: would she know what to do tomorrow?

She would not. Every line described what happened. The band said "Nearly
there". The habits row said "3 with no reaction of your own". Nothing said that
the reaction is the half of the drill that makes the memory stick, or which of
the five observations was the one to work on. A student who reads the card
learns that she held 83% and nothing about what to change, and the gap is not
missing data — the grader measured all of it and the card rendered it as
description.

Two smaller versions of the same silence sat beside it.

**Going over the goal got no comment at all.** "46:12 against a 25 minute goal"
rendered as plain uncoloured text. The qualifier under it fired only when she
was *inside* the time and short of the goal, so the one case most in need of a
word was the one case with none.

**A verdict resting on a mis-hearing had nothing to say for itself.** The v1
spec named transcription error as the top risk and named showing her the
transcript as the mitigation. The transcript was shown and nothing said what it
was for. In the audit's run, stimulus 5's judge reason quoted her as saying
"clearly moral characters"; the recording says **immoral**, Deepgram dropped
the prefix, and she was told she gave the wrong Read. There was no way for her
to know that was a possibility, let alone say so.

## Decision

**One sentence, derived from stored fields, or none.**
`recall/nextStep.ts` reads the grade and returns a single instruction, ranked:

1. She gave no Read at all on a third or more of the run. First because it is
   the criterion the method is built around: coverage answers "did you hold
   it", The Read answers "did you understand it", and a run with every detail
   and no Read is a memory exercise.
2. Reciting, then listing, then no colour, each on a third or more. Ordered by
   distance from the drill: saying it back word for word is not recall, a list
   is recall without understanding, no reaction is understanding with nothing
   to hold it.
3. The kind of Detail she dropped most, when at least three of one kind account
   for a third of her misses.
4. Otherwise nothing.

**A third, because below that it is one bad stimulus**, which that stimulus's
own row already says, and hoisting it to the top of the card overstates it.

**Never "plain facts".** One card cannot compute a share — it stores the
Details she missed and not the ones she carried — so the ranking at (3) is a
count, and a count always crowns the residual bucket, which outnumbers
everything else about eight to one. It is excluded rather than allowed to be on
every card ever printed.

**Never a generic encouragement.** A card that always says something is a card
whose advice she learns to skip. Silence is the correct output for a run that
said nothing clearly.

**Over the goal gets a sentence in the same register.** Not a rebuke: early
runs are slow by design and the briefing already says to go slower while it is
new, so it says what the goal is for rather than that she was late.

**Where the transcript is shown, one line says what it is for**: the marking is
done from these words, and if they are not what she said the marking is wrong.
"Hear it back" is already on that row, which is what lets her check, so the line
sits under the words rather than anywhere else on the card.

## Consequences

**The card asks for something, once.** It is the only line on it that does, and
that is what makes it readable rather than another observation in a list.

**A clean run still gets nothing.** By design, and it is the case that proves
the rule is not a fallback chain.

**A dispute is a conversation, not a record.** The transcript line ends with
"tell Joshua" because there is nowhere for a dispute to be stored. Where one
should land — a column, a table, the indicator ledger — is his call and was not
made, so the sentence shipped without the control. The sentence is most of the
value: she could not previously know a mis-hearing was possible.

**The advice re-derives, so a better ranking is one deploy away.** Nothing is
written into the grade, which means every Report Card ever produced gets the
sentence the current rules give it rather than the one that was current when it
was marked.
