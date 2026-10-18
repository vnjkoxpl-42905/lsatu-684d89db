import { expect, it } from 'vitest';
import { buildRcAdaptiveSummary } from './rcAdaptiveSummary';
import type { RcHistorySnapshot } from '../api/rcProgress';
import type { RcQuestionHistoryEntry } from './rcTypes';

const entry = (id: number, overrides: Partial<RcQuestionHistoryEntry> = {}): RcQuestionHistoryEntry => ({ questionId: id, attempts: 1,
  everIncorrect: true, incorrectOnLastTake: true, incorrectCount: 1, lastSeenAt: '2026-10-17T10:00:00Z', lastGradedAt: '2026-10-17T10:00:00Z',
  answered: true, firstEverCorrect: false, firstTakeCorrect: false, reviewCorrected: false, ...overrides });
const snapshot = (entries: RcQuestionHistoryEntry[], hidden = false): RcHistorySnapshot => ({ history: new Map(entries.map(row => [row.questionId, row])), displayHistory: new Map(), hasHiddenGradedResults: hidden });
it('withholds target, accuracy, sample counts and corrections while contributing results remain hidden', () => {
  expect(buildRcAdaptiveSummary(snapshot([entry(1)], true))).toEqual({ hiddenResults: true, firstEver: null, recent: null, reviewCorrections: null, target: null });
});
it('distinguishes earliest correctness, recent first takes and review corrections without treating corrections as first takes', () => {
  const summary = buildRcAdaptiveSummary(snapshot([entry(1, { firstTakeCorrect: true, reviewCorrected: true }), entry(2)]));
  expect(summary.firstEver).toEqual({ correct: 0, total: 2 });
  expect(summary.recent).toEqual({ accuracy: 0.5, total: 2 });
  expect(summary.reviewCorrections).toBe(1);
  expect(summary.target).toBe(2);
});
it('describes an empty sample without inventing accuracy or a mastery result', () => {
  const summary = buildRcAdaptiveSummary(snapshot([]));
  expect(summary.recent).toBeNull();
  expect(summary.firstEver).toEqual({ correct: 0, total: 0 });
  expect(summary.target).toBe(2);
});
