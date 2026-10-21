import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logWrongAnswer, logCorrectAnswer } from './wajService';

// Phase 2: the WAJ history append is now an atomic RPC. logWrongAnswer upserts
// (append_waj_wrong); logCorrectAnswer is update-only (append_waj_correct).
// Both must surface a write error rather than silently dropping a history item.

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

const base = {
  class_id: 'class-1',
  qid: 'PT1-S1-Q1',
  pt: 1,
  section: 1,
  qnum: 1,
  qtype: 'Weaken',
  level: 3,
  chosen_answer: 'B',
  correct_answer: 'D',
  time_ms: 5000,
  confidence_1_5: 3,
};

describe('logWrongAnswer (atomic append)', () => {
  it('calls append_waj_wrong with the history item + question metadata', async () => {
    await logWrongAnswer(base);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe('append_waj_wrong');
    expect(rpcCalls[0].args).toMatchObject({
      p_class_id: 'class-1',
      p_qid: 'PT1-S1-Q1',
      p_pt: 1,
      p_qtype: 'Weaken',
      p_level: 3,
    });
    const item = rpcCalls[0].args.p_item as { result: number; chosen_answer: string };
    expect(item.result).toBe(0);
    expect(item.chosen_answer).toBe('B');
  });

  it('throws when the rpc errors', async () => {
    mockRpcError = { message: 'conflict' };
    await expect(logWrongAnswer(base)).rejects.toEqual({ message: 'conflict' });
  });
});

describe('logCorrectAnswer (atomic append, update-only)', () => {
  it('calls append_waj_correct with a result=1 history item', async () => {
    await logCorrectAnswer({ ...base, chosen_answer: 'D' });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe('append_waj_correct');
    const item = rpcCalls[0].args.p_item as { result: number };
    expect(item.result).toBe(1);
  });

  it('throws when the rpc errors', async () => {
    mockRpcError = { message: 'transient' };
    await expect(logCorrectAnswer({ ...base, chosen_answer: 'D' })).rejects.toEqual({ message: 'transient' });
  });
});
