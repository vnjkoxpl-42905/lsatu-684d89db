import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ identity: null as string | null, denied: false, lateSwitch: false, reads: [] as { table: string; owner: string; columns: string }[], rows: {} as Record<string, unknown[]>, assertScope: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/studentScopedWork', () => ({ assertActiveStudentScope: state.assertScope }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: state.rpc, from: (table: string) => {
  let owner = '', columns = '';
  const chain = { select: vi.fn((value: string) => { columns = value; return chain; }), eq: vi.fn((key: string, value: string) => { if (key === 'user_id') owner = value; return chain; }), order: vi.fn().mockReturnThis(),
    range: vi.fn(async () => { state.reads.push({ table, owner, columns }); return { data: state.rows[table] ?? (table === 'attempts' ? [{ id: 'a', user_id: owner, qid: 'PT101.S2.Q1', mode: 'adaptive', correct: false, selected_answer: 'B', timestamp_iso: '2026-09-30T12:00:00Z' }] : []), error: null }; }) };
  return chain;
} } }));
import { loadFirstAnswerLedger } from './firstAnswerSources';
const actor = '11111111-1111-4111-8111-111111111111', owner = '22222222-2222-4222-8222-222222222222';
const scope = { mode: 'selected_student' as const, actorId: actor, studentId: owner };
beforeEach(() => { state.identity = owner; state.denied = false; state.lateSwitch = false; state.reads = []; state.rows = {}; state.rpc.mockReset().mockImplementation(async () => ({ data: state.identity, error: state.denied ? { code: '42501' } : null })); state.assertScope.mockReset().mockImplementation(async () => { if (state.lateSwitch && state.reads.length > 0) throw new Error('account changed'); }); });
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

it('selects legacy RC config and gates its answers on their completed practice-test parent', async () => {
  state.rows.rc_drill_sessions = [{ id: 'session', user_id: owner, status: 'completed', completed_at: '2026-09-30T12:00:00Z', excluded_from_analytics: false, practice_test_run_id: null, config: { practiceTestRunId: 'legacy-run' } }];
  state.rows.rc_attempts = [{ id: 'rc', user_id: owner, session_id: 'session', passage_id: 1, question_id: 1, selected: 'B', is_correct: false, created_at: '2026-09-30T11:00:00Z' }];
  const unfinished = await loadFirstAnswerLedger(scope);
  expect(state.reads.find(read => read.table === 'rc_drill_sessions')?.columns.split(',')).toContain('config');
  expect(unfinished.answers.some(answer => answer.source === 'rc_attempts')).toBe(false);
  expect(unfinished.coverage.excludedRows.rc_attempts).toBe(1);

  state.rows.practice_test_runs = [{ id: 'legacy-run', user_id: owner, status: 'complete', completed_at: '2026-09-30T12:00:00Z' }];
  const completed = await loadFirstAnswerLedger(scope);
  expect(completed.answers.filter(answer => answer.source === 'rc_attempts')).toMatchObject([{ attemptId: 'rc_attempts:rc', mode: 'practice-test' }]);
  expect(completed.coverage.excludedRows.rc_attempts).toBe(0);
});

it.each([42, false, {}, []])('excludes malformed legacy parent %j and accounts for its answer in coverage', async (practiceTestRunId) => {
  state.rows.rc_drill_sessions = [{ id: 'malformed', user_id: owner, status: 'completed', completed_at: '2026-09-30T12:00:00Z', excluded_from_analytics: false, practice_test_run_id: null, config: { practiceTestRunId } }];
  state.rows.rc_attempts = [{ id: 'protected', user_id: owner, session_id: 'malformed', passage_id: 1, question_id: 1, selected: 'B', is_correct: true, created_at: '2026-09-30T11:00:00Z' }];
  const ledger = await loadFirstAnswerLedger(scope);
  expect(ledger.answers.some(answer => answer.source === 'rc_attempts')).toBe(false);
  expect(ledger.coverage.excludedRows.rc_attempts).toBe(1);
  // A successfully read source with intentionally excluded rows is not a failed read.
  expect(ledger.coverage.includedSources).toContain('rc_attempts');
  expect(ledger.coverage.missingSources).toEqual([]);
});
