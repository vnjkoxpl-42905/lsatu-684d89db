import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  loadPracticeSession: vi.fn(),
  savePracticeSessionSnapshot: vi.fn(),
  completePracticeSession: vi.fn(),
}));

vi.mock('@/bootcamps/main-conclusion/lib/practiceSessionStore', () => ({
  ...store,
}));

import {
  drillResumeKey,
  isSpentDrillSession,
  loadDrillResumeSession,
  type DrillResumeSession,
} from './drillResumeSession';

describe('loading a renamed Run Record', () => {
  beforeEach(() => {
    store.loadPracticeSession.mockReset();
  });

  it('reads the legacy question-list key only when the identity key has no row', async () => {
    const legacyRecord = { pool_slug: 'drill::type-drill::set-old' };
    store.loadPracticeSession
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(legacyRecord);

    await expect(
      loadDrillResumeSession(
        'user_1',
        'drill::bootcamp-day::3::homework',
        'drill::type-drill::set-old',
      ),
    ).resolves.toBe(legacyRecord);
    expect(store.loadPracticeSession.mock.calls).toEqual([
      ['user_1', 'drill::bootcamp-day::3::homework'],
      ['user_1', 'drill::type-drill::set-old'],
    ]);
  });

  it('never resurrects an old run when the identity key already has a row', async () => {
    const currentRecord = {
      pool_slug: 'drill::bootcamp-day::3::homework',
      status: 'completed',
    };
    store.loadPracticeSession.mockResolvedValueOnce(currentRecord);

    await expect(
      loadDrillResumeSession(
        'user_1',
        'drill::bootcamp-day::3::homework',
        'drill::type-drill::set-old',
      ),
    ).resolves.toBe(currentRecord);
    expect(store.loadPracticeSession).toHaveBeenCalledTimes(1);
  });
});

describe('naming the Run Record', () => {
  const section = { mode: 'full-section', config: { pt: 156, section: 2 } };

  it('keys a homework assignment by the assignment, not by the section', () => {
    expect(drillResumeKey({ ...section, assignmentId: 'hw-a' })).toBe('drill::assignment::hw-a');
    expect(drillResumeKey({ ...section, assignmentId: 'hw-b' })).toBe('drill::assignment::hw-b');
  });

  it('keeps the section key for a section sat outside an assignment', () => {
    expect(drillResumeKey(section)).toBe('drill::section::pt156-s2');
    expect(drillResumeKey({ ...section, assignmentId: null })).toBe('drill::section::pt156-s2');
  });

  it('lets the assignment win over every other identity', () => {
    expect(
      drillResumeKey({
        mode: 'type-drill',
        config: { selectedQids: ['q1', 'q2'] },
        identity: { kind: 'bootcamp-day', day: 3, part: 'homework' },
        assignmentId: 'hw-c',
      }),
    ).toBe('drill::assignment::hw-c');
  });
});

describe('a row whose clock was already spent', () => {
  const row = (elapsed_ms?: number): DrillResumeSession =>
    ({
      status: 'in_progress',
      question_queue: ['q1', 'q2'],
      current_index: 0,
      attempts: [{ qid: 'q1', selected_answer: 'A', correct: true, time_ms: 1 }],
      elapsed_ms,
    }) as unknown as DrillResumeSession;
  const budget = 35 * 60 * 1000;

  it('is spent at the buzzer and past it', () => {
    expect(isSpentDrillSession(row(budget), budget)).toBe(true);
    expect(isSpentDrillSession(row(budget + 1), budget)).toBe(true);
  });

  it('is not spent with time left, with no clock stored, or on an untimed run', () => {
    expect(isSpentDrillSession(row(budget - 1), budget)).toBe(false);
    expect(isSpentDrillSession(row(undefined), budget)).toBe(false);
    expect(isSpentDrillSession(row(budget), undefined)).toBe(false);
    expect(isSpentDrillSession(null, budget)).toBe(false);
  });
});
