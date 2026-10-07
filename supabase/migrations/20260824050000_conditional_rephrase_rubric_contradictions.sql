-- Two contradictions inside the coach prompt, and the in-progress gap.
--
-- Found by adversarial review of the Stage 11 rubric, not by a failing student.
--
-- 1. "Either direction is credited" was written to mean "the if-then form OR
--    its contrapositive". Standing alone it also reads as "any direction",
--    which authorises the CONVERSE. Stage 11 then added a rule saying running
--    the arrow backwards is always wrong. So the same system prompt both
--    permitted and forbade the converse, and which one won was left to the
--    model. Now says which two forms are credited and names what is not.
--
-- 2. "do not mark down a student who writes it as a two-way statement or as an
--    either-or" was meant to allow "either both, or neither" for a
--    biconditional. But "either-or" reads as an EXCLUSIVE or, which is the
--    opposite relation, so the line invited a false positive on exactly the
--    items it was meant to protect. The permitted paraphrase is now spelled
--    out instead of gestured at.
--
-- 3. The Stage 11 migration re-snapshotted `status = 'assigned'` only, matching
--    every earlier content migration in this Activity. Those changed what the
--    student is ASKED, and leaving a live run alone was right. A rubric change
--    is different: it decides whether their answers are marked correctly, and
--    a student mid-run stayed on rules this repo already calls wrong.
--    `assigned` and `in_progress` both re-snapshot from here. `completed` stays
--    frozen, so a finished run is never re-scored under later rules.
--
--    There are zero `in_progress` rows for this Activity today, so this fixes
--    the rule rather than any student's record.
--
-- Item content is untouched. This writes coach.rubric only.

update public.activities
set instructions = jsonb_set(
      instructions,
      '{coach,rubric}',
      to_jsonb(ARRAY[
        'Two forms are credited and they are the same statement: the if-then form, and its contrapositive. A student who gives either one has translated correctly. Nothing else counts as a direction: the converse (swapping the two sides) and the inverse (negating both without swapping) are errors, not alternative phrasings.',
        'The core judgment is which condition is sufficient and which is necessary. Words like if, when, whenever, every, all and the only mark the sufficient side. Words like only if, only when, unless, without, except, requires, presupposes, depends on, necessitates and must mark the necessary side.',
        'Compound conditions (both X and Y) and internal contrasts (X rather than Y) must be carried into the answer whole, not simplified away.',
        'The compound flip is a correctness rule, not a stylistic one. Contraposing "If A and B, then C" yields "If not C, then not A or not B". A student who carries the and through unchanged has written a stronger claim than the statement supports, and that is an error to name, not a phrasing quibble. The same applies in reverse: an or on the trigger side becomes an and.',
        'Two errors have names worth using in the feedback. Reversing the arrow is treating the necessary condition as if meeting it guaranteed the trigger. Negating the trigger is concluding that because the trigger did not fire, the outcome cannot happen. Say which one the student made.',
        'Unless, until and without translate as if not on the trigger side. When the idea being negated there is itself a compound, the and or or inside it flips too.',
        'With no and none the negation attaches to the necessary side, never to the trigger. The subject of the sentence still goes on the if side, intact.',
        'If and only if, then and only then, and the otherwise construction are biconditionals, where the arrow genuinely runs both ways and the converse is therefore credited. Only on these items. A student may write both conditionals, or a single two-way statement, or say that the two sides stand or fall together. Do not credit an exclusive either-or, which says something different.',
        'Wording is free. Judge the logical structure, not the phrasing.'
      ]::text[])
    )
where slug = 'conditional-rephrase';

alter table public.activity_assignments disable trigger user;

update public.activity_assignments a
set instructions = src.instructions
from public.activities src
where a.activity_id = src.id
  and src.slug = 'conditional-rephrase'
  and a.status in ('assigned', 'in_progress')
  and a.instructions is distinct from src.instructions;

alter table public.activity_assignments enable trigger user;
