import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ identity: null as string | null, denied: false, lateSwitch: false, reads: [] as { table: string; owner: string }[], assertScope: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/studentScopedWork', () => ({ assertActiveStudentScope: state.assertScope }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc, from: (table: string) => {
  let owner = '';
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn((key: string, value: string) => { if (key === 'user_id') owner = value; return chain; }), order: vi.fn().mockReturnThis(),
    range: vi.fn(async () => { state.reads.push({ table, owner }); return { data: table === 'attempts' ? [{ id: 'a', user_id: owner, qid: 'PT101.S2.Q1', mode: 'adaptive', correct: false, selected_answer: 'B', timestamp_iso: '2026-09-30T12:00:00Z' }] : [], error: null }; }) };
  return chain;
} } }));
import { loadFirstAnswerLedger } from './firstAnswerSources';
const actor = '11111111-1111-4111-8111-111111111111', owner = '22222222-2222-4222-8222-222222222222';
const scope = { mode: 'selected_student' as const, actorId: actor, studentId: owner };
beforeEach(() => { state.identity = owner; state.denied = false; state.lateSwitch = false; state.reads = []; state.rpc.mockReset().mockImplementation(async () => ({ data: state.identity, error: state.denied ? { code: '42501' } : null })); state.assertScope.mockReset().mockImplementation(async () => { if (state.lateSwitch && state.reads.length > 0) throw new Error('account changed'); }); });
it('reads real canonical selected owner filters after identity acknowledgement and retains class scope', async () => {
  const selected = await loadFirstAnswerLedger(scope);
  expect(selected.ownerId).toBe(owner); expect(selected.answers).toMatchObject([{ attemptId: 'attempts:a', correct: false }]);
  expect(state.rpc).toHaveBeenCalledWith('get_student_progress_user_id', { p_class_id: owner });
  expect(state.reads).toHaveLength(5); expect(state.reads.every(read => read.owner === owner)).toBe(true); expect(scope.studentId).toBe(owner);
});
it('keeps self UUID reads unchanged without the selected-class RPC', async () => {
  const own = await loadFirstAnswerLedger({ mode: 'self', actorId: owner, studentId: owner });
  expect(own.ownerId).toBe(owner); expect(state.rpc).not.toHaveBeenCalled(); expect(state.reads.every(read => read.owner === owner)).toBe(true);
});
it('rejects distinct class/auth transport identities, backend denial and missing mapping before any source query', async () => {
  state.identity = actor; await expect(loadFirstAnswerLedger(scope)).rejects.toThrow('canonical account');
  state.identity = null; await expect(loadFirstAnswerLedger(scope)).rejects.toThrow('no confirmed account');
  state.denied = true; await expect(loadFirstAnswerLedger(scope)).rejects.toThrow('missing or conflicting mapping');
  expect(state.reads).toHaveLength(0);
});
it('does not publish a ledger returned after the active account changes during source reads', async () => {
  state.lateSwitch = true;
  await expect(loadFirstAnswerLedger(scope)).rejects.toThrow('account changed');
  expect(state.reads).toHaveLength(5);
});
