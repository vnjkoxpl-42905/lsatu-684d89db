import { describe, expect, it } from 'vitest';
import type { GmailThreadSummary } from '@/features/admin-inbox/gmail/api';
import type { Conversation } from '@/hooks/useInbox';
import {
  emailNeedsReply,
  itemKey,
  mergeInboxItems,
  parseItemKey,
  type InboxFilter,
  type InboxSourceFilter,
} from './inboxItems';

const OWN_ID = 'admin-1';
const ADMIN_EMAIL = 'contact@aspiringattorneys.com';

function conversation(over: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    subject: 'Homework question',
    created_by: OWN_ID,
    created_at: '2026-08-01T10:00:00.000Z',
    last_message_at: '2026-08-03T10:00:00.000Z',
    home_cleared_at: null,
    participants: [
      { id: 'p1', conversation_id: 'c1', user_id: OWN_ID, last_read_at: '', display_name: 'Joshua', is_admin: true },
      { id: 'p2', conversation_id: 'c1', user_id: 'stu-1', last_read_at: '', display_name: 'Lexi Rivera' },
    ],
    last_message: { body: 'Can we go over question 12?', created_at: '2026-08-03T10:00:00.000Z', sender_id: 'stu-1' },
    unread: true,
    hasAttachments: false,
    ...over,
  };
}

function thread(over: Partial<GmailThreadSummary> = {}): GmailThreadSummary {
  return {
    id: 'g1',
    snippet: 'Following up on the consultation',
    from: 'Dana Cole <dana@example.com>',
    to: ADMIN_EMAIL,
    subject: 'Consultation follow-up',
    date: 'Sun, 3 Aug 2026 09:00:00 -0400',
    // 2026-08-03T09:00:00Z — an hour before the platform thread above.
    internalDate: String(Date.UTC(2026, 7, 3, 9, 0, 0)),
    messageCount: 1,
    senders: ['Dana Cole <dana@example.com>'],
    labelIds: ['INBOX', 'UNREAD'],
    unread: true,
    starred: false,
    hasAttachments: false,
    ...over,
  };
}

function merge(over: {
  conversations?: Conversation[];
  threads?: GmailThreadSummary[];
  sourceFilter?: InboxSourceFilter;
  filter?: InboxFilter;
  query?: string;
} = {}) {
  return mergeInboxItems({
    conversations: over.conversations ?? [conversation()],
    ownId: OWN_ID,
    threads: over.threads ?? [thread()],
    adminEmail: ADMIN_EMAIL,
    sourceFilter: over.sourceFilter ?? 'all',
    filter: over.filter ?? 'all',
    query: over.query ?? '',
  });
}

describe('parseItemKey', () => {
  it('round-trips a platform key', () => {
    expect(parseItemKey(itemKey('platform', 'abc'))).toEqual({ source: 'platform', id: 'abc' });
  });

  it('keeps colons inside a Gmail id intact', () => {
    expect(parseItemKey('email:19a:b')).toEqual({ source: 'email', id: '19a:b' });
  });

  it('rejects junk rather than guessing a source', () => {
    expect(parseItemKey(undefined)).toBeNull();
    expect(parseItemKey('nonsense')).toBeNull();
    expect(parseItemKey('drive:1')).toBeNull();
    expect(parseItemKey('email:')).toBeNull();
  });
});

describe('mergeInboxItems', () => {
  it('interleaves both sources newest first', () => {
    const items = merge();
    expect(items.map((i) => i.key)).toEqual(['platform:c1', 'email:g1']);
  });

  it('honours the source chips', () => {
    expect(merge({ sourceFilter: 'platform' }).every((i) => i.source === 'platform')).toBe(true);
    expect(merge({ sourceFilter: 'email' }).every((i) => i.source === 'email')).toBe(true);
  });

  it('applies the unread filter across both sources', () => {
    const items = merge({
      conversations: [conversation({ unread: false })],
      threads: [thread({ unread: true })],
      filter: 'unread',
    });
    expect(items.map((i) => i.key)).toEqual(['email:g1']);
  });

  it('applies the attachments filter across both sources', () => {
    const items = merge({
      conversations: [conversation({ hasAttachments: true })],
      threads: [thread({ hasAttachments: false })],
      filter: 'attachments',
    });
    expect(items.map((i) => i.key)).toEqual(['platform:c1']);
  });

  it('treats needs-reply the same on both sides', () => {
    const items = merge({
      // Last word was mine on the platform thread, so it is not waiting on me.
      conversations: [
        conversation({
          last_message: { body: 'Sent you the drill', created_at: '2026-08-03T10:00:00.000Z', sender_id: OWN_ID },
        }),
      ],
      filter: 'needs_reply',
    });
    expect(items.map((i) => i.key)).toEqual(['email:g1']);
  });

  it('searches sender, subject and preview together', () => {
    expect(merge({ query: 'lexi' }).map((i) => i.key)).toEqual(['platform:c1']);
    expect(merge({ query: 'consultation' }).map((i) => i.key)).toEqual(['email:g1']);
    expect(merge({ query: 'question 12' }).map((i) => i.key)).toEqual(['platform:c1']);
    expect(merge({ query: 'zzz' })).toEqual([]);
  });

  it('drops platform threads when the viewer is unknown rather than mislabelling them', () => {
    const items = mergeInboxItems({
      conversations: [conversation()],
      ownId: null,
      threads: [thread()],
      adminEmail: ADMIN_EMAIL,
      sourceFilter: 'all',
      filter: 'all',
      query: '',
    });
    expect(items.map((i) => i.source)).toEqual(['email']);
  });
});

describe('emailNeedsReply', () => {
  it('is false when the last word was the admin\'s', () => {
    expect(emailNeedsReply(thread({ from: `Joshua <${ADMIN_EMAIL}>` }), ADMIN_EMAIL)).toBe(false);
  });

  it('is false for mailers, true for people', () => {
    expect(emailNeedsReply(thread({ from: 'Calendly <no-reply@calendly.com>' }), ADMIN_EMAIL)).toBe(false);
    expect(emailNeedsReply(thread(), ADMIN_EMAIL)).toBe(true);
  });

  it('is false when there is no sender to reply to', () => {
    expect(emailNeedsReply(thread({ from: '' }), ADMIN_EMAIL)).toBe(false);
  });
});
