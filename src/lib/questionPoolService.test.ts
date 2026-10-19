import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionPoolService, servesFixedQueue } from './questionPoolService';

// Phase 2: markQuestionSeen is an atomic increment (increment_question_seen).
// It is fire-and-forget telemetry: it must warn (not throw) on error so it never
// breaks the drill flow.

let mockRpcError: { message: string } | null = null;
const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: mockRpcError });
    },
  },
}));

beforeEach(() => {
  mockRpcError = null;
  rpcCalls.length = 0;
});

describe('markQuestionSeen (atomic RPC)', () => {
  it('calls increment_question_seen with class/qid/mode', async () => {
    await QuestionPoolService.markQuestionSeen('PT1-S1-Q1', 'class-1', 'adaptive');
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe('increment_question_seen');
    expect(rpcCalls[0].args).toEqual({
      p_class_id: 'class-1',
      p_qid: 'PT1-S1-Q1',
      p_mode: 'adaptive',
    });
  });

  it('does not throw on error (warns instead)', async () => {
    mockRpcError = { message: 'rls denied' };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      QuestionPoolService.markQuestionSeen('PT1-S1-Q1', 'class-1', 'adaptive'),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('filterQuestionPool (allowRepeats)', () => {
  // Minimal LRQuestion stubs; filterQuestionPool only reads qid.
  const q = (qid: string) => ({ qid }) as any;
  const questions = [q('A'), q('B'), q('C'), q('D')];
  // A and B were just seen; C and D are unseen.
  const seenNow = new Date().toISOString();
  const usage = new Map<string, any>([
    ['A', { last_seen_at: seenNow }],
    ['B', { last_seen_at: seenNow }],
  ]);
  const ids = (r: { available: Array<{ qid: string }> }) =>
    r.available.map(x => x.qid).sort();

  it('allowRepeats + !preferUnseen returns the whole bank even when unseen exist', () => {
    const r = QuestionPoolService.filterQuestionPool(questions, usage, {
      allowRepeats: true,
      preferUnseen: false,
      recycleAfterDays: 7,
    });
    expect(ids(r)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('allowRepeats + preferUnseen returns only unseen while any exist', () => {
    const r = QuestionPoolService.filterQuestionPool(questions, usage, {
      allowRepeats: true,
      preferUnseen: true,
      recycleAfterDays: 7,
    });
    expect(ids(r)).toEqual(['C', 'D']);
  });

  it('allowRepeats + preferUnseen falls back to the whole bank once unseen run out', () => {
    const allSeen = new Map<string, any>([
      ['A', { last_seen_at: seenNow }],
      ['B', { last_seen_at: seenNow }],
      ['C', { last_seen_at: seenNow }],
      ['D', { last_seen_at: seenNow }],
    ]);
    const r = QuestionPoolService.filterQuestionPool(questions, allSeen, {
      allowRepeats: true,
      preferUnseen: true,
      recycleAfterDays: 7,
    });
    expect(ids(r)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('!allowRepeats excludes recently-seen questions', () => {
    const r = QuestionPoolService.filterQuestionPool(questions, usage, {
      allowRepeats: false,
      preferUnseen: false,
      recycleAfterDays: 7,
    });
    // A and B seen today, recycle window 7d -> only unseen C, D available.
    expect(ids(r)).toEqual(['C', 'D']);
  });
});

describe('servesFixedQueue', () => {
  it('exempts a full section, which is an artifact and not a selection', () => {
    // The bug: PT103.S1 is 26 questions in a fixed order, and pool dedupe was
    // handing over 25 of them because one had been met in a drill.
    expect(servesFixedQueue('full-section', null)).toBe(true);
    expect(servesFixedQueue('full-section', { selectedQids: [] })).toBe(true);
  });

  it('exempts a queue the caller named by qid', () => {
    expect(servesFixedQueue('type-drill', { selectedQids: ['q1'] })).toBe(true);
    expect(servesFixedQueue('natural-drill', { selectedQids: ['q1'] })).toBe(true);
  });

  it('still pools a generated drill, which is what dedupe is for', () => {
    expect(servesFixedQueue('type-drill', { selectedQids: [] })).toBe(false);
    expect(servesFixedQueue('type-drill', null)).toBe(false);
    expect(servesFixedQueue('natural-drill', undefined)).toBe(false);
    expect(servesFixedQueue('adaptive', null)).toBe(false);
  });
});
