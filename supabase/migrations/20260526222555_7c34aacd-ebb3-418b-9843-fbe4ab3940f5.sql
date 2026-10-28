
-- ============================================================
-- Guided Drills metadata cleanup (data-only)
-- Normalizes question_types to canonical app qtypes and
-- replaces invalid question_features with approved feature
-- names (or empty when no clean mapping exists).
-- ============================================================

-- 1. Normalize question_types globally
WITH normalized AS (
  SELECT slug, COALESCE(ARRAY(
    SELECT DISTINCT new_qt FROM (
      SELECT CASE qt
        WHEN 'Most Supported' THEN 'Most Strongly Supported'
        WHEN 'Method' THEN 'Method of Reasoning'
        WHEN 'Parallel' THEN 'Parallel Reasoning'
        WHEN 'Point at Issue / Agree-Disagree' THEN 'Agree/Disagree'
        WHEN 'Explain Curious Fact' THEN 'Paradox'
        WHEN 'Fill in the Blank' THEN 'Most Strongly Supported'
        WHEN 'Application' THEN 'Principle-Conform'
        WHEN 'Principle' THEN 'Principle-Conform'
        WHEN 'Assumption' THEN 'Necessary Assumption'
        WHEN 'Inference' THEN 'Must Be True'
        WHEN 'Mixed LR question types' THEN NULL
        WHEN 'Assumption Family' THEN NULL
        ELSE qt
      END as new_qt
      FROM unnest(question_types) AS qt
    ) sub
    WHERE new_qt IS NOT NULL
  ), '{}'::text[]) AS new_types
  FROM public.guided_drills
)
UPDATE public.guided_drills g
SET question_types = n.new_types
FROM normalized n
WHERE g.slug = n.slug;

-- 2. Replace invalid question_features per slug
UPDATE public.guided_drills SET question_features = CASE slug
  WHEN 'w1-02-the-core-connection'                        THEN ARRAY['Missing Link / Idea','Links Between Premises']
  WHEN 'w1-03-assumption-family-easier-set-1'             THEN ARRAY[]::text[]
  WHEN 'w1-05-paradox-first-taste'                        THEN ARRAY['Explain Curious Fact','Binaries','Alternatives']
  WHEN 'w1-07-flaw-first-taste'                           THEN ARRAY['Famous Flaws']
  WHEN 'w2-01-sampling'                                   THEN ARRAY['Sampling Flaw','Part vs. Whole']
  WHEN 'w2-02-abstract-flaw-set-1'                        THEN ARRAY['Abstract Answers']
  WHEN 'w2-03-must-be-true-first-taste'                   THEN ARRAY[]::text[]
  WHEN 'w2-04-conditional-logic-easier-set-1'             THEN ARRAY[]::text[]
  WHEN 'w2-05-reconcile-the-pivot-first-taste'            THEN ARRAY['Important Pivot']
  WHEN 'w2-06-missing-links-first-taste'                  THEN ARRAY['Missing Link / Idea']
  WHEN 'w2-07-necessary-assumption-first-taste'           THEN ARRAY[]::text[]
  WHEN 'w2-08-assumption-family-easier-set-2'             THEN ARRAY[]::text[]
  WHEN 'w2-09-most-supported-first-taste'                 THEN ARRAY[]::text[]
  WHEN 'w2-11-assumption-family-easier-set-3'             THEN ARRAY[]::text[]
  WHEN 'w2-12-missing-links-color-coded'                  THEN ARRAY['Missing Link / Idea','Links Between Premises']
  WHEN 'w2-13-principle-conform-first-taste'              THEN ARRAY['Principles in Stimulus','Principles in Answers','Implicit Principles']
  WHEN 'w2-14-principle-strengthen-first-taste'           THEN ARRAY['Principles in Answers','Conditional Conclusion']
  WHEN 'w2-15-strengthen-first-taste'                     THEN ARRAY[]::text[]
  WHEN 'w3-05-break-the-comparison'                       THEN ARRAY['Assumes Similarity','Assumes Difference','Net Effect']
  WHEN 'w3-06-agree-disagree-set-1'                       THEN ARRAY['2-Speaker','Battle of Opinions','Clarification/Misunderstanding']
  WHEN 'w3-07-rebuttal-conclusions'                       THEN ARRAY['Rebuttals']
  WHEN 'w3-08-describing-arguments-set-1'                 THEN ARRAY['Focused on Evidence','Intermediate Conclusions']
  WHEN 'w3-09-assumption-family-easier-set-4'             THEN ARRAY[]::text[]
  WHEN 'w3-11-complete-the-analogy-set-1'                 THEN ARRAY['Analogies']
  WHEN 'w3-12-conditional-logic-easier-set-2'             THEN ARRAY[]::text[]
  WHEN 'w3-13-weaken-comparison'                          THEN ARRAY['Assumes Similarity','Assumes Difference','Net Effect','Timeframes']
  WHEN 'w3-14-complete-the-analogy-set-2'                 THEN ARRAY['Analogies']
  WHEN 'w3-15-role-main-conclusion-set-1'                 THEN ARRAY[]::text[]
  WHEN 'w4-01-reconcile-the-pivot'                        THEN ARRAY['Important Pivot']
  WHEN 'w4-02-blended-set-parallel-paradox'               THEN ARRAY[]::text[]
  WHEN 'w4-03-reconcile-the-pivot-set-2'                  THEN ARRAY['Important Pivot']
  WHEN 'w4-06-missing-links-color-coded-set-2'            THEN ARRAY['Missing Link / Idea','Links Between Premises']
  WHEN 'w4-07-assumption-family-medium-set-1'             THEN ARRAY[]::text[]
  WHEN 'w5-02-conditional-logic-easier-set-4'             THEN ARRAY[]::text[]
  WHEN 'w5-05-assumption-family-medium-set-3'             THEN ARRAY[]::text[]
  WHEN 'w5-07-describing-arguments-set-2'                 THEN ARRAY['Focused on Evidence','Intermediate Conclusions']
  WHEN 'w5-08-agree-disagree-set-2'                       THEN ARRAY['2-Speaker','Battle of Opinions','Clarification/Misunderstanding']
  WHEN 'w5-09-conditional-logic-medium-set-1'             THEN ARRAY[]::text[]
  WHEN 'w5-10-evaluate-first-taste'                       THEN ARRAY[]::text[]
  WHEN 'w5-11-evaluate-set-1'                             THEN ARRAY[]::text[]
  WHEN 'w5-13-conditional-logic-medium-set-2'             THEN ARRAY[]::text[]
  WHEN 'w7-02-complete-the-analogy-set-3'                 THEN ARRAY['Analogies']
  WHEN 'w7-04-conditional-logic-medium-set-3'             THEN ARRAY[]::text[]
  WHEN 'w7-07-evaluate-set-2'                             THEN ARRAY[]::text[]
  WHEN 'w7-08-conditional-logic-medium-set-4'             THEN ARRAY[]::text[]
  WHEN 'w7-10-describing-arguments-set-3'                 THEN ARRAY['Focused on Evidence','Intermediate Conclusions']
  WHEN 'w8-02-conditional-logic-medium-set-6'             THEN ARRAY[]::text[]
  WHEN 'w8-03-must-be-false-medium-set-1'                 THEN ARRAY[]::text[]
  WHEN 'w8-04-conditional-logic-medium-set-5'             THEN ARRAY[]::text[]
  WHEN 'w8-06-science-strengthen-weaken'                  THEN ARRAY['Science']
  WHEN 'w8-07-principle-conform-principle-in-stimulus-set-1' THEN ARRAY['Principles in Stimulus']
  WHEN 'w8-09-most-supported-causal'                      THEN ARRAY[]::text[]
  WHEN 'w8-10-quantifiers-trait-overlap-inferences'       THEN ARRAY['Quantifiers']
  WHEN 'w8-11-must-be-false-medium-set-2'                 THEN ARRAY[]::text[]
  WHEN 'w9-01-abstract-flaw-set-2'                        THEN ARRAY['Abstract Answers']
  WHEN 'w9-02-science-sufficient-assumption'              THEN ARRAY['Science']
  WHEN 'w9-05-conditional-logic-harder-set-1'             THEN ARRAY[]::text[]
  WHEN 'w9-06-must-be-false-harder-set-2'                 THEN ARRAY[]::text[]
  WHEN 'w9-07-strengthen-weaken-science'                  THEN ARRAY['Science']
  WHEN 'w10-01-conditional-logic-harder-set-2'            THEN ARRAY[]::text[]
  WHEN 'w10-02-quantifiers-set-2'                         THEN ARRAY['Quantifiers']
  WHEN 'w10-05-conditional-logic-harder-set-3'            THEN ARRAY[]::text[]
  WHEN 'w11-01-principle-strengthen-set-1'                THEN ARRAY['Principles in Answers','Conditional Conclusion']
  WHEN 'w11-03-assumption-family-harder-set-1'            THEN ARRAY[]::text[]
  WHEN 'w11-04-speedwalking-lr-set-1'                     THEN ARRAY[]::text[]
  WHEN 'w12-01-assumption-family-harder-set-2'            THEN ARRAY[]::text[]
  WHEN 'w12-03-conditional-logic-harder-set-4'            THEN ARRAY[]::text[]
  WHEN 'w12-04-speedwalking-lr-set-2'                     THEN ARRAY[]::text[]
  ELSE question_features
END
WHERE slug IN (
  'w1-02-the-core-connection','w1-03-assumption-family-easier-set-1','w1-05-paradox-first-taste',
  'w1-07-flaw-first-taste','w2-01-sampling','w2-02-abstract-flaw-set-1','w2-03-must-be-true-first-taste',
  'w2-04-conditional-logic-easier-set-1','w2-05-reconcile-the-pivot-first-taste','w2-06-missing-links-first-taste',
  'w2-07-necessary-assumption-first-taste','w2-08-assumption-family-easier-set-2','w2-09-most-supported-first-taste',
  'w2-11-assumption-family-easier-set-3','w2-12-missing-links-color-coded','w2-13-principle-conform-first-taste',
  'w2-14-principle-strengthen-first-taste','w2-15-strengthen-first-taste','w3-05-break-the-comparison',
  'w3-06-agree-disagree-set-1','w3-07-rebuttal-conclusions','w3-08-describing-arguments-set-1',
  'w3-09-assumption-family-easier-set-4','w3-11-complete-the-analogy-set-1','w3-12-conditional-logic-easier-set-2',
  'w3-13-weaken-comparison','w3-14-complete-the-analogy-set-2','w3-15-role-main-conclusion-set-1',
  'w4-01-reconcile-the-pivot','w4-02-blended-set-parallel-paradox','w4-03-reconcile-the-pivot-set-2',
  'w4-06-missing-links-color-coded-set-2','w4-07-assumption-family-medium-set-1',
  'w5-02-conditional-logic-easier-set-4','w5-05-assumption-family-medium-set-3',
  'w5-07-describing-arguments-set-2','w5-08-agree-disagree-set-2','w5-09-conditional-logic-medium-set-1',
  'w5-10-evaluate-first-taste','w5-11-evaluate-set-1','w5-13-conditional-logic-medium-set-2',
  'w7-02-complete-the-analogy-set-3','w7-04-conditional-logic-medium-set-3','w7-07-evaluate-set-2',
  'w7-08-conditional-logic-medium-set-4','w7-10-describing-arguments-set-3',
  'w8-02-conditional-logic-medium-set-6','w8-03-must-be-false-medium-set-1','w8-04-conditional-logic-medium-set-5',
  'w8-06-science-strengthen-weaken','w8-07-principle-conform-principle-in-stimulus-set-1',
  'w8-09-most-supported-causal','w8-10-quantifiers-trait-overlap-inferences','w8-11-must-be-false-medium-set-2',
  'w9-01-abstract-flaw-set-2','w9-02-science-sufficient-assumption','w9-05-conditional-logic-harder-set-1',
  'w9-06-must-be-false-harder-set-2','w9-07-strengthen-weaken-science','w10-01-conditional-logic-harder-set-2',
  'w10-02-quantifiers-set-2','w10-05-conditional-logic-harder-set-3','w11-01-principle-strengthen-set-1',
  'w11-03-assumption-family-harder-set-1','w11-04-speedwalking-lr-set-1','w12-01-assumption-family-harder-set-2',
  'w12-03-conditional-logic-harder-set-4','w12-04-speedwalking-lr-set-2'
);
