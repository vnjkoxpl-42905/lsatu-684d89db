import { describe, expect, it } from 'vitest';
import type { LRQuestion } from '@/lib/questionLoader';
import {
  createEmptyLRDrillFilters,
  filterLRQuestions,
  getLRDrillContextualOptionCounts,
  getVisibleLRDrillOptions,
  isLRDrillOptionVisible,
  type LRDrillFilters,
} from './lrDrillFilters';

function question(overrides: Partial<LRQuestion> & Pick<LRQuestion, 'qid'>): LRQuestion {
  return {
    pt: 101,
    section: 1,
    qnum: 1,
    qtype: 'Strengthen',
    difficulty: 1,
    stimulus: 'A city planted trees along a busy street.',
    questionStem: 'Which one of the following most strengthens the argument?',
    answerChoices: {
      A: 'Choice alpha',
      B: 'Choice beta',
      C: 'Choice gamma',
      D: 'Choice delta',
      E: 'Choice epsilon',
    },
    correctAnswer: 'A',
    ...overrides,
  };
}

const QUESTIONS: LRQuestion[] = [
  question({
    qid: 'PT101-S1-Q1',
    reasoningType: ['Causation'],
    questionFeatures: ['Alternative Cause'],
  }),
  question({
    qid: 'PT101-S2-Q2',
    section: 2,
    qnum: 2,
    qtype: 'Weaken',
    difficulty: 3,
    stimulus: 'A museum curator discussed a rare cobalt vase.',
    reasoningType: ['Conditional Reasoning'],
    questionFeatures: ['Conditional Diagramming'],
  }),
  question({
    qid: 'PT102-S1-Q2',
    pt: 102,
    qnum: 2,
    qtype: 'Strengthen',
    difficulty: 5,
    stimulus: 'A biologist examined coastal birds.',
    reasoningType: ['Causation', 'Comparative Reasoning'],
    questionFeatures: ['Alternative Cause', 'Comparison'],
  }),
  question({
    qid: 'PT103-S3-Q9',
    pt: 103,
    section: 3,
    qnum: 9,
    qtype: 'Flaw',
    difficulty: 2,
    stimulus: 'An untagged question about a public garden.',
  }),
];

function filters(overrides: Partial<LRDrillFilters> = {}): LRDrillFilters {
  return { ...createEmptyLRDrillFilters(), ...overrides };
}

describe('filterLRQuestions', () => {
  it('uses OR within a facet and AND across different facets', () => {
    const result = filterLRQuestions(
      QUESTIONS,
      filters({
        prepTests: [101, 102],
        questionTypes: ['Strengthen', 'Flaw'],
        difficulties: [1, 5],
      }),
    );

    expect(result.map((item) => item.qid)).toEqual(['PT101-S1-Q1', 'PT102-S1-Q2']);
  });

  it('keeps PrepTest, section, and question number independent and combines them only when matching', () => {
    expect(filterLRQuestions(QUESTIONS, filters({ sections: [1] })).map((q) => q.qid)).toEqual([
      'PT101-S1-Q1',
      'PT102-S1-Q2',
    ]);
    expect(filterLRQuestions(QUESTIONS, filters({ questionNumbers: [2] })).map((q) => q.qid)).toEqual([
      'PT101-S2-Q2',
      'PT102-S1-Q2',
    ]);
    expect(
      filterLRQuestions(QUESTIONS, filters({ prepTests: [102], sections: [1], questionNumbers: [2] })).map(
        (q) => q.qid,
      ),
    ).toEqual(['PT102-S1-Q2']);
  });

  it('ORs multiple question numbers rather than taking only one', () => {
    expect(
      filterLRQuestions(QUESTIONS, filters({ questionNumbers: [1, 2] })).map((q) => q.qid),
    ).toEqual(['PT101-S1-Q1', 'PT101-S2-Q2', 'PT102-S1-Q2']);
  });

  it('treats an empty questionNumbers array as unrestricted, like every other facet', () => {
    expect(filterLRQuestions(QUESTIONS, filters({ questionNumbers: [] }))).toHaveLength(
      QUESTIONS.length,
    );
  });

  it('excludes everything when no question carries the requested number', () => {
    expect(filterLRQuestions(QUESTIONS, filters({ questionNumbers: [99] }))).toHaveLength(0);
  });

  it('searches normalized question text, answer choices, and qid case-insensitively', () => {
    expect(filterLRQuestions(QUESTIONS, filters({ searchQuery: '  RARE   COBALT ' }))).toHaveLength(1);
    expect(filterLRQuestions(QUESTIONS, filters({ searchQuery: 'CHOICE GAMMA' }))).toHaveLength(4);
    expect(filterLRQuestions(QUESTIONS, filters({ searchQuery: 'pt103-s3-q9' }))[0]?.qid).toBe(
      'PT103-S3-Q9',
    );
    expect(filterLRQuestions([
      ...QUESTIONS,
      question({ qid: 'PT101-S1-Q10', qnum: 10 }),
    ], filters({ searchQuery: 'PT101.S1.Q1' })).map((item) => item.qid)).toEqual(['PT101-S1-Q1']);
  });

  it('keeps untagged questions only while reasoning and feature facets are empty', () => {
    expect(filterLRQuestions(QUESTIONS, filters())).toContainEqual(
      expect.objectContaining({ qid: 'PT103-S3-Q9' }),
    );
    expect(filterLRQuestions(QUESTIONS, filters({ reasoningTypes: ['Causation'] })).map((q) => q.qid)).not.toContain(
      'PT103-S3-Q9',
    );
    expect(
      filterLRQuestions(QUESTIONS, filters({ questionFeatures: ['Alternative Cause'] })).map((q) => q.qid),
    ).not.toContain('PT103-S3-Q9');
  });
});

describe('contextual option counts', () => {
  it('applies every other filter while omitting the counted facet', () => {
    const active = filters({
      prepTests: [101],
      questionTypes: ['Strengthen'],
      reasoningTypes: ['Causation'],
    });

    const typeCounts = getLRDrillContextualOptionCounts(
      QUESTIONS,
      active,
      'questionTypes',
      ['Strengthen', 'Weaken', 'Flaw'],
    );
    expect(Object.fromEntries(typeCounts)).toEqual({ Strengthen: 1, Weaken: 0, Flaw: 0 });

    const ptCounts = getLRDrillContextualOptionCounts(QUESTIONS, active, 'prepTests', [101, 102, 103]);
    expect(Object.fromEntries(ptCounts)).toEqual({ 101: 1, 102: 1, 103: 0 });
  });

  it('counts a multi-tagged question once per matching option', () => {
    const counts = getLRDrillContextualOptionCounts(
      QUESTIONS,
      filters({ prepTests: [102] }),
      'reasoningTypes',
      ['Causation', 'Conditional Reasoning', 'Comparative Reasoning'],
    );

    expect(Object.fromEntries(counts)).toEqual({
      Causation: 1,
      'Conditional Reasoning': 0,
      'Comparative Reasoning': 1,
    });
  });
});

describe('option visibility', () => {
  it('hides unselected zero-count values but retains selected zero-count values', () => {
    const counts = new Map<string, number>([
      ['Available', 4],
      ['Selected but empty', 0],
      ['Unavailable', 0],
    ]);

    expect(isLRDrillOptionVisible('Unavailable', [], 0)).toBe(false);
    expect(isLRDrillOptionVisible('Selected but empty', ['Selected but empty'], 0)).toBe(true);
    expect(getVisibleLRDrillOptions([...counts.keys()], ['Selected but empty'], counts)).toEqual([
      'Available',
      'Selected but empty',
    ]);
  });
});
