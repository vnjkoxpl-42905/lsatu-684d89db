import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rpc: vi.fn(), saved: null as Record<string, unknown> | null, readError: null as Error | null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: state.rpc,
  from: () => { const q = { select: () => q, eq: () => q,
    single: async () => ({ data: state.saved, error: state.readError }) }; return q; },
} }));
import { assignReadingCenter, hasReadingCenterAccess, isReadingCenterAssignment, revokeReadingCenter } from './readingCenterAccess';

const item = { id: 'item-1', student_id: 'student-1', type: 'activity', source_table: 'reading_center',
  source_id: 'library', visible_to_student: true, status: 'assigned' };
beforeEach(() => { state.rpc.mockReset(); state.saved = { ...item }; state.readError = null; });
describe('Reading Center assignment contract', () => {
  it('verifies the actual student launcher after the grant RPC', async () => {
    state.rpc.mockResolvedValue({ data: { item, reused: false }, error: null });
    expect(await assignReadingCenter({ studentId: 'student-1' })).toEqual({ item, reused: false });
    expect(state.rpc).toHaveBeenCalledWith('assign_reading_center', expect.objectContaining({ p_student_id: 'student-1', p_unlock_at: null }));
  });
  it('returns the existing verified item for an idempotent retry', async () => {
    state.rpc.mockResolvedValue({ data: { item, reused: true }, error: null });
    expect((await assignReadingCenter({ studentId: 'student-1' })).reused).toBe(true);
  });
  it('does not report success for a different student or a hidden launcher', async () => {
    state.rpc.mockResolvedValue({ data: { item: { ...item, student_id: 'other' } }, error: null });
    await expect(assignReadingCenter({ studentId: 'student-1' })).rejects.toThrow('could not be verified');
    state.rpc.mockResolvedValue({ data: { item }, error: null });
    state.saved = { ...item, visible_to_student: false };
    await expect(assignReadingCenter({ studentId: 'student-1' })).rejects.toThrow('not available');
  });
  it('does not claim verification when the database readback fails', async () => {
    state.rpc.mockResolvedValue({ data: { item }, error: null }); state.readError = new Error('database unavailable');
    await expect(assignReadingCenter({ studentId: 'student-1' })).rejects.toThrow('database unavailable');
  });
  it('sends the chosen local start date as the access unlock time', async () => {
    state.rpc.mockResolvedValue({ data: { item }, error: null });
    await assignReadingCenter({ studentId: 'student-1', scheduledForLocalDate: '2026-10-14' });
    expect(state.rpc.mock.calls[0][1].p_unlock_at).toEqual(new Date(2026, 9, 14).toISOString());
  });
  it('uses the database decision and reports access failures', async () => {
    state.rpc.mockResolvedValue({ data: false, error: null }); expect(await hasReadingCenterAccess()).toBe(false);
    state.rpc.mockResolvedValue({ data: true, error: null }); expect(await hasReadingCenterAccess()).toBe(true);
    state.rpc.mockResolvedValue({ data: null, error: new Error('permission denied') });
    await expect(hasReadingCenterAccess()).rejects.toThrow('permission denied');
  });
  it('revokes through the admin-only RPC', async () => {
    state.rpc.mockResolvedValue({ data: null, error: null }); await revokeReadingCenter('student-1');
    expect(state.rpc).toHaveBeenCalledWith('revoke_reading_center', { p_student_id: 'student-1' });
  });
  it('requires immutable source fields rather than editable metadata', () => {
    expect(isReadingCenterAssignment(item as never)).toBe(true);
    expect(isReadingCenterAssignment({ ...item, source_table: 'activity_assignments' } as never)).toBe(false);
    expect(isReadingCenterAssignment({ ...item, source_id: 'different-tool' } as never)).toBe(false);
  });
});
