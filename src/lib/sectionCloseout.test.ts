import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

const getQuestion = vi.fn();
vi.mock('@/lib/questionLoader', () => ({
  questionBank: { getQuestion: (qid: string) => getQuestion(qid) },
}));

import {
  buildCloseoutPayload,
  initStandaloneSitting,
  isStandalonePoolKey,
  runStandaloneCloseout,
  readCachedSitting,
  sittingStorageKey,
} from './sectionCloseout';
import { UNANSWERED } from './sectionAnswer';

const q = (qid: string) => ({ qid, pt: 105, section: 2, qnum: Number(qid.slice(1)), qtype: 'Flaw', difficulty: 3, correctAnswer: 'B' });
const session = (attempts: Array<[string, Record<string, unknown>]>) =>
  ({
    mode: 'full-section',
    questionQueue: ['q1', 'q2', 'q3'],
    attempts: new Map(attempts),
    fullSectionConfig: { pt: 105, section: 2 },
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  getQuestion.mockImplementation((qid: string) => q(qid));
});

describe('isStandalonePoolKey', () => {
  it('accepts section and assignment keys only', () => {
    expect(isStandalonePoolKey('drill::section::pt105-s2')).toBe(true);
    expect(isStandalonePoolKey('drill::assignment::7c0a-1')).toBe(true);
    expect(isStandalonePoolKey('drill::practice-test::run::leg-1')).toBe(false);
    expect(isStandalonePoolKey('drill::timed-section::x')).toBe(false);
    expect(isStandalonePoolKey(null)).toBe(false);
  });
});

describe('buildCloseoutPayload', () => {
  const s = session([
    ['q1', { selectedAnswer: 'B', correct: true, timeMs: 60000 }],
    ['q2', { selectedAnswer: 'C', correct: false, timeMs: 70000 }],
  ]);

  it('writes one attempt per answered question and one journal item per miss, answered or not', () => {
    const p = buildCloseoutPayload(s, { nowIso: '2026-11-20T00:00:00.000Z' });
    expect(p.attempts.map((a) => a.qid)).toEqual(['q1', 'q2']);
    expect(p.journal.map((j) => j.qid)).toEqual(['q2', 'q3']);
    expect(p.journal[1].item).toMatchObject({ chosen_answer: UNANSWERED, correct_answer: 'B', result: 0 });
    expect(p.history).toMatchObject({ initial_score: 1, unanswered_count: 1, total_time_ms: 130000 });
    expect(p.questions).toHaveLength(3);
  });

  it('never carries identity or practice-test fields', () => {
    const p = buildCloseoutPayload(s) as unknown as Record<string, unknown>;
    for (const k of ['user_id', 'class_id', 'practice_test_run_id', 'practice_test_leg', 'timed_section_sitting_id']) {
      expect(k in p).toBe(false);
      expect(k in (p.history as Record<string, unknown>)).toBe(false);
    }
  });

  it('includes the assignment id only for an assigned section', () => {
    expect('assignment_id' in buildCloseoutPayload(s)).toBe(false);
    expect(buildCloseoutPayload(s, { assignmentId: 'a-1' }).assignment_id).toBe('a-1');
  });
});

describe('runStandaloneCloseout', () => {
  const s = session([['q1', { selectedAnswer: 'B', correct: true, timeMs: 1 }]]);
  const args = { userId: 'u1', poolKey: 'drill::section::pt105-s2', session: s };

  it('opens, closes and caches the sitting', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'open', sitting_id: 's1', generation: 1 }, error: null });
    rpc.mockResolvedValueOnce({ data: { status: 'created', history_id: 'h1', conflict: false }, error: null });
    const r = await runStandaloneCloseout(args);
    expect(r).toMatchObject({ status: 'created', historyId: 'h1', createdNow: true });
    expect(rpc.mock.calls[1][0]).toBe('close_standalone_section_v1');
    expect(readCachedSitting('u1', args.poolKey)).toEqual({ id: 's1', generation: 1 });
  });

  it('a retry after a lost reply returns the saved row and does not close again', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'open', sitting_id: 's1', generation: 1 }, error: null });
    rpc.mockResolvedValueOnce({ data: { status: 'created', history_id: 'h1' }, error: null });
    await runStandaloneCloseout(args);
    rpc.mockClear();
    rpc.mockResolvedValueOnce({ data: { status: 'closed', sitting_id: 's1', generation: 1, history_id: 'h1' }, error: null });
    const r = await runStandaloneCloseout(args);
    expect(r).toMatchObject({ status: 'replayed', historyId: 'h1', createdNow: false });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_known_sitting_id: 's1' });
  });

  it('a stale tab whose successor closed gets the saved result', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'stale', latest_state: 'closed', sitting_id: 's2', generation: 2, history_id: 'h2' }, error: null });
    const r = await runStandaloneCloseout(args);
    expect(r).toMatchObject({ status: 'replayed', historyId: 'h2', conflict: true });
  });

  it('a stale tab whose successor is open is refused', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'stale', latest_state: 'open', sitting_id: 's2', generation: 2 }, error: null });
    const r = await runStandaloneCloseout(args);
    expect(r.status).toBe('stale');
  });

  it('surfaces a server error so Finish can be retried', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    await expect(runStandaloneCloseout(args)).rejects.toThrow('network');
  });

  it('uses an already-opened sittingId directly without a second open call', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'created', history_id: 'h9', conflict: false }, error: null });
    const r = await runStandaloneCloseout({ ...args, sittingId: 's-opened-at-start' });
    expect(r).toMatchObject({ status: 'created', historyId: 'h9', createdNow: true });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe('close_standalone_section_v1');
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_sitting_id: 's-opened-at-start' });
  });
});

describe('initStandaloneSitting (Phase 1.3)', () => {
  const poolKey = 'drill::section::pt105-s2';

  it('opens at section start without p_restart, caches sitting id, and binds storage key', async () => {
    rpc.mockResolvedValueOnce({
      data: { status: 'open', sitting_id: 'sit-1', generation: 1, history_id: null, adopted: true, adopted_revision: '2026-11-20T10:00:00Z' },
      error: null,
    });
    const reply = await initStandaloneSitting({ userId: 'u1', poolKey });
    expect(reply).toMatchObject({
      status: 'open',
      sittingId: 'sit-1',
      generation: 1,
      adopted: true,
      adoptedRevision: '2026-11-20T10:00:00Z',
    });
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_pool_key: poolKey,
      p_restart: false,
      p_expected_generation: null,
    });
    expect(readCachedSitting('u1', poolKey)).toEqual({ id: 'sit-1', generation: 1 });
    expect(sittingStorageKey(poolKey, reply.sittingId)).toBe('drill::section::pt105-s2#sit-1');
  });

  it('on reload with a closed sitting id, returns closed + historyId and never passes p_restart', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'open', sitting_id: 'sit-1', generation: 1, history_id: null }, error: null });
    await initStandaloneSitting({ userId: 'u1', poolKey });
    rpc.mockClear();

    rpc.mockResolvedValueOnce({ data: { status: 'closed', sitting_id: 'sit-1', generation: 1, history_id: 'hist-1' }, error: null });
    const reply = await initStandaloneSitting({ userId: 'u1', poolKey });
    expect(reply).toMatchObject({ status: 'closed', historyId: 'hist-1' });
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_known_sitting_id: 'sit-1', p_restart: false });
  });

  it('on stale tab whose successor closed, resolves to closed + successor historyId', async () => {
    rpc.mockResolvedValueOnce({
      data: { status: 'stale', latest_state: 'closed', sitting_id: 'sit-2', generation: 2, history_id: 'hist-2' },
      error: null,
    });
    const reply = await initStandaloneSitting({ userId: 'u1', poolKey });
    expect(reply).toMatchObject({ status: 'closed', sittingId: 'sit-2', generation: 2, historyId: 'hist-2' });
    expect(readCachedSitting('u1', poolKey)).toEqual({ id: 'sit-2', generation: 2 });
  });

  it('only explicit restart passes p_restart: true with the cached generation as p_expected_generation', async () => {
    rpc.mockResolvedValueOnce({ data: { status: 'open', sitting_id: 'sit-1', generation: 2, history_id: null }, error: null });
    await initStandaloneSitting({ userId: 'u1', poolKey });
    rpc.mockClear();

    rpc.mockResolvedValueOnce({ data: { status: 'open', sitting_id: 'sit-3', generation: 3, history_id: null }, error: null });
    const reply = await initStandaloneSitting({ userId: 'u1', poolKey, restart: true });
    expect(reply).toMatchObject({ status: 'open', sittingId: 'sit-3', generation: 3 });
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_restart: true,
      p_expected_generation: 2,
      p_known_sitting_id: null,
    });
  });
});
