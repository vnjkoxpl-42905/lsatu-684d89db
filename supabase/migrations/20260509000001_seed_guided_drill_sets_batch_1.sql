-- Seed: Batch 1 of guided drill instruction cards.
-- Six guided sets, all difficulty 1-3, six questions each (qids left empty for
-- the admin to populate via the UI). Instructions are stored verbatim.
--
-- Owner is the primary admin (looked up by email). If the admin row does not
-- exist yet (e.g., before first sign-in) the seed is a no-op and the rows can
-- be re-seeded by re-running this migration after the admin account is created.

DO $$
DECLARE
  v_admin_id  uuid;
  v_class_id  uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'contact@aspiringattorneys.com' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'guided_drill_sets seed: admin user not found, skipping.';
    RETURN;
  END IF;

  v_class_id := v_admin_id;

  -- Set 1 — First Sentence Conclusions
  INSERT INTO public.homework_sets (
    title, description, question_qids, created_by, class_id,
    is_guided_set, instruction_layout, instructions_markdown,
    guided_set_type, question_type, reasoning_type, question_feature,
    estimated_minutes, source_pts, difficulty_min, difficulty_max, start_button_label
  )
  SELECT
    'First Sentence Conclusions',
    'Six Main Conclusion / Role questions where the conclusion sits in the first sentence.',
    ARRAY[]::text[],
    v_admin_id,
    v_class_id,
    true,
    'two_column',
    $md$### Left Column

These six questions all have a **Conclusion** in the **first sentence**, which of course is not the most obvious place to find a conclusion.

But **that's the point!**

When we're doing Main Conclusion and Role questions, the test writers are intentionally trying to hide the conclusion, so that this otherwise-easy task can still be challenging.

The most common place to find the conclusion is after a Pivot, expressing some Rebuttal sentiment (65% of Main Conclusion questions).

The second most common place they'll stash it is in the first sentence (25% of Main Conclusion questions).

Only about 10% of the time on Main Conclusion does the paragraph end with the conclusion. That's why picking an answer that matches the final claim will usually be wrong (but definitely not always!)

We want to practice reading Main Conclusion questions with a special ear for "upside-down" arguments, where we hear the conclusion and then hear the supporting ideas.

### Right Column

# Do these six questions,

thinking about how we would have figured out that the first sentence was the conclusion.

This exercise is about getting our brains used to the feel of a pattern. Focus on noticing how the first claim is an **opinion**, and then **feeling** how the subsequent claims go on to defend that initial opinion.

Are there any **Support Indicator** words that follow it?

(f.e. **FABS** = for, after all, because, since)

Are there any **Opinion Indicator** words in it?

(f.e. should, ought, probably, better)

If we look at the claim in the first sentence and ask ourselves, "**Why should we believe _that?_**", does the rest of an argument seem like an answer to that question? (It should)
$md$,
    'Patterns',
    'Main Conclusion / Role',
    NULL,
    'First Sentence Conclusion',
    30,
    NULL,
    1, 3,
    'Continue'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.homework_sets
    WHERE created_by = v_admin_id AND title = 'First Sentence Conclusions' AND is_guided_set = true
  );

  -- Set 2 — Missing Link Questions
  INSERT INTO public.homework_sets (
    title, description, question_qids, created_by, class_id,
    is_guided_set, instruction_layout, instructions_markdown,
    guided_set_type, question_type, reasoning_type, question_feature,
    estimated_minutes, source_pts, difficulty_min, difficulty_max, start_button_label
  )
  SELECT
    'Missing Link Questions',
    'Assumption-Family questions testing the Internal Logic of the argument.',
    ARRAY[]::text[],
    v_admin_id,
    v_class_id,
    true,
    'two_column',
    $md$### Left Column

# Assumption & Objection Family

Sufficient Assumption, Necessary Assumption,
Flaw, Weaken, Strengthen, Principle-Strengthen, Evaluate

There are two main types of problems in the Assumption Family:

- those testing the **Internal Logic** of the argument ("in the box")
- those testing **New Considerations** ("outside the box" ideas)

This set of problems is all about the Internal Logic.

### Right Column

1. Find the Conclusion.
2. Find the main Supporting Idea (the Premise).

- On **Assumption** questions, try to find an answer reinforcing

  _If Premise, then Conclusion_

- If you're doing **Strengthen**, look for answers saying

  _The Premise is heavily connected to the Conclusion_

- If it's **Flaw** or **Weaken**, look for answers saying

  _The Premise can be true, while the Conclusion is false_
$md$,
    'Patterns',
    'Sufficient Assumption / Necessary Assumption / Flaw / Weaken / Strengthen / Principle-Strengthen / Evaluate',
    NULL,
    'Missing Link / Core Connection',
    50,
    NULL,
    1, 3,
    'Start'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.homework_sets
    WHERE created_by = v_admin_id AND title = 'Missing Link Questions' AND is_guided_set = true
  );

  -- Set 3 — Assumption Family Mixed Set 1
  INSERT INTO public.homework_sets (
    title, description, question_qids, created_by, class_id,
    is_guided_set, instruction_layout, instructions_markdown,
    guided_set_type, question_type, reasoning_type, question_feature,
    estimated_minutes, source_pts, difficulty_min, difficulty_max, start_button_label
  )
  SELECT
    'Assumption Family Mixed Set 1',
    'Mixed Assumption Family — practice shifting from Internal Logic to Courtroom Debate based on question type.',
    ARRAY[]::text[],
    v_admin_id,
    v_class_id,
    true,
    'two_column',
    $md$### Left Column

In the **Assumption Family**,
Step 1, find the author's Conclusion and Supporting Idea(s).
Step 2, depends ... which type of question are you doing?

## Sufficient / Necessary Assumption, or Principle-Strengthen?

Start by thinking about the **Internal Logic** of the argument.

- "If Premise, Then Conclusion" linking ideas.
- If there's a _New Concept in Conclusion_, make the author define that term. What idea from the evidence is she connecting it to?
- Is there an _Untriggered Conditional_ idea in the evidence?
- Do two premises have an overlapping concept? Can we synthesize them?
- "in-the-box" correct answers, re-using language from argument

## Strengthen, Weaken, Flaw or Evaluate?

Be the Opposing Lawyer, and engage in **Courtroom Debate**.

- Look for hints at Comparative or Causal reasoning.
- If the author is arguing by Comparison, we have to try to weaken the comparison by making two things seem unfair to compare, or by adding a new consideration to the pros and cons balance sheet.
- If the author is presenting a Curious Fact and then concluding something that implies a causal explanation, think about Alternate Explanations, or ways to better assess the Author's Explanation.
- Is the author engaging in any illegal argument moves (famous flaws)?

Remember, these are just **tendencies**. This is like reading the scouting report on an athlete, and knowing they _prefer_ to go to their right. We hedge that way, but we're still willing to use either style of thinking on any question type.

### Right Column

# Try these 6 questions, untimed

Think about how our thinking shifts from
_Internal Logic_ to _Courtroom Debate_, based on the question type.

When you're trying **Sufficient Assumption, Necessary Assumption**, or **Principle- Strengthen** questions, think to yourself that when you combine the correct answer with the existing premises you can derive, or come much closer to deriving, the conclusion.

If the conclusion is trying to prove that "A is Z", then we need two basic things:

- a rule that has an outcome of Z, like "If X, then Z".
- facts telling us that A triggers this rule, like "A is X".

When you're trying **Strengthen, Weaken,** or **Evaluate**, try to respond to the argument as though you're Opposing Counsel. Even though you accept that the Prosecution's evidence is true, how could you make it seem irrelevant, less trustworthy, or less important than some other consideration?

Think about the argument in one (or more) of these ways.

- **Given** [this evidence], **How can I still argue** [the anti-conclusion] ?
- **Even though** [evidence] is true, [conclusion] **is wrong because ...**
- **Given that I want to argue** [anti-conclusion], **how can I respond to** [author's evidence / logic]?

When you're doing **Flaw**, add onto that list, "Is this author committing any of the **famous flaws**?"
$md$,
    'Process',
    'Sufficient Assumption / Necessary Assumption / Principle-Strengthen / Strengthen / Weaken / Flaw / Evaluate',
    NULL,
    'Mixed Assumption Family / Internal Logic vs Courtroom Debate',
    70,
    NULL,
    1, 3,
    'Start'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.homework_sets
    WHERE created_by = v_admin_id AND title = 'Assumption Family Mixed Set 1' AND is_guided_set = true
  );

  -- Set 4 — Paradox - First Taste
  INSERT INTO public.homework_sets (
    title, description, question_qids, created_by, class_id,
    is_guided_set, instruction_layout, instructions_markdown,
    guided_set_type, question_type, reasoning_type, question_feature,
    estimated_minutes, source_pts, difficulty_min, difficulty_max, start_button_label
  )
  SELECT
    'Paradox - First Taste',
    'Six Paradox questions from PT 140 and PT 141, with timer instructions for accommodations.',
    ARRAY[]::text[],
    v_admin_id,
    v_class_id,
    true,
    'two_column',
    $md$### Left Column

Try these 6 **Paradox** questions from test 73 and 71 (141 and 140).

These questions are all about initially understanding how the the paragraph is creating some cognitive dissonance (the feeling when two ideas don't fit well together), and then picking an answer that resolves that tension, and helps give us a way to understand how both things can be true.

Most correct answers provide some important difference between two things, two groups, two timeframes, or two situations.

On **Strengthen / Weaken / Paradox**, the question stem begins

_Which of the following, if true, most ..._

That lead-in means, "Don't worry whether it's true in the real world or whether it sounds too strong or unlikely. _Pretend_ it's true, and assess whether it would have any impact on this conversation."

### Right Column

# Set a timer for 9 minutes

1.5x = 13 mins
2x = 18 mins

- Select your answers but don't hit confirm.
- When the timer goes off, flip back through the problems and see if you want to change any of your answers.
- Then hit confirm and read the explanation, if available.

Practice framing the paradox as,

**Given** the background fact(s),
**How can we explain** the surprising claim?

Look out for wrong answers that are not offering any distinction between two things/groups/timeframes, wrong answers that give you more context on the background fact but say nothing about the surprising idea, and wrong answers that Deepen the Paradox by making us even more confused by how the surprising idea could be true..
$md$,
    'Process',
    'Paradox',
    NULL,
    NULL,
    50,
    ARRAY['140','141']::text[],
    1, 3,
    'Start'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.homework_sets
    WHERE created_by = v_admin_id AND title = 'Paradox - First Taste' AND is_guided_set = true
  );

  -- Set 5 — Explain Curious Fact (First Taste)
  INSERT INTO public.homework_sets (
    title, description, question_qids, created_by, class_id,
    is_guided_set, instruction_layout, instructions_markdown,
    guided_set_type, question_type, reasoning_type, question_feature,
    estimated_minutes, source_pts, difficulty_min, difficulty_max, start_button_label
  )
  SELECT
    'Explain Curious Fact (First Taste)',
    'Causal-explanation questions: identify the Curious Fact, the Author''s Hypothesis, and the Alternate Explanation.',
    ARRAY[]::text[],
    v_admin_id,
    v_class_id,
    true,
    'two_column',
    $md$### Left Column

In these arguments, the author concludes (or assumes)
a causal explanation for a **Curious Fact**.

(some of these problems you may have already seen, which is fine / intentional -- it's **very** valuable to revisit questions, especially if we look at them from a different angle or with a more sophisticated understanding.)

There are a handful of different question types here, but they all have a common theme:

- The **evidence** presents some _Curious Fact_ (an asymmetric comparison, like a correlation, a statistical change, or a difference between two groups or situations)

- The author's **conclusion** will state or assume one possible _Causal Explanation_ for this curious fact.

- The correct answer will either deal with _Alternate Explanations_ for the curious fact or with the _plausibility_ of the Author's Explanation.

### Right Column

# Try these 6 questions untimed,

while rehearsing these steps:

## What is the Curious Fact?

- what language tips us off? is there an asymmetric comparison?
- _ask_ yourself the Curious Fact: _why/how is it that [curious fact]?_

## What is the Author's Explanation / Hypothesis?

- Is there a verb or expression in the conclusion indicating that the author is making a causal claim?

- Make sure that you spell out every step in the author's causal story. It's very common for an author to fail to mention each step in the causal chain that gets them from their causal explanation to the actual curious fact.

## Does the correct answer deal with an Alternate Explanation?

- Is it dealing with the idea of _Reverse Causality?_

- Is it dealing with the idea of a _Third Factor?_

Or does it address the **plausibility** of the Author's Explanation?

- Is it addressing plausibility via covariation? (strengthening by No Cause / No Effect, or More Cause / More Effect data points or weakening by Cause without Effect, or Effect without Cause data points)

- Or is it addressing plausibility some other way? (placing the suspect at the scene of the crime, or explaining the motive/mechanism by which the crime would have taken place)
$md$,
    'Patterns',
    'Explain Curious Fact',
    'Causation',
    'Explain Curious Fact',
    60,
    NULL,
    1, 3,
    'Start'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.homework_sets
    WHERE created_by = v_admin_id AND title = 'Explain Curious Fact (First Taste)' AND is_guided_set = true
  );

  -- Set 6 — Flaw - First Taste
  INSERT INTO public.homework_sets (
    title, description, question_qids, created_by, class_id,
    is_guided_set, instruction_layout, instructions_markdown,
    guided_set_type, question_type, reasoning_type, question_feature,
    estimated_minutes, source_pts, difficulty_min, difficulty_max, start_button_label
  )
  SELECT
    'Flaw - First Taste',
    'Six Flaw questions to get a feel for the question family''s keywords, stimulus tendencies, and answer-language varieties.',
    ARRAY[]::text[],
    v_admin_id,
    v_class_id,
    true,
    'two_column',
    $md$### Left Column

# Try out some Flaw questions,

to get a feel for how they look and how they work.

## keywords

vulnerable to criticism, flaw, questionable reasoning, errors of reasoning

## examples

The argument is most vulnerable to criticism because it ...
Fred commits which of the following errors of reasoning?
The publicist's reasoning is flawed because she ...

## stimulus tendencies

These are arguments that either have a noteworthy Assumption, are vulnerable to a certain sort of Objection, or make some sort of Dubious / Illicit Move.

### Right Column

# Try these 6 questions, untimed,

for accuracy and understanding.

Flaw wants us to read someone's unsuccessful argument and say to the judge, "Objection, Your Honor, but Bad Lawyer over here just did ____."

Thus, try to read the argument and respond with an objection _to the reasoning_.

- Is there a distinction the author isn't perceiving?
- Is the author's conclusion too strong?
- Is something irrelevant?
- Does the author's thinking feel like it's cheating in some way?

Since the answers will be doing so, we should feel free to speak any of three languages. "The argument is flawed because ...

- the author assumes X" (**Assumption answers**)

- isn't it possible that Y is true?" (**Objection answers**)

- the author made this illegal move" (**Description answers**)
$md$,
    'Process',
    'Flaw',
    NULL,
    NULL,
    80,
    NULL,
    1, 3,
    'Continue'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.homework_sets
    WHERE created_by = v_admin_id AND title = 'Flaw - First Taste' AND is_guided_set = true
  );

END $$;
