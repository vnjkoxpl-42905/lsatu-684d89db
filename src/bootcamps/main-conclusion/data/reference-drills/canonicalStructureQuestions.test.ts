import { describe, expect, it } from 'vitest';

import {
  CANONICAL_MIXED_STRUCTURE_CHECK_QUESTIONS,
  CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS,
  CANONICAL_STRUCTURE_QUESTIONS,
} from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';

describe('canonical structure question bank', () => {
  it('merges arguments-foundations duplicates into the matching mainconclusion records', () => {
    const duplicates = CANONICAL_STRUCTURE_QUESTIONS.filter((question) =>
      question.sourceBootcamps.includes('mainconclusion') &&
      question.sourceBootcamps.includes('arguments-foundations'),
    );

    expect(duplicates).toHaveLength(2);
    expect(duplicates.every((question) => question.compatibleTemplates.includes('arguments-foundations-mini'))).toBe(true);
  });

  it('keeps one canonical record per normalized stimulus', () => {
    const keys = CANONICAL_STRUCTURE_QUESTIONS.map((question) => question.duplicateKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('assigns four rebuttal-vs-first stage sets with five questions each', () => {
    expect(CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS).toHaveLength(4);
    expect(CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS.every((stage) => stage.questions)).toBe(true);
    expect(CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS.map((stage) => stage.questions.length)).toEqual([5, 5, 5, 5]);
  });

  it('creates a differentiated 12-item mixed capstone set', () => {
    expect(CANONICAL_MIXED_STRUCTURE_CHECK_QUESTIONS).toHaveLength(12);
    expect(new Set(CANONICAL_MIXED_STRUCTURE_CHECK_QUESTIONS.map((question) => question.id)).size).toBe(12);
  });
});
