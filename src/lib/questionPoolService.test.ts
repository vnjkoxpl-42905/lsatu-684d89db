import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuestionPoolService } from './questionPoolService';

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
