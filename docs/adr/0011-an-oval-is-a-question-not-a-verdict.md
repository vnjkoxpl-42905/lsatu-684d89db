# 0011 — An oval is a question, not a verdict

Date: 2026-08-31
Status: Accepted

## Context

A student who builds their own LR set could only move forward through it. A full
section has always had the LawHub bottom strip — one oval per question, click any
of them to jump — and a built set had nothing equivalent, so the questions the
student chose could only be walked in the order they came out.

Two things were actually wrong, and only one of them was missing work:

1. `Drill.tsx` had been passing `onPrev` and `onAdvance` to `OfficialSmartDrillBar`
   for some time, but the bar never rendered those pills. The handlers were
   received and dropped. This was a bug, not a gap.
2. The oval strip genuinely did not exist for a built set.

Fixing (2) raised a question a section never had to answer. A section never
reveals, so its ovals could only ever mean "answered". A built set *does* reveal:
the moment a question is revealed the app knows whether the student got it right,
and that information could be shown on the oval — green for correct, red for
missed, jump straight to your misses.

## Decision

The strip stays exactly as rich as the section's. An oval carries three states and
no more: **current**, **answered**, **jumpable**. It never shows whether the answer
was right, in a set or anywhere else.

The reason is what an oval *is*. One oval stands for one **question** — a place to
go. It does not stand for an answer choice, even though on paper the bubble you
fill in is precisely your answer. Colouring ovals by correctness quietly recasts a
navigation control as a scorecard, and then the strip is doing two jobs and reads
as neither.

The strip is extracted into `AnswerOvals` so the section and the built set render
one component rather than two copies that drift apart.

Jumping commits any pending selection before it moves, for the same reason
Previous does: leaving a question must never be the thing that loses the answer on
it.

## Consequences

- A built set now navigates like a section: ovals, Previous, Next, free movement.
- Wanting a right/wrong overview after a set is a real want, and it now has an
  obvious home that is *not* the ovals — the post-set review screen, where being a
  scorecard is the job.
- `AnswerOvals` is shared, so a change to oval appearance lands in both surfaces at
  once. That is the point, and it also means neither surface can quietly diverge.
- Rejected: colouring on reveal, and colouring only after the set ends. Both were
  offered and both were declined on the grounds above.
