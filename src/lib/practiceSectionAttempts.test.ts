import { describe, expect, it } from 'vitest';
import type { PracticeSession } from '@/bootcamps/main-conclusion/persistence/records';
import { isCompletedLrMirror } from './practiceSectionAttempts';

const session = {
  status: 'completed', pool_slug: 'drill::section::pt101-s2',
  started_at: '2026-09-28T10:00:00.000Z', updated_at: '2026-09-28T10:35:00.000Z',
  question_queue: ['PT101-S2-Q1', 'PT101-S2-Q2'],
  attempts: [{ qid: 'PT101-S2-Q1', selected_answer: 'B' }],
} as PracticeSession;

describe('isCompletedLrMirror', () => {
  const result = {
    pt: 101, section: 2, completedAt: '2026-09-28T10:35:05.000Z',
    questions: [
      { qid: 'PT101-S2-Q1', initialAnswer: 'B' },
      { qid: 'PT101-S2-Q2', initialAnswer: '—' },
    ],
  };

  it('recognizes the matching account result and device snapshot', () => {
    expect(isCompletedLrMirror(session, result)).toBe(true);
  });

  it('keeps different sittings, changed answers, and older rows without detail', () => {
    expect(isCompletedLrMirror(session, { ...result, completedAt: '2026-09-29T10:35:05.000Z' })).toBe(false);
    expect(isCompletedLrMirror(session, { ...result, questions: [{ qid: 'PT101-S2-Q1', initialAnswer: 'C' }, result.questions[1]] })).toBe(false);
    expect(isCompletedLrMirror(session, { ...result, questions: [] })).toBe(false);
  });
});
