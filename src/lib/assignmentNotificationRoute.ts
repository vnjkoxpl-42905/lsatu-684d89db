import type { Notification } from '@/hooks/useNotifications';
import { withWorkIdentity } from '@/lib/studentWorkIdentity';

const GENERIC_WORK_SUMMARIES = new Set(['/classroom', '/classroom/my-work', '/my-work', '/my-work/to-do', '/my-work/notes', '/inbox']);

function notificationWorkRoute(link: string | null) {
  if (!link) return null;
  try {
    const url = new URL(link, 'https://lsatprep.study');
    if (url.origin !== 'https://lsatprep.study') return null;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const contextual = ['workGroup', 'workSource', 'workId', 'workIssuance'].some((key) => url.searchParams.has(key));
    return {
      genericSummary: GENERIC_WORK_SUMMARIES.has(path) && !contextual,
      specificWork: contextual || /^\/classroom\/(?:item|ta)\//.test(path) || /^\/classroom\/[0-9a-f-]{36}$/i.test(path) || /^\/(?:activities|guided|guided-drills|bootcamp|quick-drills|topics|reading-center|testing|practice\/exams|drill|section)(?:\/|$)/.test(path) || path === '/conditional-indicators-refresher',
    };
  } catch { return null; }
}

export function assignmentNotificationNavigation(notification: Notification) {
  if (notification.assignmentIdentity && notification.link) {
    return { route: withWorkIdentity(notification.link, notification.assignmentIdentity), acknowledgeOnClick: false };
  }
  if (notification.assignmentGroupId) {
    return { route: '/my-work/to-do?workGroup=' + encodeURIComponent(notification.assignmentGroupId), acknowledgeOnClick: false };
  }
  const workRoute = notificationWorkRoute(notification.link);
  // A missing source or failed mapping is not evidence that a document loaded.
  // Only legacy collection summaries may acknowledge an assignment on click.
  if (notification.type === 'assignment') {
    return { route: notification.link, acknowledgeOnClick: !!workRoute?.genericSummary && !notification.assignmentMappingUnavailable };
  }
  // Recap/message alerts pointing at work obey the same successful-load rule,
  // while conversation and other notification behavior remains separate.
  return { route: notification.link, acknowledgeOnClick: !(notification.type === 'message' && workRoute?.specificWork) };
}
