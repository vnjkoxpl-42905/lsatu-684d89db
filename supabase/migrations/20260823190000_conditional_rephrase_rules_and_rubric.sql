-- Stage 11: the conditional-logic rule set reaches the student and the grader.
--
-- Until now `rules` carried five lines and `coach.rubric` four. Between them
-- they covered which words mark which side, and that a contrapositive negates
-- and swaps. Three things the drill actually tests were never written down,
-- and the grader could not catch any of them:
--
--   1. THE COMPOUND FLIP. Contraposing "If A and B, then C" gives
--      "If not C, then not A or not B". The and becomes an or. The old rules
--      said only "keep compound conditions whole", which a student satisfies
--      perfectly while writing "not A and not B" -- a strictly stronger claim
--      than the rule supports, and wrong. The rubric had no line to catch it,
--      so it was being credited. This is the largest correctness gap in the
--      Activity and the reason this migration exists.
--
--   2. THE TWO ILLEGAL MOVES, BY NAME. Running the arrow backwards, and
--      concluding the outcome fails because the trigger did not fire. The old
--      rules gestured at the first ("required but never a guarantee") and never
--      mentioned the second. Naming both gives the coach language to hand back
--      when a student makes one, instead of "that is not quite right".
--
--   3. BICONDITIONALS. "If and only if", "then and only then", and the
--      "otherwise" construction make the arrow run both ways. Nothing in the
--      instructions acknowledged that a two-way answer can be correct.
--
-- Also written down: unless/until/without as an if-not translation, and where
-- the negation lands in a no/none statement. Both were already being drilled by
-- items in the bank with nothing in the rules to support them.
--
-- ITEM CONTENT IS UNTOUCHED. No prompt, credited answer, explanation, Question
-- Type or ladder position moves here. This migration writes two fields.

update public.activities
set instructions = jsonb_set(
      jsonb_set(
        instructions,
        '{rules}',
        to_jsonb(ARRAY[
          'Some words introduce the sufficient condition and some introduce the necessary one. That is the whole game.',
          'If, when, whenever, every, all, the only: these mark the sufficient side, the trigger.',
          'Only if, only when, unless, without, requires, depends on, must: these mark the necessary side, what is required.',
          'A necessary condition is required but never a guarantee. It can be met and the thing still not happen.',
          'Unless, until and without all mean the same thing. Read them as if not, or ask yourself what is being required and put that on the then side.',
          'With no and none, the negation belongs to the second half. No X does Y becomes: if it is an X, then it does not do Y.',
          'Contrapositive: negate both sides and swap them.',
          'When you contrapose a compound, and becomes or, and or becomes and. If a thing needs both X and Y, then losing either one alone is enough to sink it.',
          'Two moves are always wrong. Running the arrow backwards, and deciding that because the trigger did not fire the outcome cannot happen.',
          'If and only if, then and only then, and otherwise all make the arrow run both ways. There the reverse direction is fair game.'
        ]::text[])
      ),
      '{coach,rubric}',
      to_jsonb(ARRAY[
        'Either direction is credited. The if-then form and its contrapositive are the same statement, so a student who supplies only one of them has still translated correctly.',
        'The core judgment is which condition is sufficient and which is necessary. Words like if, when, whenever, every, all and the only mark the sufficient side. Words like only if, only when, unless, without, except, requires, presupposes, depends on, necessitates and must mark the necessary side.',
        'Compound conditions (both X and Y) and internal contrasts (X rather than Y) must be carried into the answer whole, not simplified away.',
        'The compound flip is a correctness rule, not a stylistic one. Contraposing "If A and B, then C" yields "If not C, then not A or not B". A student who carries the and through unchanged has written a stronger claim than the statement supports, and that is an error to name, not a phrasing quibble. The same applies in reverse: an or on the trigger side becomes an and.',
        'Two errors have names worth using in the feedback. Reversing the arrow is treating the necessary condition as if meeting it guaranteed the trigger. Negating the trigger is concluding that because the trigger did not fire, the outcome cannot happen. Say which one the student made.',
        'Unless, until and without translate as if not on the trigger side. When the idea being negated there is itself a compound, the and or or inside it flips too.',
        'With no and none the negation attaches to the necessary side, never to the trigger. The subject of the sentence still goes on the if side, intact.',
        'If and only if, then and only then, and the otherwise construction are biconditionals: the arrow runs both ways. Credit either direction, and do not mark down a student who writes it as a two-way statement or as an either-or.',
        'Wording is free. Judge the logical structure, not the phrasing.'
      ]::text[])
    )
where slug = 'conditional-rephrase';

-- Stage 11 [v2] note: a migration that touches `instructions` must re-snapshot
-- the assignment copies too, or the change reaches new assignments only and
-- silently misses every one already issued -- including the coach rubric, which
-- is what actually grades the student.
--
-- The immutability guard exempts admins via has_role(auth.uid(), 'admin'), and
-- auth.uid() is NULL inside a migration, so the guard would raise and take the
-- whole migration down with it.
alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set instructions = src.instructions
from public.activities src
where a.activity_id = src.id
  and src.slug = 'conditional-rephrase'
  and a.status = 'assigned'
  and a.instructions is distinct from src.instructions;

alter table public.activity_assignments enable trigger user;
