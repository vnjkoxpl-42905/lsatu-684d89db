import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), email: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
vi.mock('@/lib/assignmentEmail', () => ({ sendAssignmentEmail: mocks.email }));
import { notifyStudentOfClassroomItem, summarizeNotifyResult } from './classroomNotify';
const input = { adminUserId: 'teacher', studentId: 'student', title: 'Private future work', route: '/my-work/to-do', notificationGroupId: 'group' };
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockImplementation(async (name) => ({ data: name === 'claim_assignment_notification_channels' ? true : {}, error: null })); mocks.from.mockImplementation(() => { throw new Error('inbox unavailable'); }); mocks.email.mockResolvedValue({ ok: true }); });
describe('assignment delivery channels', () => {
  it('preserves the TA inbox and bell channels without adding email or claiming it was sent', async () => {
    mocks.from.mockImplementation((table) => table === 'conversation_participants' ? { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }), insert: () => Promise.resolve({ error: null }) } : table === 'conversations' ? { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'conversation' }, error: null }) }) }) } : { insert: () => Promise.resolve({ error: null }) });
    const result = await notifyStudentOfClassroomItem({ ...input, sendEmail: false });
    expect(result).toMatchObject({ inbox_ok: true, bell_ok: true, email_ok: false, email_skipped: true });
    expect(result.email_error).toBeUndefined(); expect(mocks.email).not.toHaveBeenCalled();
    expect(summarizeNotifyResult(result)).toBe('Assigned and notified');
  });
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
  it('queues future recap messages through persisted group finalization without early message or email delivery', async () => {
    const result = await notifyStudentOfClassroomItem({ ...input, notificationChannel: 'message', unlockAt: '2099-01-01T00:00:00Z' });
    expect(result).toMatchObject({ deferred: true, bell_ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith('finalize_assignment_notification_group', expect.objectContaining({ p_group_id: 'group', p_title: input.title, p_link: input.route }));
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
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
    expect(mocks.rpc.mock.calls.filter(([name]) => name === 'finalize_assignment_notification_group')).toHaveLength(2); expect(mocks.email).toHaveBeenCalledOnce(); expect(mocks.from).toHaveBeenCalledOnce(); expect(mocks.rpc.mock.calls.at(-1)![1].p_group_id).toBe('group');
  });
  it('records thrown email failures without throwing away committed assignment success', async () => {
    mocks.email.mockRejectedValue(new Error('email unavailable'));
    const result = await notifyStudentOfClassroomItem(input); expect(result.bell_ok).toBe(true); expect(result.email_ok).toBe(false); expect(result.email_error).toBe('email unavailable');
  });
});


it('sends optional channels only for the winning concurrent group claim', async () => {
  let claimed = false;
  mocks.rpc.mockImplementation(async (name) => name === 'claim_assignment_notification_channels' ? { data: claimed ? false : (claimed = true), error: null } : { data: {}, error: null });
  mocks.from.mockImplementation((table) => table === 'conversation_participants' ? { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }), insert: () => Promise.resolve({ error: null }) } : table === 'conversations' ? { insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'conversation' }, error: null }) }) }) } : { insert: () => Promise.resolve({ error: null }) });
  const results = await Promise.all([notifyStudentOfClassroomItem(input), notifyStudentOfClassroomItem(input)]);
  expect(mocks.email).toHaveBeenCalledTimes(1); expect(mocks.from.mock.calls.filter(([table]) => table === 'messages')).toHaveLength(1);
  expect(results.filter((result) => result.optional_channels_skipped)).toHaveLength(1);
  expect(results.every((result) => result.bell_ok)).toBe(true);
  const skipped = results.find((result) => result.optional_channels_skipped)!;
  expect(skipped).toMatchObject({ inbox_ok: false, email_ok: false }); expect(summarizeNotifyResult(skipped)).toBe('Assigned. Already announced.');
});
it('preserves the durable bell without sending optional channels when their claim fails', async () => {
  mocks.rpc.mockImplementation(async (name) => name === 'claim_assignment_notification_channels' ? { data: null, error: { message: 'claim unavailable' } } : { data: {}, error: null });
  const result = await notifyStudentOfClassroomItem(input);
  expect(result).toMatchObject({ bell_ok: true, inbox_ok: false, email_ok: false, inbox_error: 'claim unavailable', email_error: 'claim unavailable' });
  expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.email).not.toHaveBeenCalled();
});
