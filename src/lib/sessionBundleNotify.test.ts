import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: mocks }));
vi.mock('@/lib/adminConversation', () => ({ getOrCreateAdminStudentConversation: vi.fn().mockResolvedValue('conversation') }));
import { notifyStudentOfSessionRecap } from './sessionBundleNotify';
const input = { admin: { id: 'teacher' } as User, studentId: 'student', route: '/classroom/item/recap', notificationGroupId: 'recap-group' };
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockImplementation(async (name) => ({ data: name === 'claim_assignment_notification_channels' ? true : {}, error: null })); mocks.from.mockImplementation(() => ({ insert: () => Promise.resolve({ error: null }), update: () => ({ eq: () => Promise.resolve({ error: null }) }) })); });
describe('durable recap notification', () => {
  it('preserves its existing inbox message and finalizes a message bell without inserting a second alert', async () => {
    expect(await notifyStudentOfSessionRecap(input)).toMatchObject({ inbox_ok: true, bell_ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith('finalize_assignment_notification_group', { p_group_id: 'recap-group', p_title: 'New recap in your Classroom', p_message: 'A recap from your latest session is ready.', p_link: input.route });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['messages', 'conversations']);
  });
  it('preserves the source and reports failed durable delivery without sending unclaimed inbox messages', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'queue unavailable' } });
    expect(await notifyStudentOfSessionRecap(input)).toMatchObject({ inbox_ok: false, bell_ok: false, bell_error: 'queue unavailable', inbox_error: 'queue unavailable' });
  });
});


it('skips the recap inbox message when another invocation already claimed its group', async () => {
  mocks.rpc.mockImplementation(async (name) => ({ data: name === 'claim_assignment_notification_channels' ? false : {}, error: null }));
  expect(await notifyStudentOfSessionRecap(input)).toMatchObject({ inbox_ok: false, bell_ok: true, optional_channels_skipped: true });
  expect(mocks.from).not.toHaveBeenCalled();
});
