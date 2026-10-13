import { describe, it, expect, vi, beforeEach } from 'vitest';

// The insert chains into .select().maybeSingle() so the caller gets the new
// row's id back — that id is what the report email is addressed by.
const maybeSingle = vi.fn();
const insert = vi.fn((_row?: Record<string, unknown>) => ({
  select: () => ({ maybeSingle }),
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert }) },
}));

const getQuestion = vi.fn();
vi.mock('@/lib/questionLoader', () => ({
  questionBank: { getQuestion: (qid: string) => getQuestion(qid) },
}));

const logWrongAnswer = vi.fn();
vi.mock('@/lib/wajService', () => ({
  logWrongAnswer: (...args: unknown[]) => logWrongAnswer(...args),
}));

import {
  buildSectionStats,
  buildSectionTotals,
  logSectionWrongAnswers,
  persistSectionResults,
  unansweredWajQids,
  wajQidsForSection,
} from './sectionHistorySave';

/** A question as the bank returns it. */
const q = (qid: string, over: Record<string, unknown> = {}) => ({
  qid,
  pt: 101,
  section: 2,
  qnum: Number(qid.slice(1)),
  qtype: 'Flaw',
  difficulty: 3,
  correctAnswer: 'B',
  ...over,
});

/** A session with the given attempts, in queue order. */
const session = (
  queue: string[],
  attempts: Array<[string, Record<string, unknown>]>,
) =>
  ({
    mode: 'full-section',
    questionQueue: queue,
    attempts: new Map(attempts),
    fullSectionConfig: { pt: 101, section: 2 },
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  maybeSingle.mockResolvedValue({ data: { id: 'sh-1' }, error: null });
  logWrongAnswer.mockResolvedValue(undefined);
  getQuestion.mockImplementation((qid: string) => q(qid));
});

describe('buildSectionStats', () => {
  it('numbers questions by queue position and carries the bank fields', () => {
    const stats = buildSectionStats(
      session(
        ['q1', 'q2'],
        [
          ['q1', { selectedAnswer: 'B', correct: true, timeMs: 5000 }],
          ['q2', { selectedAnswer: 'A', correct: false, timeMs: 7000 }],
        ],
      ),
    );

    expect(stats.map((s) => [s.qid, s.qnum])).toEqual([
      ['q1', 1],
      ['q2', 2],
    ]);
    expect(stats[0]).toMatchObject({
      qtype: 'Flaw',
      difficulty: 3,
      correctAnswer: 'B',
      initialCorrect: true,
    });
  });

  it('treats a question with no attempt as unanswered and wrong', () => {
    const stats = buildSectionStats(session(['q1'], []));

    expect(stats[0].initialAnswer).toBe('—');
    expect(stats[0].initialCorrect).toBe(false);
    expect(stats[0].timeMs).toBe(0);
  });

  it('drops questions the bank cannot resolve', () => {
    getQuestion.mockImplementation((qid: string) =>
      qid === 'ghost' ? undefined : q(qid),
    );

    const stats = buildSectionStats(session(['q1', 'ghost'], []));

    expect(stats.map((s) => s.qid)).toEqual(['q1']);
  });
});

describe('buildSectionTotals', () => {
  it('scores, times and counts unanswered questions', () => {
    const stats = buildSectionStats(
      session(
        ['q1', 'q2', 'q3', 'q4'],
        [
          ['q1', { selectedAnswer: 'B', correct: true, timeMs: 1000 }],
          ['q2', { selectedAnswer: 'B', correct: true, timeMs: 3000 }],
          ['q3', { selectedAnswer: 'A', correct: false, timeMs: 4000 }],
        ],
      ),
    );

    expect(buildSectionTotals(stats)).toMatchObject({
      initialScore: 2,
      initialTotal: 4,
      initialPercent: 50,
      totalTimeMs: 8000,
      avgTimeMs: 2000,
      unansweredCount: 1,
      brScore: null,
      brPercent: null,
      delta: null,
    });
  });

  it('returns zeroes rather than NaN for a section with no resolvable questions', () => {
    const totals = buildSectionTotals([]);

    expect(totals.initialPercent).toBe(0);
    expect(totals.avgTimeMs).toBe(0);
    expect(Number.isNaN(totals.initialPercent)).toBe(false);
    expect(Number.isNaN(totals.avgTimeMs)).toBe(false);
  });

  it('reports blind review as a delta against the initial score', () => {
    const stats = buildSectionStats(
      session(
        ['q1', 'q2'],
        [
          ['q1', { selectedAnswer: 'A', correct: false, timeMs: 1000 }],
          ['q2', { selectedAnswer: 'A', correct: false, timeMs: 1000 }],
        ],
      ),
      [{ qid: 'q1', brAnswer: 'B', correct: true, brChanged: true }] as never,
    );

    expect(
      buildSectionTotals(stats, [
        { qid: 'q1', brAnswer: 'B', correct: true, brChanged: true },
      ] as never),
    ).toMatchObject({ initialScore: 0, brScore: 1, brPercent: 50, delta: 1 });
  });

  it('reports no blind review for an empty results array, not a score of zero', () => {
    const stats = buildSectionStats(
      session(
        ['q1', 'q2', 'q3'],
        [
          ['q1', { selectedAnswer: 'B', correct: true, timeMs: 1000 }],
          ['q2', { selectedAnswer: 'B', correct: true, timeMs: 1000 }],
          ['q3', { selectedAnswer: 'A', correct: false, timeMs: 1000 }],
        ],
      ),
    );

    // Drill holds brResults as [] until a review is actually done, so this is
    // the state of every student who goes straight to See Results. Reporting
    // 0 / -2 there tells them they failed a review they never sat.
    expect(buildSectionTotals(stats, [])).toMatchObject({
      initialScore: 2,
      brScore: null,
      brPercent: null,
      delta: null,
    });
  });
});

describe('persistSectionResults', () => {
  const stats = () =>
    buildSectionStats(
      session(
        ['q1', 'q2'],
        [
          ['q1', { selectedAnswer: 'B', correct: true, timeMs: 1000 }],
          ['q2', { selectedAnswer: 'A', correct: false, timeMs: 2000 }],
        ],
      ),
    );

  it('sets user_id, which the practice-test scorer matches on', async () => {
    await persistSectionResults({
      session: session([], []),
      stats: stats(),
      classId: 'class-1',
      userId: 'user-9',
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-9',
      class_id: 'class-1',
    });
  });

  it('groups the row by question type and by difficulty', async () => {
    getQuestion.mockImplementation((qid: string) =>
      q(qid, { qtype: qid === 'q1' ? 'Flaw' : 'Assumption', difficulty: qid === 'q1' ? 2 : 5 }),
    );

    await persistSectionResults({
      session: session([], []),
      stats: stats(),
      classId: 'c',
      userId: 'u',
    });

    const row = insert.mock.calls[0][0] as Record<string, any>;
    expect(row.by_qtype_json).toEqual({
      Flaw: { correct: 1, total: 1 },
      Assumption: { correct: 0, total: 1 },
    });
    expect(row.by_difficulty_json).toEqual({
      2: { correct: 1, total: 1 },
      5: { correct: 0, total: 1 },
    });
  });

  it('writes the per-question record, so the results table survives the render', async () => {
    await persistSectionResults({
      session: session([], []),
      stats: stats(),
      classId: 'c',
      userId: 'u',
    });

    const row = insert.mock.calls[0][0] as Record<string, any>;
    expect(row.questions_json).toHaveLength(2);
    expect(row.questions_json[0]).toMatchObject({
      qid: 'q1',
      qnum: 1,
      initialAnswer: 'B',
      correctAnswer: 'B',
      initialCorrect: true,
      timeMs: 1000,
    });
    expect(row.questions_json[1]).toMatchObject({
      qid: 'q2',
      qnum: 2,
      initialAnswer: 'A',
      initialCorrect: false,
    });
  });

  it('fills the legacy NOT NULL columns rather than leaving them zero', async () => {
    await persistSectionResults({
      session: session([], []),
      stats: stats(),
      classId: 'c',
      userId: 'u',
    });

    const row = insert.mock.calls[0][0] as Record<string, any>;
    expect(row.total_questions).toBe(2);
    expect(row.time_taken_ms).toBe(3000);
    expect(row.total_questions).toBe(row.initial_total);
    expect(row.time_taken_ms).toBe(row.total_time_ms);
  });

  it('throws when the insert fails, so a sitting can tell the leg is unfinished', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'nope' } });

    await expect(
      persistSectionResults({
        session: session([], []),
        stats: stats(),
        classId: 'c',
        userId: 'u',
      }),
    ).rejects.toMatchObject({ message: 'nope' });
  });
});

describe('the wrong answer journal set', () => {
  const stats = () =>
    buildSectionStats(
      session(
        ['q1', 'q2', 'q3'],
        [
          ['q1', { selectedAnswer: 'B', correct: true, timeMs: 1000 }],
          ['q2', { selectedAnswer: 'A', correct: false, timeMs: 2000 }],
        ],
      ),
    );

  it('covers every miss, answered or not', () => {
    expect(wajQidsForSection(stats())).toEqual(['q2', 'q3']);
  });

  it('separates the unanswered ones, which commitSessionAttempts skips', () => {
    expect(unansweredWajQids(stats())).toEqual(['q3']);
  });

  it('reports which qids were written, not merely how many failed', async () => {
    logWrongAnswer.mockImplementation((args: { qid: string }) =>
      args.qid === 'q3' ? Promise.reject(new Error('waj down')) : Promise.resolve(),
    );

    const written = await logSectionWrongAnswers({
      stats: stats(),
      qids: ['q2', 'q3'],
      classId: 'c',
    });

    // q3 failed, so a retry knows to redo only q3.
    expect(written).toEqual(['q2']);
  });

  it('writes nothing when asked for nothing', async () => {
    const written = await logSectionWrongAnswers({
      stats: stats(),
      qids: [],
      classId: 'c',
    });

    expect(written).toEqual([]);
    expect(logWrongAnswer).not.toHaveBeenCalled();
  });
});
