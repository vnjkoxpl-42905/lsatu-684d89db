import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@/hooks/useNotifications';
import { notificationToFocus } from './useTodayFocus';
const notification: Notification = { id: 'n', user_id: 's', type: 'assignment', title: 'Assigned work', body: null, read: false, created_at: '2026-10-28', link: '/testing' };
describe('Today focus notification destinations', () => {
  it('does not acknowledge a mapped assignment on navigation', () => {
    const markRead = vi.fn(); const focus = notificationToFocus({ ...notification, assignmentIdentity: { sourceTable: 'practice_test_assignments', sourceId: 'a', issuance: 2 } }, markRead);
    expect(focus?.route).toContain('workId=a'); expect(focus?.onOpen).toBeUndefined(); expect(markRead).not.toHaveBeenCalled();
  });
  it('acknowledges an unmapped legacy generic summary on click without creating receipts', async () => {
    const markRead = vi.fn().mockResolvedValue(undefined); const focus = notificationToFocus({ ...notification, link: '/my-work/to-do' }, markRead); await focus?.onOpen?.(); expect(markRead).toHaveBeenCalledWith('n');
  });
  it('carries the explicit collection group and defers its acknowledgment', () => { const focus = notificationToFocus({ ...notification, assignmentGroupId: 'g' }, vi.fn()); expect(focus?.route).toBe('/my-work/to-do?workGroup=g'); expect(focus?.onOpen).toBeUndefined(); });
});
