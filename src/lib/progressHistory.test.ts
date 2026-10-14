import { describe, expect, it } from 'vitest';
import { firstAnswerDetails } from './firstAnswerDetails';
import { filterProgressHistory, type HistoryFilters } from './progressHistory';
import type { GradedQuestionAnswer } from './firstAnswerProgress';

const answers: GradedQuestionAnswer[] = [
  { attemptId: 'first', questionKey: 'LR:PT101-S2-Q1', area: 'LR', source: 'lr_attempts', mode: 'adaptive', correct: false, gradedAt: '2026-09-01', topic: 'Weaken' },
  { attemptId: 'repeat', questionKey: 'LR:PT101-S2-Q1', area: 'LR', source: 'lr_section_history', mode: 'timed-section', correct: true, gradedAt: '2026-09-29', topic: 'Weaken' },
  { attemptId: 'rc', questionKey: 'RC:12:2', area: 'RC', source: 'rc_attempts', mode: 'rc-drill', correct: false, gradedAt: '2026-09-30' },
];
const filters: HistoryFilters = { area: 'all', result: 'all', answer: 'all', source: 'all', mode: 'all', topic: 'all', search: '', sort: 'newest' };
describe('History uses the same first-answer identity before filtering', () => {
  const history = firstAnswerDetails(answers, 7, '2026-10-01').history;
  it('a source/mode filter never promotes a repeat to first', () => {
    expect(filterProgressHistory(history, { ...filters, source: 'lr_section_history', mode: 'timed-section' })).toMatchObject([{ attemptId: 'repeat', isFirst: false }]);
    expect(filterProgressHistory(history, { ...filters, source: 'lr_section_history', answer: 'first' })).toEqual([]);
  });
  it('combines question type, result and case-insensitive exact-record search', () => {
    expect(filterProgressHistory(history, { ...filters, topic: 'Weaken', result: 'correct', search: 'REPEAT' }).map((row) => row.attemptId)).toEqual(['repeat']);
    expect(filterProgressHistory(history, { ...filters, area: 'RC', topic: 'Weaken' })).toEqual([]);
  });
  it('sorts without mutating the ledger and retains evidence IDs', () => {
    const before = history.map((row) => row.attemptId);
    expect(filterProgressHistory(history, { ...filters, sort: 'oldest' }).map((row) => row.attemptId)).toEqual(['repeat', 'rc']);
    expect(history.map((row) => row.attemptId)).toEqual(before);
  });
  it('orders numbered questions numerically instead of putting Q10 before Q2', () => {
    const rows = [10, 2, 1].map((n) => ({ ...history[0], questionKey: `LR:PT101-S2-Q${n}`, attemptId: `q${n}` }));
    expect(filterProgressHistory(rows, { ...filters, sort: 'question' }).map((row) => row.attemptId)).toEqual(['q1', 'q2', 'q10']);
  });
});
