import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateDailyStats } from './gamification';

// Phase 2 atomic-counter contract: updateDailyStats must call the
// increment_daily_stats RPC (not a read-modify-write) and must surface a write
// error instead of swallowing it.

let mockRpcError: { message: string } | null = null;
const rpcCalls: Array<{ name: string; args: unknown }> = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: null, error: mockRpcError });
    },
  },
}));

beforeEach(() => {
  mockRpcError = null;
  rpcCalls.length = 0;
});

describe('updateDailyStats (atomic RPC)', () => {
  it('calls increment_daily_stats with the mapped args', async () => {
    await updateDailyStats('class-1', 25, 4200, true);
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe('increment_daily_stats');
    expect(rpcCalls[0].args).toMatchObject({
      p_class_id: 'class-1',
      p_xp: 25,
      p_time_ms: 4200,
      p_correct: true,
    });
    // date is derived at call time; assert shape not value
    expect((rpcCalls[0].args as { p_date: string }).p_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('does not read-modify-write (single rpc, no table access)', async () => {
    await updateDailyStats('class-1', 0, 0, false);
    expect(rpcCalls).toHaveLength(1);
  });

  it('throws when the rpc returns an error', async () => {
    mockRpcError = { message: 'rls denied' };
    await expect(updateDailyStats('class-1', 10, 1000, true)).rejects.toEqual({ message: 'rls denied' });
  });
});
