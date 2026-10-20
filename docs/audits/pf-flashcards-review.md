# PF Flashcards — full dump for semantic review

**Source:** `src/bootcamps/principle-flaw/data.ts:807` (`flashcards: Flashcard[]`)
**Total cards:** 40
**Structural check:** all `front` and `back` fields are non-empty strings. No nulls, no missing values.

**Purpose of this file:** the user reviews semantic accuracy of `back` text — answers that are *factually wrong*, *misleading*, or *out-of-step with the PF lesson framework*. Mark corrections inline below; I'll patch `data.ts` in a follow-up pass.

**How to mark a fix:** add a `> FIX:` line directly under the card.
Example:
```
{ id: "f-7", topic: "Flaw", tag: "Test", front: "What is the truth test...", back: "If you treat the answer as true and the conclusion gets weaker, it’s a valid objection." }
> FIX: change back to "If you treat the answer as true and the conclusion gets WEAKER OR DOES NOT FOLLOW, it's a valid objection — the answer surfaces a real gap the author ignored."
```

---

## Flaw (15 cards)

### f-1 · tag: Basics
- **front:** What is a Flaw question asking?
- **back:** It asks for the logical error in the transition from evidence to conclusion. It’s not asking if the facts are true, but why they don’t prove the goal.

### f-2 · tag: Basics
- **front:** What is the four-step Flaw method?
- **back:** 1. Conclusion. 2. Evidence. 3. Assumption (Gap). 4. Predict the Flaw.

### f-3 · tag: Style
- **front:** What is an assumption-style answer?
- **back:** An answer that describes what the author needed but didn’t say. (Uses: 'assumes', 'takes for granted')

### f-4 · tag: Style
- **front:** What is an objection-style answer?
- **back:** An answer that describes a possibility the author ignored. (Uses: 'fails to consider', 'overlooks')

### f-5 · tag: Style
- **front:** What is an abstract match answer?
- **back:** An answer that uses logic jargon to describe the movement. (Uses: 'infers a X from Y')

### f-6 · tag: Test
- **front:** What is the negation test for assumption-style Flaw answers?
- **back:** If you make the answer false and the argument dies, it’s a necessary assumption of the author.

### f-7 · tag: Test
- **front:** What is the truth test for objection-style Flaw answers?
- **back:** If you treat the answer as true and the conclusion gets weaker, it’s a valid objection.

### f-8 · tag: Trap
- **front:** What is a too-strong trap?
- **back:** An answer using extreme words (always, never) when the argument only needed a likely or possible connection.

### f-9 · tag: Trap
- **front:** What is a wrong-flaw trap?
- **back:** Describing a real logical error (like circular reasoning) that simply didn't happen in this specific story.

### f-10 · tag: Trap
- **front:** What is reversed logic?
- **back:** Using the right facts but flipping the direction of the error (e.g., A confuses for B instead of B for A).

### f-11 · tag: Concepts
- **front:** What is a causal flaw?
- **back:** Assuming correlation implies causation, or ignoring alternative causes.

### f-12 · tag: Concepts
- **front:** What is a necessary vs sufficient flaw?
- **back:** Treating a requirement as enough to guarantee an outcome.

### f-13 · tag: Concepts
- **front:** What is a part vs whole flaw?
- **back:** Assuming what’s true of the parts is true of the collective, or vice versa.

### f-14 · tag: Concepts
- **front:** What is unproven vs false?
- **back:** Thinking that a lack of evidence for X proves that X is false.

### f-15 · tag: Concepts
- **front:** What is a sampling flaw?
- **back:** Generalizing from an unrepresentative or biased group.

---

## Principle (15 cards)

### p-1 · tag: Basics
- **front:** What is a Principle question?
- **back:** A question about general rules or logical standards that govern specific situations.

### p-2 · tag: Framework
- **front:** What are the four parts of the Principle framework?
- **back:** 1. Rule. 2. Trigger. 3. Application. 4. Outcome.

### p-3 · tag: Framework
- **front:** What is the rule?
- **back:** The general 'If... then' standard being discussed.

### p-4 · tag: Framework
- **front:** What is the trigger?
- **back:** The 'If' part; the condition that must be met to activate the rule.

### p-5 · tag: Framework
- **front:** What is the application?
- **back:** The specific case or set of facts we are testing.

### p-6 · tag: Framework
- **front:** What is the outcome?
- **back:** The 'Then' part; the result required if the trigger is met.

### p-7 · tag: Types
- **front:** What is Principle Strengthen?
- **back:** Giving a rule that connects the stimulus facts to the conclusion.

### p-8 · tag: Types
- **front:** What is Strengthen Application?
- **back:** Providing the missing fact to trigger a rule already stated.

### p-9 · tag: Types
- **front:** What is Principle Conform?
- **back:** Finding a situation that obeys the logical movement of the stimulus rule.

### p-10 · tag: Concepts
- **front:** What is an implicit principle?
- **back:** A rule that isn't stated but is required for the argument to make sense.

### p-11 · tag: Trap
- **front:** What does too broad mean?
- **back:** A rule that covers many cases but doesn't specifically help the stimulus bridge.

### p-12 · tag: Trap
- **front:** What does too narrow mean?
- **back:** A rule that only covers part of the stimulus gap or adds irrelevant conditions.

### p-13 · tag: Trap
- **front:** What is a rule mismatch?
- **back:** The answer uses the right topics but the wrong logical relationship (flips trigger/outcome).

### p-14 · tag: Trap
- **front:** What is the missing trigger problem?
- **back:** Concluding the outcome happens without proving the required trigger facts.

### p-15 · tag: Review
- **front:** What is the review template for Principle questions?
- **back:** Map: Rule -> Trigger -> Application -> Outcome. Find exactly where the match failed.

---

## Parallel Flaw (5 cards)

### pa-1 · tag: Goal
- **front:** What is the goal of Parallel Flaw?
- **back:** To find an argument with the same logical structure and error as the stimulus.

### pa-2 · tag: Trap
- **front:** Why should you not match by topic?
- **back:** The LSAT uses similar topics to distract. Structure and force are what matter, not subject matter.

### pa-3 · tag: Method
- **front:** What sentence should you write before answer choices?
- **back:** 'The author concludes X because Y, but assumes Z.' (The exact flawed bridge).

### pa-4 · tag: Concepts
- **front:** What does structure matching mean?
- **back:** Matching the type of evidence (conditional, causal, comparison) used to reach the goal.

### pa-5 · tag: Concepts
- **front:** What is logical force matching?
- **back:** Ensuring the conclusion strength (some vs all) matches the original.

---

## Review (5 cards)

### r-1 · tag: Wait
- **front:** What should you write for a missed Flaw question?
- **back:** Conclusion, Evidence, Assumption, Plain English Flaw, and why the trap was tempting.

### r-2 · tag: Wait
- **front:** What should you write for a missed Principle question?
- **back:** The Trigger fact I missed, or why the rule was a logical mismatch.

### r-3 · tag: Wait
- **front:** What should you write for a missed Parallel Flaw question?
- **back:** The flawed bridge sentence and why the wrong answer changed that bridge.

### r-4 · tag: Queue
- **front:** What belongs in the redo queue?
- **back:** Any question you missed, guessed on, or felt slow solving.

### r-5 · tag: Lesson
- **front:** What does 'next time I need to notice' mean?
- **back:** A specific trigger wording or pattern you missed (e.g., 'only if' reversal).

---

## Notes for the reviewer

- Cards `p-7`, `p-8`, `p-9` define Principle-Strengthen / Strengthen Application / Principle-Conform — please verify these match the canonical LSAT U taxonomy (`src/lib/questionLoader.ts:252` lists `Principle-Strengthen` and `Principle-Conform`; *"Strengthen Application"* is not a canonical qtype, so `p-8` may be a teaching distinction rather than a question-type label — confirm or rewrite).
- Cards `f-6` and `f-7` are the negation and truth tests; double-check the wording matches how you've been teaching them recently.
- The `tag: "Wait"` value on `r-1`/`r-2`/`r-3` is unusual — possibly a typo for `"Review"`. Confirm.

Mark up this file with `> FIX:` annotations and I'll apply them.
