import { describe, expect, it } from 'vitest';
import type { Notification } from '@/hooks/useNotifications';
import { assignmentNotificationNavigation } from './assignmentNotificationRoute';
const base: Notification = { id: 'n', user_id: 's', type: 'assignment', title: 'Work', body: null, link: '/classroom', read: false, created_at: '2026-10-28' };
describe('notification navigation acknowledgment', () => {
  it('defers a mapped message-channel recap until the owned document has loaded', () => { const destination = assignmentNotificationNavigation({ ...base, type: 'message', link: '/classroom/item/recap', assignmentIdentity: { sourceTable: 'classroom_items', sourceId: 'recap', issuance: 1 } }); expect(destination.acknowledgeOnClick).toBe(false); expect(destination.route).toContain('workSource=classroom_items'); });
  it('keeps an external assigned link unread and preserves its URL without identity parameters', () => expect(assignmentNotificationNavigation({ ...base, link: 'https://example.com/article' })).toEqual({ route: 'https://example.com/article', acknowledgeOnClick: false }));
  it('keeps other notification types available but refuses assignment click acknowledgment when mapping fails', () => { expect(assignmentNotificationNavigation({ ...base, assignmentMappingUnavailable: true }).acknowledgeOnClick).toBe(false); expect(assignmentNotificationNavigation({ ...base, type: 'signup', link: '/teacher/students', assignmentMappingUnavailable: true }).acknowledgeOnClick).toBe(true); });
  it('retains click acknowledgment for an unmappable legacy generic summary', () => expect(assignmentNotificationNavigation(base)).toEqual({ route: '/classroom', acknowledgeOnClick: true }));
  it('defers exactly mapped legacy and current assignment alerts until successful load', () => { const destination = assignmentNotificationNavigation({ ...base, link: '/testing', assignmentIdentity: { sourceTable: 'practice_test_assignments', sourceId: 'id', issuance: 2 } }); expect(destination.acknowledgeOnClick).toBe(false); expect(destination.route).toContain('workSource=practice_test_assignments'); expect(destination.route).toContain('workIssuance=2'); });
  it('routes a group to its explicit collection and never acknowledges on navigation', () => expect(assignmentNotificationNavigation({ ...base, assignmentGroupId: 'group' })).toEqual({ route: '/my-work/to-do?workGroup=group', acknowledgeOnClick: false }));
});

describe('unmapped or missing work targets', () => {
  it.each(['/classroom/item/deleted', '/classroom/ta/deleted', '/classroom/00000000-0000-4000-8000-000000000001', '/activities/00000000-0000-4000-8000-000000000001', '/guided/deleted', '/guided-drills/missing', '/bootcamp/conditionals', '/conditional-indicators-refresher', '/quick-drills/unless-drill', '/topics/abstract', '/testing?pt=155', '/reading-center'])('preserves an unmapped specific assignment alert at %s', (link) => {
    expect(assignmentNotificationNavigation({ ...base, link })).toEqual({ route: link, acknowledgeOnClick: false });
  });
  it.each(['/classroom', '/classroom?from=alert', '/my-work', '/my-work/to-do', '/inbox'])('retains legacy generic summary click acknowledgment at %s', (link) => expect(assignmentNotificationNavigation({ ...base, link }).acknowledgeOnClick).toBe(true));
  it('never treats an unmapped or invalid contextual group URL as a generic summary', () => expect(assignmentNotificationNavigation({ ...base, link: '/my-work/to-do?workGroup=missing' }).acknowledgeOnClick).toBe(false));
  it('preserves an unmapped recap document alert without falsely reading a conversation', () => expect(assignmentNotificationNavigation({ ...base, type: 'message', link: '/classroom/item/deleted' }).acknowledgeOnClick).toBe(false));
  it('retains nonwork notification and conversation click behavior', () => { expect(assignmentNotificationNavigation({ ...base, type: 'reminder', link: '/activities/deleted' }).acknowledgeOnClick).toBe(true); expect(assignmentNotificationNavigation({ ...base, type: 'message', link: '/inbox/conversation' }).acknowledgeOnClick).toBe(true); });
});

describe('legacy Inbox assignment summary', () => {
  it('dismisses only the generic summary notification without attaching a document identity', () => {
    expect(assignmentNotificationNavigation({ ...base, link: '/inbox' })).toEqual({ route: '/inbox', acknowledgeOnClick: true });
  });
  it.each(['/inbox/thread-id', '/inbox?workGroup=missing', '/inbox?workSource=classroom_items&workId=missing', 'https://example.com/inbox'])('keeps specific, contextual or external assignment links unread: %s', link => {
    expect(assignmentNotificationNavigation({ ...base, link }).acknowledgeOnClick).toBe(false);
  });
  it('keeps the Inbox summary unread when assignment mapping is unavailable', () => {
    expect(assignmentNotificationNavigation({ ...base, link: '/inbox', assignmentMappingUnavailable: true }).acknowledgeOnClick).toBe(false);
  });
});
