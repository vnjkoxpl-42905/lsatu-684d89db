-- Tutor KB gap-fill.
--
-- Two fixes:
--   1) Rename the 3 existing strategy rows whose keys disagree with the
--      canonical qtype names used by the question bank (via the normalizer
--      in supabase/functions/tutor-chat/index.ts and the taxonomy in
--      src/lib/questionLoader.ts): "Method" -> "Method of Reasoning",
--      "Parallel" -> "Parallel Reasoning", "Most Supported" ->
--      "Most Strongly Supported". Also fix the one tactical_patterns row
--      whose question_types array contained "Method".
--   2) Seed the 5 canonical qtypes that had no strategy row at all:
--      Principle-Conform, Parallel Flaw, Agree/Disagree, Must Be False,
--      Evaluate. Covers ~240 questions/session.
--
-- Pre-audit showed: 70.8% strategy coverage across 2034 bank questions.
-- Post-audit target: >=95% (the rest are data-corrupted rows in a handful
-- of bank JSONs whose questionType field contains stimulus text).

-- 1. Rename existing keys to canonical -----------------------------------
UPDATE question_type_strategies
SET question_type = 'Method of Reasoning'
WHERE question_type = 'Method';

UPDATE question_type_strategies
SET question_type = 'Parallel Reasoning'
WHERE question_type = 'Parallel';

UPDATE question_type_strategies
SET question_type = 'Most Strongly Supported'
WHERE question_type = 'Most Supported';

-- Normalize tactical_patterns.question_types arrays too
UPDATE tactical_patterns
SET question_types = array_replace(question_types, 'Method', 'Method of Reasoning')
WHERE 'Method' = ANY(question_types);

UPDATE tactical_patterns
SET question_types = array_replace(question_types, 'Parallel', 'Parallel Reasoning')
WHERE 'Parallel' = ANY(question_types);

UPDATE tactical_patterns
SET question_types = array_replace(question_types, 'Most Supported', 'Most Strongly Supported')
WHERE 'Most Supported' = ANY(question_types);

-- 2. Seed missing strategies ---------------------------------------------
INSERT INTO question_type_strategies
  (question_type, category, stem_keywords, reading_strategy, answer_strategy, correct_answer_patterns, wrong_answer_patterns, prephrase_goal, related_reasoning_types)
VALUES
('Principle-Conform', 'Open',
  ARRAY['principle conforms', 'principle illustrated', 'principle most helps to justify', 'principle underlying', 'judgment above conforms'],
  'Read the principle first - it is a general rule (often conditional). Then read the specific case. The correct answer matches the principle''s structure to the case.',
  'Apply the principle as a test. Does the specific case trigger the principle''s sufficient condition? Does the case''s outcome match what the principle requires?',
  'Specific case that clearly satisfies the principle''s conditions and reaches the outcome the principle permits or requires. Often uses conditional logic: principle says A→B, answer shows A was true and B followed.',
  'Fits principle loosely but key condition not met, Triggers principle but outcome contradicts it, Introduces a new condition not in the principle, Confuses necessary vs sufficient parts of the principle',
  'Restate the principle in if/then form. What exact situation would satisfy it? What outcome would follow?',
  ARRAY['Conditional Logic', 'All']),

('Parallel Flaw', 'Closed',
  ARRAY['parallel flawed', 'flawed reasoning most similar', 'reasoning flawed in a way most similar'],
  'Diagnose the stimulus flaw first (name the Famous Flaw: illegal reversal, causation flaw, sampling, ad hominem, equivocation, false dichotomy, etc). Abstract the structure.',
  'Match the specific flaw type, not just any flaw. A conditional-flaw stimulus needs a conditional-flaw answer (same illegal move). Surface topic and vocabulary do not matter.',
  'Commits the identical flaw with identical logical structure. Same number of terms, same illegal move (e.g., both reverse a conditional, or both confuse correlation with causation).',
  'Valid reasoning (not flawed), Different flaw type, Correct flaw name but wrong structural match, Same topic but different logical form',
  'Name the flaw precisely. If the stimulus reverses a conditional, the answer must reverse a conditional too.',
  ARRAY['Conditional Logic', 'Causation', 'Sampling', 'Famous Flaws']),

('Agree/Disagree', 'Closed',
  ARRAY['point at issue', 'disagree about', 'point of disagreement', 'would most disagree', 'committed to disagreeing'],
  'Extract each speaker''s position on every claim they make. Do not guess what they would say - only use what they actually asserted.',
  'The correct answer is a single claim where (a) speaker A has an explicit or clearly implied stance, (b) speaker B has the opposite stance, and (c) both stances are directly supported by what each said. If either speaker is silent on the topic, eliminate it.',
  'A specific proposition that one speaker affirms and the other denies, with textual support from both speakers'' statements.',
  'Both speakers actually agree, One speaker silent on the issue (cannot infer a view), Neither speaker addresses it, Only one speaker has a view, Disagreement is on a related but different claim',
  'List each speaker''s commitments. Find the claim where they commit to opposite positions. If you cannot point to textual support for both sides, it is not the answer.',
  ARRAY['All']),

('Must Be False', 'Closed',
  ARRAY['must be false', 'cannot be true', 'if the statements above are true, which must be false'],
  'Treat the stimulus as 100% true. Look for facts, rules, and conditionals. Identify what each conditional forbids by taking contrapositives.',
  'Be extremely conservative. The answer must be logically incompatible with the stimulus - contradicting a stated fact or forbidden by a conditional rule. If it could possibly be true, eliminate it.',
  'Directly contradicts a stated fact, or violates a conditional by affirming the sufficient while denying the necessary (impossible under the rule).',
  'Could be true (not must be false), Unsupported but not contradicted, Consistent with stimulus, Too strong in wrong direction',
  'Negate each answer: would the stimulus force this negation? If yes, the original must be false.',
  ARRAY['Conditional Logic', 'All']),

('Evaluate', 'Open',
  ARRAY['useful to know', 'useful to evaluate', 'most helpful to determine', 'most relevant to evaluating'],
  'Identify the argument''s core assumption or weak point. The useful question will probe exactly that.',
  'Apply the Variance Test: imagine the answer to the question being Yes, then No. If the two answers push the argument in opposite directions (one strengthens, one weakens), the question is useful. If both answers leave the argument unchanged, it is not useful.',
  'A question whose answer could either strengthen or weaken the argument depending on which way it goes. Probes the central assumption.',
  'Irrelevant (both answers leave the argument equally strong), Loaded (one direction strengthens but the other does not weaken, or vice versa), Out of scope (does not touch the argument''s logic)',
  'What assumption is the argument making? A question that could resolve that assumption one way or the other is the answer.',
  ARRAY['Causation', 'Comparison', 'Conditional Logic', 'All']);

-- No-op safety check: should emit nothing if the migration applied cleanly.
DO $$
DECLARE
  missing text;
BEGIN
  FOR missing IN
    SELECT unnest(ARRAY[
      'Flaw', 'Necessary Assumption', 'Weaken', 'Strengthen', 'Sufficient Assumption',
      'Principle-Strengthen', 'Evaluate', 'Most Strongly Supported', 'Must Be True',
      'Agree/Disagree', 'Must Be False', 'Method of Reasoning', 'Main Conclusion',
      'Parallel Flaw', 'Role', 'Parallel Reasoning', 'Principle-Conform', 'Paradox'
    ])
    EXCEPT
    SELECT question_type FROM question_type_strategies
  LOOP
    RAISE WARNING 'Canonical qtype still missing a strategy row after migration: %', missing;
  END LOOP;
END
$$;
