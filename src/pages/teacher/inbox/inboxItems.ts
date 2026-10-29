import { parseAddress } from '@/features/admin-inbox/gmail/api';
import type { GmailThreadSummary } from '@/features/admin-inbox/gmail/api';
import { isLikelyHumanGmailSender } from '@/pages/teacher/desk/useGmailTodoSource';
import { needsReply as platformNeedsReply, otherParticipantName } from '@/components/inbox/inboxDisplay';
import type { Conversation } from '@/hooks/useInbox';

/**
 * The unified Inbox's list model (spec 5.3 / T3.3): platform threads and Gmail
 * threads reduced to one shape so a single sorted list, one set of filters, and
 * one search box work across both. Kept pure and separate from the room so the
 * merge/filter rules are testable without mounting Gmail.
 */

export type InboxSource = 'platform' | 'email';
export type InboxFilter = 'all' | 'unread' | 'needs_reply' | 'attachments';
export type InboxSourceFilter = 'all' | InboxSource;

export interface InboxItem {
  /** Stable, URL-safe identity across both sources: `platform:<id>` / `email:<id>`. */
  key: string;
  source: InboxSource;
  id: string;
  /** Who the thread is with — student name, or the email sender's name. */
  who: string;
  subject: string | null;
  preview: string;
  /** Epoch ms of the most recent activity; 0 when the source gave us nothing. */
  timestamp: number;
  unread: boolean;
  needsReply: boolean;
  hasAttachments: boolean;
}

export function itemKey(source: InboxSource, id: string) {
  return `${source}:${id}`;
}

export function parseItemKey(key: string | undefined): { source: InboxSource; id: string } | null {
  if (!key) return null;
  const sep = key.indexOf(':');
  if (sep <= 0) return null;
  const source = key.slice(0, sep);
  const id = key.slice(sep + 1);
  if (!id) return null;
  if (source !== 'platform' && source !== 'email') return null;
  return { source, id };
}

export function conversationToItem(conversation: Conversation, ownId: string): InboxItem {
  return {
    key: itemKey('platform', conversation.id),
    source: 'platform',
    id: conversation.id,
    who: otherParticipantName(conversation, ownId, 'Conversation'),
    subject: conversation.subject,
    preview: conversation.last_message?.body?.trim() ?? '',
    timestamp: new Date(conversation.last_message_at).getTime() || 0,
    unread: conversation.unread,
    needsReply: platformNeedsReply(conversation, ownId),
    hasAttachments: conversation.hasAttachments,
  };
}

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * An email needs a reply when the last word was someone else's and that someone
 * is a person rather than a mailer. Same heuristic the Today queue uses, so a
 * thread cannot be "needs reply" in one room and not the other.
 */
export function emailNeedsReply(thread: GmailThreadSummary, adminEmail: string | null): boolean {
  const sender = normalizedEmail(parseAddress(thread.from || '').email);
  if (!sender) return false;
  if (adminEmail && sender === normalizedEmail(adminEmail)) return false;
  return isLikelyHumanGmailSender(thread);
}

export function gmailThreadToItem(
  thread: GmailThreadSummary,
  adminEmail: string | null,
): InboxItem {
  const parsed = parseAddress(thread.from || '');
  const internalDate = Number(thread.internalDate ?? 0);
  return {
    key: itemKey('email', thread.id),
    source: 'email',
    id: thread.id,
    who: parsed.name?.trim() || parsed.email || 'Unknown sender',
    subject: thread.subject || null,
    preview: thread.snippet ?? '',
    timestamp: Number.isFinite(internalDate) && internalDate > 0 ? internalDate : 0,
    unread: thread.unread,
    needsReply: emailNeedsReply(thread, adminEmail),
    hasAttachments: thread.hasAttachments,
  };
}

export interface MergeParams {
  conversations: Conversation[];
  ownId: string | null;
  threads: GmailThreadSummary[];
  adminEmail: string | null;
  sourceFilter: InboxSourceFilter;
  filter: InboxFilter;
  query: string;
}

/**
 * One list, newest first. The source chips decide which halves contribute; the
 * unread / needs-reply / attachments filters and the search box then apply to
 * whatever is left, identically for both sources.
 */
export function mergeInboxItems({
  conversations,
  ownId,
  threads,
  adminEmail,
  sourceFilter,
  filter,
  query,
}: MergeParams): InboxItem[] {
  const items: InboxItem[] = [];

  if (sourceFilter !== 'email' && ownId) {
    for (const c of conversations) items.push(conversationToItem(c, ownId));
  }
  if (sourceFilter !== 'platform') {
    for (const t of threads) items.push(gmailThreadToItem(t, adminEmail));
  }

  const q = query.trim().toLowerCase();
  const matches = (item: InboxItem) => {
    if (q) {
      const haystack = `${item.who} ${item.subject ?? ''} ${item.preview}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filter === 'unread') return item.unread;
    if (filter === 'needs_reply') return item.needsReply;
    if (filter === 'attachments') return item.hasAttachments;
    return true;
  };

  return items.filter(matches).sort((a, b) => b.timestamp - a.timestamp);
}

export const EMPTY_LABEL: Record<InboxFilter, string> = {
  all: 'Nothing here yet.',
  unread: 'Nothing unread.',
  needs_reply: 'Nothing is waiting on a reply.',
  attachments: 'No threads with attachments.',
};
