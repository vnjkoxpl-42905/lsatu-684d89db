import { beforeEach, describe, expect, it, vi } from 'vitest';
import { activityRevocationAvailable, revokeActivityAssignment } from './activityRevocation';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const client = { auth: { getUser: vi.fn() }, rpc: vi.fn() };
const receipt = {
  assignment_id: 'assignment-1', student_id: 'student-1', revoked_at: '2026-09-30T14:00:00Z',
  revoked_by: 'teacher-1', performed_by: 'teacher-1', already_revoked: false, mirrors_hidden: 2,
};
beforeEach(() => {
  client.auth.getUser.mockReset().mockResolvedValue({ data: { user: { id: 'teacher-1' } }, error: null });
  client.rpc.mockReset().mockImplementation(async (name: string) => ({
    data: name === 'activity_revocation_capability' ? { version: 1, source_preserving: true } : receipt,
    error: null,
  }));
});

describe('Activity source revocation contract', () => {
  it.each([{ error: { code: 'PGRST202' }, data: null }, { error: null, data: { version: 2, source_preserving: true } }, { error: null, data: { version: 1, source_preserving: false } }])('keeps unassignment unavailable for unsupported backend %j', async result => {
    client.rpc.mockResolvedValue(result);
    expect(await activityRevocationAvailable(client)).toBe(false);
    await expect(revokeActivityAssignment('assignment-1', 'student-1', client)).rejects.toThrow(/unavailable/);
    expect(client.rpc.mock.calls.every(([name]) => name === 'activity_revocation_capability')).toBe(true);
  });
  it('sends source and expected student IDs, with actor derived by the server', async () => {
    await expect(revokeActivityAssignment('assignment-1', 'student-1', client)).resolves.toEqual(receipt);
    expect(client.rpc).toHaveBeenCalledWith('revoke_activity_assignment', { p_assignment_id: 'assignment-1', p_student_id: 'student-1' });
  });
  it.each([null, { ...receipt, student_id: 'other-student' }, { ...receipt, performed_by: 'other-teacher' }, { ...receipt, revoked_by: 'other-teacher' }, { ...receipt, revoked_at: 'invalid' }])('rejects missing or mismatched acknowledgment %j', async data => {
    client.rpc.mockImplementation(async (name: string) => ({ data: name === 'activity_revocation_capability' ? { version: 1, source_preserving: true } : data, error: null }));
    await expect(revokeActivityAssignment('assignment-1', 'student-1', client)).rejects.toThrow(/did not confirm/);
  });
  it('accepts idempotent replay while preserving the original revoking teacher', async () => {
    const replay = { ...receipt, already_revoked: true, revoked_by: 'original-teacher', mirrors_hidden: 0 };
    client.rpc.mockImplementation(async (name: string) => ({ data: name === 'activity_revocation_capability' ? { version: 1, source_preserving: true } : replay, error: null }));
    await expect(revokeActivityAssignment('assignment-1', 'student-1', client)).resolves.toEqual(replay);
  });
  it('requires a current authenticated actor before even probing', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(revokeActivityAssignment('assignment-1', 'student-1', client)).rejects.toThrow(/Sign in/);
    expect(client.rpc).not.toHaveBeenCalled();
  });
});
