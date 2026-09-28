import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  loadPracticeSession: vi.fn(),
  savePracticeSessionSnapshot: vi.fn(),
  completePracticeSession: vi.fn(),
}));
const accountWrites = vi.hoisted(() => ({ fail: false }));

vi.mock('@/bootcamps/main-conclusion/lib/practiceSessionStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/bootcamps/main-conclusion/lib/practiceSessionStore')>(),
  ...store,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: async () => ({ error: accountWrites.fail ? { message: 'offline' } : null }),
      select: () => {
        const chain: Record<string, unknown> = {};
        chain.eq = () => chain;
        chain.maybeSingle = async () => ({ data: null, error: null });
        return chain;
      },
    }),
  },
}));

import {
  drillResumeKey,
  isResumableDrillSession,
  isSpentDrillSession,
  loadDrillResumeSession,
  saveDrillResumeSnapshot,
  hasPendingSectionDeviceBackup,
  writeSectionDeviceBackup,
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

it('restores an unsaved section choice from the same account device backup', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const key = 'drill::section::pt23-s2';
  window.localStorage.clear();
  store.loadPracticeSession.mockReset().mockResolvedValue(null);
  expect(writeSectionDeviceBackup(userId, key, {
    questionQueue: ['PT23-S2-Q1', 'PT23-S2-Q2'],
    currentIndex: 0,
    attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1200 }],
    elapsedMs: 9000,
    timerMode: '35',
  })).toBeTruthy();
  expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);
  expect(hasPendingSectionDeviceBackup(otherUserId, key)).toBe(false);

  const restored = await loadDrillResumeSession(userId, key);
  expect(restored?.current_index).toBe(0);
  expect(restored?.attempts[0]?.selected_answer).toBe('B');
  expect(restored?.elapsed_ms).toBe(9000);
});

it('keeps the section backup until the account acknowledges it', async () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const key = 'drill::section::pt23-s2';
  const snapshot = {
    questionQueue: ['PT23-S2-Q1'],
    currentIndex: 0,
    attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1200 }],
    elapsedMs: 9000,
    timerMode: '35' as const,
  };
  window.localStorage.clear();
  store.savePracticeSessionSnapshot.mockReset().mockResolvedValue(undefined);
  store.loadPracticeSession.mockReset().mockResolvedValue({ id: '33333333-3333-4333-8333-333333333333' });
  accountWrites.fail = true;
  await expect(saveDrillResumeSnapshot(userId, key, snapshot)).rejects.toBeTruthy();
  expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);

  accountWrites.fail = false;
  await saveDrillResumeSnapshot(userId, key, snapshot);
  expect(hasPendingSectionDeviceBackup(userId, key)).toBe(false);
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

  it('keeps full exam legs separate from standalone sections and each other', () => {
    expect(drillResumeKey({ ...section, ptRun: { runId: 'run-a', legIndex: 0 } }))
      .toBe('drill::practice-test::run-a::leg-0');
    expect(drillResumeKey({ ...section, ptRun: { runId: 'run-a', legIndex: 2 } }))
      .toBe('drill::practice-test::run-a::leg-2');
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

it('offers an untouched official section for resume, but not an untouched custom drill', () => {
  const base = { status: 'in_progress', question_queue: ['PT101-S2-Q1'], attempts: [] };
  expect(isResumableDrillSession({ ...base, pool_slug: 'drill::section::pt101-s2' } as DrillResumeSession)).toBe(true);
  expect(isResumableDrillSession({ ...base, pool_slug: 'drill::type-drill::abc' } as DrillResumeSession)).toBe(false);
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
