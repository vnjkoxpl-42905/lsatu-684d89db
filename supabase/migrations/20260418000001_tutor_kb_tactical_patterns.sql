-- Seed two tactical patterns for qtypes that currently have no tactical row:
-- Role and Parallel Reasoning. Both are high-frequency types whose coaching
-- noticeably benefits from a named technique.
--
-- Chosen over the other strategy-only qtypes (Main Conclusion, Method,
-- Must Be True, Most Strongly Supported, Agree/Disagree, Must Be False,
-- Evaluate, Paradox) because those are more reading-discipline than tactic —
-- i.e., they reward following the question-type strategy rather than applying
-- a named maneuver. Seeding tactics for them would produce filler text.

INSERT INTO tactical_patterns
  (pattern_name, pattern_type, reasoning_type, question_types, description, formula, application, examples)
VALUES

('Claim Function Map', 'identify', 'All', ARRAY['Role'],
 'Trace the logical relationships surrounding the target claim to identify its role. Every claim in an LR argument is one of: main conclusion (supported by everything), intermediate conclusion (supported AND supporting), premise (supporting only), background (neither), or opposing view being rebutted.',
 'For the target claim, ask: (1) What supports it? (2) What does it support? Then bucket it. Both supported and supporting is intermediate conclusion. Supports others but is not itself supported is a premise. Supported but supports nothing is the main conclusion. Neither supported nor supporting is background or an opposing view.',
 'Use on Role questions before reading answer choices. Diagram the relationships on scratch paper, drawing arrows from premises to conclusions. The correct answer describes the claim''s position in that diagram.',
 'Stimulus: "Many doctors believe vitamin X prevents colds. However, the large study we ran shows no effect. So vitamin X offers no protection." Target claim: "Many doctors believe vitamin X prevents colds." It isn''t supported by anything and isn''t supported itself — it''s the opposing view the author is rebutting.'),

('Abstract Structure Match', 'match', 'Conditional Logic', ARRAY['Parallel Reasoning', 'Parallel Flaw'],
 'Diagram the stimulus into abstract variables (a, b, c) to strip away surface topic, then test each answer against that template. Same number of terms, same logical moves, same conclusion-type. For Parallel Flaw, the answer must also commit the identical flaw (illegal reversal matches illegal reversal, not causation flaw).',
 'Stimulus → a → b, c → a, therefore c → b. Answer choices must translate to the same symbolic form. Surface topic and polarity swaps (positive vs negative, permissive vs prohibitive) are irrelevant if structure matches.',
 'Use on every Parallel Reasoning and Parallel Flaw question. Skip the content entirely — match structure only. If the stimulus uses conditional logic, the answer must too. If the stimulus generalizes from a sample, the answer must too. If the stimulus commits illegal reversal, the answer must reverse a conditional (not commit a different flaw).',
 'Stimulus: "All dolphins are mammals. All mammals are warm-blooded. So all dolphins are warm-blooded." Template: All A are B. All B are C. So all A are C. Correct answer must mirror that chain with the same universal quantifier and same transitive structure, regardless of topic.');

-- Sanity check: both patterns should now be present.
DO $$
DECLARE
  missing text;
BEGIN
  FOR missing IN
    SELECT unnest(ARRAY['Claim Function Map', 'Abstract Structure Match'])
    EXCEPT
    SELECT pattern_name FROM tactical_patterns
  LOOP
    RAISE WARNING 'Expected tactical pattern still missing after migration: %', missing;
  END LOOP;
END
$$;
