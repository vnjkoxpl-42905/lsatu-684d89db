import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RC_SEARCH_FILTERS,
  buildRcSearchSnippet,
  isReservedPreptest,
  parseRcSearchAddress,
  rcSearchPreviewHref,
  questionFiltersActive,
  runRcSearch,
  type RcSearchFilters,
  type RcSearchPassage,
} from './rcSearch';
import type { RcQuestionIndexEntry } from './rcTypes';

const passage = (over: Partial<RcSearchPassage>): RcSearchPassage => ({
  passageId: 1,
  section: 1,
  setNumber: 1,
  title: 'Risk Communication',
  topic: 'Science',
  format: 'Standard (Non-Comparative)',
  frameworks: ['Problem / Solution'],
  difficulty: 2,
  questionCount: 2,
  explainedCount: 2,
  questionIds: [11, 12],
  firstWords: 'To many developers…',
  preptest: 101,
  ...over,
});

const question = (over: Partial<RcQuestionIndexEntry>): RcQuestionIndexEntry => ({
  questionId: 11,
  passageId: 1,
  preptest: 101,
  section: 1,
  setNumber: 1,
  position: 1,
  questionType: 'Main Point',
  questionTypeFamily: 'Big Picture',
  difficulty: 1,
  features: [],
  prompt: 'Which one of the following best expresses the main point of the passage?',
  ...over,
});

const filters = (over: Partial<RcSearchFilters>): RcSearchFilters => ({
  ...DEFAULT_RC_SEARCH_FILTERS,
  ...over,
});

const P1 = passage({});
const P2 = passage({
  passageId: 2,
  title: 'Comparative Law Passage',
  topic: 'Law',
  format: 'Comparative',
  frameworks: ['Present Debate'],
  difficulty: 4,
  preptest: 150,
  questionIds: [21],
});
const Q11 = question({});
const Q12 = question({
  questionId: 12,
  position: 2,
  questionType: 'Inference',
  questionTypeFamily: 'Implied',
  difficulty: 3,
  features: ['EXCEPT', 'Must Be True'],
  prompt: 'Which one of the following is most strongly supported by the passage?',
});
const Q21 = question({ questionId: 21, passageId: 2, preptest: 150, prompt: null });

describe('runRcSearch', () => {
  it('can page past two hundred results without truncating or repeating the first page', () => {
    const passages = Array.from({ length: 205 }, (_, index) => passage({ passageId: index + 1, questionIds: [index + 1] }));
    const questions = passages.map(p => question({ questionId: p.passageId, passageId: p.passageId }));
    const result = runRcSearch({ passages, questions, query: '', filters: filters({}), limit: 40, passageOffset: 200, questionOffset: 200 });
    expect(result.totalPassages).toBe(205);
    expect(result.totalQuestions).toBe(205);
    expect(result.passages.map(p => p.passage.passageId)).toEqual([201, 202, 203, 204, 205]);
    expect(result.questions.map(q => q.question.questionId)).toEqual([201, 202, 203, 204, 205]);
  });
  it('returns everything in the default range when no filters or query are set', () => {
    const result = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: '',
      filters: filters({}),
    });
    // P2 is PT150, held back by the default 101-148 window, and search says so.
    expect(result.totalPassages).toBe(1);
    expect(result.totalQuestions).toBe(2);
    expect(result.hiddenReservedPassages).toBe(1);
  });

  it('shows held-back PrepTests once the range is widened', () => {
    const result = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: '',
      filters: filters({ preptestMax: 159 }),
    });
    expect(result.totalPassages).toBe(2);
    expect(result.hiddenReservedPassages).toBe(0);
  });

  it('finds a held-back PrepTest by exact address without widening the range', () => {
    const result = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: 'PT150 S1',
      filters: filters({}),
    });
    expect(result.passages.map((r) => r.passage.passageId)).toEqual([2]);
    expect(result.hiddenReservedPassages).toBe(0);
  });

  it('opens the preview on the addressed question', () => {
    const result = runRcSearch({
      passages: [P1],
      questions: [Q11, Q12],
      query: 'PT101 S1 Q2',
      filters: filters({}),
    });
    expect(result.passages).toHaveLength(1);
    expect(result.passages[0].previewQuestionId).toBe(12);
    expect(result.passages[0].matchedQuestionCount).toBe(1);
  });

  it('treats a bare number as text, not as an address', () => {
    expect(parseRcSearchAddress('150')).toBeNull();
    expect(parseRcSearchAddress('PT150 S1')).toEqual({ pt: 150, section: 1 });
    expect(parseRcSearchAddress('PT90 S1')).toBeNull();
  });

  it('matches through soft hyphens without changing the stored text', () => {
    const soft = question({ questionId: 31, passageId: 1, prompt: 'Which co­operative approach is described?' });
    const result = runRcSearch({
      passages: [P1],
      questions: [soft],
      query: 'cooperative',
      filters: filters({}),
    });
    expect(result.totalQuestions).toBe(1);
    expect(soft.prompt).toContain('­');
  });

  it('points a passage with no filter match at its first question for the preview', () => {
    const result = runRcSearch({
      passages: [P1],
      questions: [Q11, Q12],
      query: '',
      filters: filters({}),
    });
    expect(result.passages[0].previewQuestionId).toBe(11);
  });

  it('builds a read-only preview link and flags reserved PrepTests', () => {
    expect(rcSearchPreviewHref(2, 21)).toBe('/rc/preview?passage=2&q=21&returnTo=%2Frc%2Fsearch');
    expect(isReservedPreptest(148)).toBe(false);
    expect(isReservedPreptest(149)).toBe(true);
    expect(isReservedPreptest(159)).toBe(true);
  });

  it('filters passages by topic and PrepTest range', () => {
    const byTopic = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: '',
      filters: filters({ topics: ['Law'], preptestMax: 159 }),
    });
    expect(byTopic.passages.map((r) => r.passage.passageId)).toEqual([2]);

    const byRange = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: '',
      filters: filters({ preptestMin: 120, preptestMax: 159 }),
    });
    expect(byRange.passages.map((r) => r.passage.passageId)).toEqual([2]);
  });

  it('excludes passages with no question matching the question-level filters', () => {
    const result = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: '',
      filters: filters({ features: ['EXCEPT'] }),
    });
    expect(result.totalPassages).toBe(1);
    expect(result.passages[0].matchedQuestionCount).toBe(1);
    expect(result.questions.map((r) => r.question.questionId)).toEqual([12]);
  });

  it('ANDs across dimensions: a type inside the wrong family does not match', () => {
    const result = runRcSearch({
      passages: [P1],
      questions: [Q11, Q12],
      query: '',
      filters: filters({ families: ['Implied'], questionTypes: ['Main Point'] }),
    });
    expect(result.totalPassages).toBe(0);
  });

  it('keeps a passage whose title matches the query even when no prompt does', () => {
    const result = runRcSearch({
      passages: [P1, P2],
      questions: [Q11, Q12, Q21],
      query: 'comparative law',
      filters: filters({ preptestMax: 159 }),
    });
    expect(result.passages.map((r) => r.passage.passageId)).toEqual([2]);
    expect(result.passages[0].titleMatched).toBe(true);
    expect(result.totalQuestions).toBe(0);
  });

  it('returns a snippet centered on the prompt match', () => {
    const result = runRcSearch({
      passages: [P1],
      questions: [Q11, Q12],
      query: 'strongly supported',
      filters: filters({}),
    });
    expect(result.totalQuestions).toBe(1);
    expect(result.questions[0].snippet?.match).toBe('strongly supported');
    // The match sits near the start of this short stem, so the window begins
    // at the first character with no leading ellipsis.
    expect(result.questions[0].snippet?.before).toBe('Which one of the following is most ');
  });

  it('questions with a null difficulty only match when no difficulty filter is set', () => {
    const qNull = question({ questionId: 31, difficulty: null });
    const filtered = runRcSearch({
      passages: [P1],
      questions: [qNull],
      query: '',
      filters: filters({ questionDifficulties: [1] }),
    });
    expect(filtered.totalQuestions).toBe(0);
  });
});

describe('questionFiltersActive', () => {
  it('is false for the defaults and true once any question dimension is set', () => {
    expect(questionFiltersActive(filters({}))).toBe(false);
    expect(questionFiltersActive(filters({ families: ['Implied'] }))).toBe(true);
    expect(questionFiltersActive(filters({ questionDifficulties: [5] }))).toBe(true);
  });
});

describe('buildRcSearchSnippet', () => {
  it('is null when the query is absent or not found', () => {
    expect(buildRcSearchSnippet('hello world', '')).toBeNull();
    expect(buildRcSearchSnippet('hello world', 'absent')).toBeNull();
  });
});
