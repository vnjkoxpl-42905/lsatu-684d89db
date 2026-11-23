import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
  loadPracticeSession: vi.fn(),
  savePracticeSessionSnapshot: vi.fn(),
  completePracticeSession: vi.fn(),
}));
const accountWrites = vi.hoisted(() => ({
  fail: false,
  readFail: false,
  row: null as unknown,
  rowDbUpdatedAt: '2026-11-23T10:00:00.000Z',
  dbRows: new Map<string, { data: any; updated_at: string }>(),
  onSelect: null as (() => void) | null,
  onBeforeWrite: null as (() => void) | null,
  upsert: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
}));
const activeDevice = vi.hoisted(() => vi.fn());
vi.mock('@/lib/practiceTestStore', () => ({ isActivePracticeTestDevice: activeDevice }));

beforeEach(() => {
  accountWrites.fail = false;
  accountWrites.readFail = false;
  accountWrites.row = null;
  accountWrites.rowDbUpdatedAt = '2026-11-23T10:00:00.000Z';
  accountWrites.dbRows.clear();
  accountWrites.onSelect = null;
  accountWrites.onBeforeWrite = null;
  accountWrites.upsert.mockClear();
  accountWrites.update.mockClear();
  accountWrites.insert.mockClear();
  activeDevice.mockReset().mockResolvedValue(true);
  window.localStorage.clear();
  clearAccountSectionRevisionsForTests();
});

vi.mock('@/bootcamps/main-conclusion/lib/practiceSessionStore', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/bootcamps/main-conclusion/lib/practiceSessionStore')>(),
  ...store,
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: async (payload: any, ...rest: unknown[]) => {
        accountWrites.upsert(payload, ...rest);
        if (accountWrites.fail) return { error: { message: 'offline' } };
        if (payload?.record_id) {
          accountWrites.dbRows.set(payload.record_id, {
            data: payload.data,
            updated_at: payload.updated_at ?? new Date().toISOString(),
          });
        }
        return { error: null };
      },
      insert: (payload: any) => {
        accountWrites.insert(payload);
        const execute = async () => {
          if (accountWrites.fail) return { data: null, error: { message: 'offline' } };
          if (accountWrites.dbRows.has(payload.record_id)) {
            return { data: null, error: { code: '23505', message: 'duplicate key' } };
          }
          const stamp = payload.updated_at ?? new Date().toISOString();
          accountWrites.dbRows.set(payload.record_id, { data: payload.data, updated_at: stamp });
          return { data: [{ updated_at: stamp }], error: null };
        };
        return {
          select: execute,
          then: (resolve: (v: unknown) => void) => void execute().then(resolve),
        };
      },
      update: (payload: any) => {
        const filters: Record<string, unknown> = {};
        const chain: Record<string, any> = {
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return chain;
          },
          select: async () => {
            accountWrites.onBeforeWrite?.();
            accountWrites.update({ payload, filters });
            if (accountWrites.fail) return { data: null, error: { message: 'offline' } };
            const existing = accountWrites.dbRows.get(String(filters.record_id));
            if (!existing) return { data: [], error: null };
            if ('updated_at' in filters && existing.updated_at !== filters.updated_at) {
              return { data: [], error: null };
            }
            const stamp = payload.updated_at ?? new Date().toISOString();
            accountWrites.dbRows.set(String(filters.record_id), { data: payload.data, updated_at: stamp });
            return { data: [{ updated_at: stamp }], error: null };
          },
        };
        return chain;
      },
      select: () => {
        const filters: Record<string, unknown> = {};
        const chain: Record<string, any> = {};
        chain.eq = (col: string, val: unknown) => {
          filters[col] = val;
          return chain;
        };
        chain.maybeSingle = async () => {
          if (accountWrites.readFail) return { data: null, error: new Error('offline') };
          const dbRow = filters.record_id ? accountWrites.dbRows.get(String(filters.record_id)) : undefined;
          const result = dbRow
            ? { data: dbRow, error: null }
            : {
                data: accountWrites.row ? { data: accountWrites.row, updated_at: accountWrites.rowDbUpdatedAt } : null,
                error: null,
              };
          accountWrites.onSelect?.();
          return result;
        };
        return chain;
      },
    }),
  },
}));

import {
  clearAccountSectionRevisionsForTests,
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

describe('official LR reload account safety', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const key = 'drill::practice-test::44444444-4444-4444-8444-444444444444::leg-0';
  const snapshot = {
    questionQueue: ['PT23-S2-Q1', 'PT23-S2-Q2'],
    currentIndex: 1,
    attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1200 }],
    elapsedMs: 9000,
    timerMode: '35' as const,
  };
  const localRecord = () => {
    writeSectionDeviceBackup(userId, key, snapshot);
    const record = JSON.parse(window.localStorage.getItem(window.localStorage.key(0)!)!) as DrillResumeSession;
    window.localStorage.clear();
    return record;
  };

  it('does not publish a newer IndexedDB copy during hydration and retains it for explicit recovery', async () => {
    const record = localRecord();
    store.loadPracticeSession.mockReset().mockResolvedValue(record);
    accountWrites.row = { ...record, elapsed_ms: 1000, updated_at: '2020-01-01T00:00:00.000Z' };
    await expect(loadDrillResumeSession(userId, key)).resolves.toEqual(record);
    expect(activeDevice).toHaveBeenCalledWith(userId, '44444444-4444-4444-8444-444444444444');
    expect(accountWrites.upsert).not.toHaveBeenCalled();
    expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);
  });

  it('keeps the exact local clock and question pending through repeated offline reloads', async () => {
    const record = localRecord();
    store.loadPracticeSession.mockReset().mockResolvedValue(record);
    accountWrites.readFail = true;
    await expect(loadDrillResumeSession(userId, key)).resolves.toEqual(record);
    store.loadPracticeSession.mockResolvedValue(null);
    await expect(loadDrillResumeSession(userId, key)).resolves.toEqual(record);
    expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);
    expect(accountWrites.upsert).not.toHaveBeenCalled();
  });

  it('refuses to start a fresh sitting when the account cannot be checked and there is no local copy', async () => {
    store.loadPracticeSession.mockReset().mockResolvedValue(null);
    accountWrites.readFail = true;
    await expect(loadDrillResumeSession(userId, key)).rejects.toThrow('offline');
    expect(accountWrites.upsert).not.toHaveBeenCalled();
  });

  it('does not write or clear recovery evidence after another device takes the test', async () => {
    const record = localRecord();
    store.loadPracticeSession.mockReset().mockResolvedValue(record);
    store.savePracticeSessionSnapshot.mockClear();
    activeDevice.mockResolvedValue(false);
    await expect(loadDrillResumeSession(userId, key)).resolves.toEqual(record);
    await expect(saveDrillResumeSnapshot(userId, key, snapshot)).rejects.toThrow('another device');
    expect(store.savePracticeSessionSnapshot).not.toHaveBeenCalled();
    expect(accountWrites.upsert).not.toHaveBeenCalled();
    expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);
  });

  it('uses an acknowledged account row and releases the older device backup', async () => {
    writeSectionDeviceBackup(userId, key, snapshot);
    const record = JSON.parse(window.localStorage.getItem(window.localStorage.key(0)!)!) as DrillResumeSession;
    store.loadPracticeSession.mockReset().mockResolvedValue(null);
    accountWrites.row = record;
    await expect(loadDrillResumeSession(userId, key)).resolves.toEqual(record);
    expect(hasPendingSectionDeviceBackup(userId, key)).toBe(false);
    expect(accountWrites.upsert).not.toHaveBeenCalled();
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

describe('atomic conditional revision save and assignment key protection (F3)', () => {
  it('uses an atomic conditional DB write against updated_at and retains both copies on conflict', async () => {
    const { practiceSessionIdFor } = await import('@/bootcamps/main-conclusion/lib/practiceSessionStore');
    const userId = '11111111-1111-4111-8111-111111111111';
    const key = 'drill::section::pt23-s2#sit-1';
    const recId = practiceSessionIdFor(userId, key);

    const r1 = '2026-11-23T10:00:00.000Z';
    const r2 = '2026-11-23T10:05:00.000Z';
    const initialRow = {
      id: recId,
      user_id: userId,
      pool_slug: key,
      completion_id: key,
      data_version: 2,
      question_queue: ['PT23-S2-Q1', 'PT23-S2-Q2'],
      current_index: 0,
      attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'A', correct: false, time_ms: 1000 }],
      status: 'in_progress',
      elapsed_ms: 1000,
      started_at: '2026-11-23T09:50:00.000Z',
      // Deliberately differs from DB updated_at column r1!
      updated_at: '2026-11-23T09:55:00.000Z',
    };
    accountWrites.dbRows.set(recId, { data: initialRow, updated_at: r1 });
    store.loadPracticeSession.mockReset().mockResolvedValue(null);

    // Tab A loads at DB revision r1.
    const loaded = await loadDrillResumeSession(userId, key);
    expect(loaded?.attempts[0]?.selected_answer).toBe('A');

    // Simulate the race: Tab B commits r2 with answer 'C' right after any read
    // (or concurrently before Tab A's DB write lands).
    const tabBRow = {
      ...initialRow,
      attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'C', correct: true, time_ms: 2000 }],
      updated_at: r2,
    };
    accountWrites.onBeforeWrite = () => {
      accountWrites.dbRows.set(recId, { data: tabBRow, updated_at: r2 });
    };
    accountWrites.dbRows.set(recId, { data: { ...initialRow, updated_at: r1 }, updated_at: r1 });

    // Tab A tries to save its stale edit (without even passing explicit expectedUpdatedAt;
    // it relies on the DB column revision r1 cached on loadDrillResumeSession).
    const tabASnapshot = {
      questionQueue: ['PT23-S2-Q1', 'PT23-S2-Q2'],
      currentIndex: 1,
      attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'B', correct: false, time_ms: 1500 }],
      elapsedMs: 1500,
      timerMode: '35' as const,
    };
    store.savePracticeSessionSnapshot.mockReset().mockResolvedValue(undefined);
    store.loadPracticeSession.mockResolvedValue({ ...initialRow, attempts: tabASnapshot.attempts });

    await expect(
      saveDrillResumeSnapshot(userId, key, tabASnapshot),
    ).rejects.toThrow(/another tab/i);

    // Also verify passing explicit expectedUpdatedAt: r1 catches the same race cleanly.
    await expect(
      saveDrillResumeSnapshot(userId, key, tabASnapshot, { expectedUpdatedAt: r1 }),
    ).rejects.toThrow(/another tab/i);

    // Both copies survived: DB still has Tab B's 'C', and device backup still has Tab A's 'B'.
    expect(accountWrites.dbRows.get(recId)?.data.attempts[0].selected_answer).toBe('C');
    expect(accountWrites.dbRows.get(recId)?.updated_at).toBe(r2);
    expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);
    expect(accountWrites.upsert).not.toHaveBeenCalled();
  });

  it('protects assignment keys with device backup and conditional writes just like standalone section keys', async () => {
    const { practiceSessionIdFor } = await import('@/bootcamps/main-conclusion/lib/practiceSessionStore');
    const userId = '11111111-1111-4111-8111-111111111111';
    const key = 'drill::assignment::hw-1#sit-1';
    const recId = practiceSessionIdFor(userId, key);

    const snapshot = {
      questionQueue: ['PT23-S2-Q1'],
      currentIndex: 0,
      attempts: [{ qid: 'PT23-S2-Q1', selected_answer: 'B', correct: true, time_ms: 1200 }],
      elapsedMs: 5000,
      timerMode: '35' as const,
    };
    store.savePracticeSessionSnapshot.mockReset().mockResolvedValue(undefined);
    store.loadPracticeSession.mockReset().mockResolvedValue({
      id: recId,
      user_id: userId,
      pool_slug: key,
      completion_id: key,
      question_queue: snapshot.questionQueue,
      current_index: 0,
      attempts: snapshot.attempts,
      status: 'in_progress',
      started_at: '2026-11-23T10:00:00Z',
      updated_at: '2026-11-23T10:00:00Z',
    });

    // Fail the write and verify device backup is created for assignment keys too.
    accountWrites.fail = true;
    await expect(saveDrillResumeSnapshot(userId, key, snapshot)).rejects.toBeTruthy();
    expect(hasPendingSectionDeviceBackup(userId, key)).toBe(true);
  });
});
