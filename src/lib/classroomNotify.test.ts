import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), email: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/lib/assignmentEmail', () => ({ sendAssignmentEmail: mocks.email }));
import { notifyStudentOfClassroomItem } from './classroomNotify';
const input = { adminUserId: 'teacher', studentId: 'student', title: 'Private future work', route: '/my-work/to-do', notificationGroupId: 'group' };
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: {}, error: null }); mocks.from.mockImplementation(() => { throw new Error('inbox unavailable'); }); mocks.email.mockResolvedValue({ ok: true }); });
describe('assignment delivery channels', () => {
  it('publishes the one generic plan summary and retries only its bell', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    const result = await notifyStudentOfClassroomItem({ ...input, notificationChannel: 'plan', title: 'Your plan is ready', description: 'Your assigned plan is available in My Work.' });
    expect(mocks.rpc).toHaveBeenCalledWith('publish_assignment_plan_notification', expect.objectContaining({ p_group_id: 'group', p_student_id: 'student' }));
    expect(JSON.stringify(mocks.rpc.mock.calls)).not.toContain('Private future work'); await result.retryBell!(); expect(mocks.email).toHaveBeenCalledOnce();
  });
  it('finalizes scheduled work without an immediate inbox, email, or client bell insert', async () => {
    const result = await notifyStudentOfClassroomItem({ ...input, unlockAt: '2099-01-01T00:00:00Z' });
    expect(result.deferred).toBe(true); expect(result.bell_ok).toBe(true); expect(mocks.rpc).toHaveBeenCalledOnce(); expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
  });
  it('does not deliver explicitly suppressed work', async () => {
    await notifyStudentOfClassroomItem({ ...input, notificationPolicy: 'suppressed' });
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
  });
  it('offers retry for the same durable bell group without repeating email or inbox', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    const result = await notifyStudentOfClassroomItem(input);
    expect(result.bell_ok).toBe(false); expect(result.email_ok).toBe(true);
    await result.retryBell!();
    expect(mocks.rpc).toHaveBeenCalledTimes(2); expect(mocks.email).toHaveBeenCalledOnce(); expect(mocks.from).toHaveBeenCalledOnce(); expect(mocks.rpc.mock.calls[1][1].p_group_id).toBe('group');
  });
  it('records thrown email failures without throwing away committed assignment success', async () => {
    mocks.email.mockRejectedValue(new Error('email unavailable'));
    const result = await notifyStudentOfClassroomItem(input); expect(result.bell_ok).toBe(true); expect(result.email_ok).toBe(false); expect(result.email_error).toBe('email unavailable');
  });
});
