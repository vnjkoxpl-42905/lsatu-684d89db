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
  savePracticeSessionSnapshot,
} from './practiceSessionStore';

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
