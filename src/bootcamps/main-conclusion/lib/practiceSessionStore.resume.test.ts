/**
 * What survives leaving a section half-sat.
 *
 * The resume row is the only place an unfinished sitting exists — nothing has
 * been written to section_history yet — so anything it drops is gone. Two
 * things used to be dropped: the answers a student changed their mind about,
 * and the clock they had already spent. Coming back to a fresh 35:00 on a
 * section with fifteen minutes left in it makes the score meaningless.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { __setPersistenceForTests } from '@/bootcamps/main-conclusion/persistence/factory';
import type { Persistence } from '@/bootcamps/main-conclusion/persistence/Persistence';
import {
  completePracticeSession,
  loadPracticeSession,
  migratePracticeSession,
  PRACTICE_SESSION_DATA_VERSION,
  practiceSessionIdFor,
  savePracticeSessionSnapshot,
} from './practiceSessionStore';
import { PracticeSession, TABLES } from '@/bootcamps/main-conclusion/persistence/records';

/**
 * In-memory stand-in for the shared bootcamp_kv layer. `readDelays` holds
 * each successive read for that many ms, the way IndexedDB can, so two
 * writers can interleave; reads past the list return at once.
 */
const makeStore = (readDelays: number[] = []): Persistence => {
  const rows = new Map<string, unknown>();
  const delays = [...readDelays];
  return {
    ready: () => Promise.resolve(),
    get: <T,>(table: string, id: string) =>
      new Promise<T | null>((resolve) =>
        setTimeout(() => resolve((rows.get(`${table}/${id}`) as T) ?? null), delays.shift() ?? 0),
      ),
    set: <T,>(table: string, id: string, record: T) => {
      rows.set(`${table}/${id}`, record);
      return Promise.resolve();
    },
    remove: (table: string, id: string) => {
      rows.delete(`${table}/${id}`);
      return Promise.resolve();
    },
    list: () => Promise.resolve([]),
    putBlob: () => Promise.resolve(),
    getBlob: () => Promise.resolve(null),
    removeBlob: () => Promise.resolve(),
    transaction: (fn) => fn({ get: () => Promise.resolve(null), set: () => Promise.resolve() }),
  } as Persistence;
};

const USER = '11111111-1111-4111-8111-111111111111';
const POOL = { slug: 'drill::section::pt130-s1', completionId: 'drill::section::pt130-s1' };

describe('PT118 legacy resume migration', () => {
  const legacy = PracticeSession.parse({
    id: USER,
    user_id: USER,
    pool_slug: 'drill::section::pt118-s1',
    completion_id: 'drill::section::pt118-s1',
    question_queue: ['PT118-S1-Q4', 'PT118-S1-Q5', 'PT118-S1-Q21', 'PT118-S1-Q25', 'PT118-S1-Q26'],
    current_index: 2,
    attempts: [
      { qid: 'PT118-S1-Q21', selected_answer: 'E', correct: false, time_ms: 1234 },
      { qid: 'PT118-S1-Q25', selected_answer: 'E', correct: false, time_ms: 2345 },
      { qid: 'PT118-S1-Q26', selected_answer: 'A', correct: false, time_ms: 3456 },
    ],
    regulation_answered_qids: ['PT118-S1-Q21', 'PT118-S1-Q25', 'PT118-S1-Q26'],
    status: 'in_progress',
    started_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z',
  });

  it('preserves question content, current place and first duplicate answer', () => {
    const migrated = migratePracticeSession(legacy);
    expect(migrated.question_queue).toEqual([
      'PT118-S1-Q4', 'PT118-S1-Q6', 'PT118-S1-Q22', 'PT118-S1-Q26',
    ]);
    expect(migrated.current_index).toBe(2);
    expect(migrated.attempts.map(({ qid, correct }) => [qid, correct])).toEqual([
      ['PT118-S1-Q22', true], ['PT118-S1-Q26', true],
    ]);
    expect(migrated.regulation_answered_qids).toEqual(['PT118-S1-Q22', 'PT118-S1-Q26']);
    expect(migrated.data_version).toBe(PRACTICE_SESSION_DATA_VERSION);
    expect(migratePracticeSession(migrated)).toEqual(migrated);
  });

  it('removes unscored S3 Q22 and regrades the corrected RC keys', () => {
    const row = PracticeSession.parse({
      ...legacy,
      question_queue: ['PT118-S2-Q1', 'PT118-S3-Q22', 'PT118-S2-Q5', 'PT118-S3-Q23'],
      current_index: 1,
      attempts: [
        { qid: 'PT118-S2-Q1', selected_answer: 'D', correct: false },
        { qid: 'PT118-S3-Q22', selected_answer: 'D', correct: true },
        { qid: 'PT118-S2-Q5', selected_answer: 'E', correct: true },
      ],
      regulation_answered_qids: ['PT118-S3-Q22', 'PT118-S2-Q5'],
    });
    const migrated = migratePracticeSession(row);
    expect(migrated.question_queue).toEqual(['PT118-S2-Q1', 'PT118-S2-Q5', 'PT118-S3-Q23']);
    expect(migrated.current_index).toBe(1);
    expect(migrated.attempts.map(({ qid, correct }) => [qid, correct])).toEqual([
      ['PT118-S2-Q1', true], ['PT118-S2-Q5', false],
    ]);
    expect(migrated.regulation_answered_qids).toEqual(['PT118-S2-Q5']);
  });

  it('writes the migrated version on load and does not remap it twice', async () => {
    const store = makeStore();
    __setPersistenceForTests(store);
    const id = practiceSessionIdFor(USER, legacy.pool_slug);
    await store.set(TABLES.practice_sessions, id, { ...legacy, id });
    const first = await loadPracticeSession(USER, legacy.pool_slug);
    const second = await loadPracticeSession(USER, legacy.pool_slug);
    const persisted = await store.get<PracticeSession>(TABLES.practice_sessions, id);
    expect(second).toEqual(first);
    expect(persisted?.data_version).toBe(PRACTICE_SESSION_DATA_VERSION);
    expect(persisted?.question_queue).toEqual(first?.question_queue);
  });

  it('leaves an unknown producer namespace untouched', () => {
    const canonical = PracticeSession.parse({ ...legacy, pool_slug: 'catalog::pt118-s1' });
    expect(migratePracticeSession(canonical)).toBe(canonical);
  });

  it('migrates a read-only recovery view without publishing the legacy record', async () => {
    const store = makeStore();
    __setPersistenceForTests(store);
    const id = practiceSessionIdFor(USER, legacy.pool_slug);
    await store.set(TABLES.practice_sessions, id, { ...legacy, id });
    const restored = await loadPracticeSession(USER, legacy.pool_slug, { readOnly: true });
    expect(restored?.data_version).toBe(PRACTICE_SESSION_DATA_VERSION);
    expect(await store.get(TABLES.practice_sessions, id)).toEqual({ ...legacy, id });
  });
});

beforeEach(() => {
  __setPersistenceForTests(makeStore());
});

describe('resume row', () => {
  it('keeps the answer trail, the switches, the flag, and the clock', async () => {
    await savePracticeSessionSnapshot(USER, POOL, {
      questionQueue: ['q1', 'q2'],
      currentIndex: 1,
      attempts: [
        {
          qid: 'q1',
          selected_answer: 'B',
          correct: false,
          time_ms: 95_000,
          switch_count: 1,
          flagged: true,
          answer_trail: [
            { answer: 'A', at_ms: 30_000 },
            { answer: 'B', at_ms: 90_000 },
          ],
        },
      ],
      elapsedMs: 600_000,
    });

    const stored = await loadPracticeSession(USER, POOL.slug);

    expect(stored?.elapsed_ms).toBe(600_000);
    expect(stored?.attempts[0].switch_count).toBe(1);
    expect(stored?.attempts[0].flagged).toBe(true);
    expect(stored?.attempts[0].answer_trail).toEqual([
      { answer: 'A', at_ms: 30_000 },
      { answer: 'B', at_ms: 90_000 },
    ]);
  });

  it('never hands spent time back when a later write omits the clock', async () => {
    const base = {
      questionQueue: ['q1'],
      currentIndex: 0,
      attempts: [{ qid: 'q1', selected_answer: 'A', correct: true, time_ms: 1_000 }],
    };
    await savePracticeSessionSnapshot(USER, POOL, { ...base, elapsedMs: 600_000 });
    await savePracticeSessionSnapshot(USER, POOL, base);

    expect((await loadPracticeSession(USER, POOL.slug))?.elapsed_ms).toBe(600_000);
  });

  it('still reads a row written before any of this was stored', async () => {
    await savePracticeSessionSnapshot(USER, POOL, {
      questionQueue: ['q1'],
      currentIndex: 0,
      attempts: [{ qid: 'q1', selected_answer: 'A', correct: true, time_ms: 1_000 }],
    });

    const stored = await loadPracticeSession(USER, POOL.slug);
    expect(stored?.attempts[0].answer_trail).toBeUndefined();
    expect(stored?.elapsed_ms).toBeUndefined();
  });
});

describe('a snapshot in flight when the section completes', () => {
  const base = {
    questionQueue: ['q1', 'q2'],
    currentIndex: 1,
    attempts: [{ qid: 'q1', selected_answer: 'A', correct: true, time_ms: 1_000 }],
  };

  it('cannot put the finished row back to in_progress', async () => {
    // A slow read is what opens the window: the snapshot asked first, but its
    // read comes back after the completion has already read and written.
    __setPersistenceForTests(makeStore([0, 20, 0]));
    await savePracticeSessionSnapshot(USER, POOL, base);

    const snapshot = savePracticeSessionSnapshot(USER, POOL, { ...base, elapsedMs: 2_100_000 });
    const completion = completePracticeSession(USER, POOL, { ...base, elapsedMs: 2_100_000 });
    await Promise.all([snapshot, completion]);

    const stored = await loadPracticeSession(USER, POOL.slug);
    expect(stored?.status).toBe('completed');
    expect(stored?.elapsed_ms).toBe(2_100_000);
  });

  it('keeps writes to different rows independent', async () => {
    __setPersistenceForTests(makeStore([20, 0]));
    const other = { slug: 'drill::section::pt130-s2', completionId: 'drill::section::pt130-s2' };
    await Promise.all([
      completePracticeSession(USER, POOL, base),
      savePracticeSessionSnapshot(USER, other, base),
    ]);
    expect((await loadPracticeSession(USER, POOL.slug))?.status).toBe('completed');
    expect((await loadPracticeSession(USER, other.slug))?.status).toBe('in_progress');
  });
});
