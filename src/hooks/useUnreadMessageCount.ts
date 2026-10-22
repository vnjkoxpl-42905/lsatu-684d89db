import { useInbox } from '@/hooks/useInbox';

/**
 * How many conversations are waiting for the signed-in user.
 *
 * Changed 2026-10-22 from a count of MESSAGES to a count of unread
 * CONVERSATIONS. The rail used to read "5" while Home read "1" for the same
 * inbox, because one counted replies and the other counted threads. Every
 * badge now uses one unit, so a student with one thread sees 0 or 1.
 *
 * This reads the shared inbox owner rather than running its own queries: the
 * rail is rendered twice (desktop aside + mobile sheet), and both mounts plus
 * Home and the messenger now share one fetch and one realtime channel.
 */
export function useUnreadMessageCount() {
  return useInbox().unreadCount;
}
