import { describe, expect, it, vi } from 'vitest';
import { gmailThreadToTodo } from './useGmailTodoSource';
import type { GmailThreadSummary } from '@/features/admin-inbox/gmail/api';

function thread(overrides: Partial<GmailThreadSummary>): GmailThreadSummary {
  return {
    id: 'thread-1',
    snippet: 'Can you look at my flaw drill?',
    from: '"Lydia Student" <lydia@example.com>',
    to: 'Joshua <joshua@example.com>',
    subject: 'Flaw drill',
    date: 'Fri, 19 Jun 2026 12:00:00 +0000',
    internalDate: String(Date.parse('2026-06-19T12:00:00Z')),
    messageCount: 1,
    senders: ['Lydia Student'],
    labelIds: ['INBOX'],
    unread: true,
    starred: false,
    hasAttachments: false,
    ...overrides,
  };
}

describe('gmailThreadToTodo', () => {
  it('turns a latest student inbox thread into an email to-do', () => {
    vi.setSystemTime(new Date('2026-06-19T12:30:00Z'));

    expect(gmailThreadToTodo(thread({}), 'joshua@example.com')).toMatchObject({
      sourceKind: 'gmail',
      label: 'Email',
      threadId: 'thread-1',
      fromName: 'Lydia Student',
      fromEmail: 'lydia@example.com',
      title: 'Flaw drill',
      timing: '30m waiting',
      openPath: '/inbox?pane=gmail&t=thread-1',
    });
  });

  it('clears a thread when the latest sender is the admin account', () => {
    expect(
      gmailThreadToTodo(
        thread({
          id: 'thread-2',
          from: 'Joshua <joshua@example.com>',
        }),
        'joshua@example.com',
      ),
    ).toBeNull();
  });

  it.each([
    ['GitHub notification', 'GitHub <notifications@github.com>'],
    ['Doodle notification', 'Doodle <no-reply@doodle.com>'],
    ['newsletter', 'LSAT Updates <newsletter@example.org>'],
    ['mailer daemon', 'Mailer Daemon <mailer-daemon@googlemail.com>'],
  ])('does not turn %s into a teacher to-do', (_label, from) => {
    expect(
      gmailThreadToTodo(
        thread({
          id: `thread-${_label}`,
          from,
        }),
        'joshua@example.com',
      ),
    ).toBeNull();
  });

  // The filter used to match blocked terms as substrings, so any student whose
  // address merely contained one vanished from the queue without a trace.
  it.each([
    ['a surname containing "updates"', '"Sarah Updegraff" <sarah.updegraff@example.com>'],
    ['a surname containing "daemon"', '"Marc Daemonte" <mdaemonte@example.com>'],
    ['a name containing "digest"', '"Ana Digestivo" <ana.digestivo@example.com>'],
    ['a local part containing "noreply"', '"Nora Eplyn" <noreplyn@example.com>'],
  ])('still queues a real person with %s', (_label, from) => {
    expect(
      gmailThreadToTodo(thread({ id: `thread-${_label}`, from }), 'joshua@example.com'),
    ).not.toBeNull();
  });
});
