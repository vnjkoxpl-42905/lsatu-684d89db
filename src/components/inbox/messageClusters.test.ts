import { describe, expect, it } from 'vitest';
import { buildDaySections } from '@/components/inbox/messageClusters';
import type { Message, Participant } from '@/hooks/useInbox';

function makeMessage(
  id: string,
  senderId: string,
  createdAt: string,
  body: string,
): Message {
  return {
    id,
    conversation_id: 'conv-1',
    sender_id: senderId,
    body,
    created_at: createdAt,
    attachments: [],
  };
}

const participants: Participant[] = [
  {
    id: 'p-1',
    conversation_id: 'conv-1',
    user_id: 'student-1',
    last_read_at: '2026-06-03T12:00:00.000Z',
    display_name: 'Lydia',
    is_admin: false,
  },
  {
    id: 'p-2',
    conversation_id: 'conv-1',
    user_id: 'admin-1',
    last_read_at: '2026-06-03T12:00:00.000Z',
    display_name: 'Joshua Fisseha',
    is_admin: true,
  },
];

describe('buildDaySections', () => {
  it('builds speaker clusters with resolved names, roles, and avatar rules for admin view', () => {
    const messages = [
      makeMessage('m-1', 'student-1', '2026-06-03T09:00:00.000Z', 'First'),
      makeMessage('m-2', 'student-1', '2026-06-03T09:02:00.000Z', 'Second'),
      makeMessage('m-3', 'admin-1', '2026-06-03T09:05:00.000Z', 'Reply'),
    ];

    const sections = buildDaySections(messages, participants, 'admin-1');

    expect(sections).toHaveLength(1);
    expect(sections[0].clusters).toHaveLength(2);

    expect(sections[0].clusters[0]).toMatchObject({
      senderId: 'student-1',
      speakerName: 'Lydia',
      speakerRoleLabel: 'Student',
      speakerInitials: 'L',
      isOwn: false,
      showAvatar: true,
    });
    expect(sections[0].clusters[0].messages).toHaveLength(2);

    expect(sections[0].clusters[1]).toMatchObject({
      senderId: 'admin-1',
      speakerName: 'Joshua',
      speakerRoleLabel: 'Instructor',
      speakerInitials: 'J',
      isOwn: true,
      showAvatar: true,
    });
  });

  it('uses the student real name for their own messages in student view', () => {
    const messages = [
      makeMessage('m-1', 'student-1', '2026-06-03T09:00:00.000Z', 'Question'),
      makeMessage('m-2', 'admin-1', '2026-06-03T09:05:00.000Z', 'Answer'),
    ];

    const sections = buildDaySections(messages, participants, 'student-1');

    expect(sections[0].clusters[0]).toMatchObject({
      speakerName: 'Lydia',
      speakerRoleLabel: 'Student',
      isOwn: true,
      showAvatar: true,
    });
    expect(sections[0].clusters[1]).toMatchObject({
      speakerName: 'Joshua',
      speakerRoleLabel: 'Instructor',
      isOwn: false,
      showAvatar: true,
    });
  });

  it('splits same-sender messages into separate clusters across a long gap', () => {
    const messages = [
      makeMessage('m-1', 'student-1', '2026-06-03T09:00:00.000Z', 'Morning question'),
      makeMessage('m-2', 'student-1', '2026-06-03T09:10:00.000Z', 'Follow-up'),
      makeMessage('m-3', 'student-1', '2026-06-03T17:00:00.000Z', 'Evening question'),
    ];

    const sections = buildDaySections(messages, participants, 'admin-1');

    expect(sections).toHaveLength(1);
    expect(sections[0].clusters).toHaveLength(2);
    expect(sections[0].clusters[0].messages.map((m) => m.id)).toEqual(['m-1', 'm-2']);
    expect(sections[0].clusters[1].messages.map((m) => m.id)).toEqual(['m-3']);
    expect(sections[0].clusters[1].createdAt).toBe('2026-06-03T17:00:00.000Z');
  });

  it('keeps same-sender messages within the gap window in one cluster', () => {
    const messages = [
      makeMessage('m-1', 'student-1', '2026-06-03T09:00:00.000Z', 'One'),
      makeMessage('m-2', 'student-1', '2026-06-03T09:14:00.000Z', 'Two'),
    ];

    const sections = buildDaySections(messages, participants, 'admin-1');

    expect(sections[0].clusters).toHaveLength(1);
    expect(sections[0].clusters[0].messages).toHaveLength(2);
  });

  it('falls back to Student when a student display name is missing', () => {
    const namelessParticipants: Participant[] = [
      { ...participants[0], display_name: null },
      participants[1],
    ];
    const messages = [makeMessage('m-1', 'student-1', '2026-06-03T09:00:00.000Z', 'Question')];

    const sections = buildDaySections(messages, namelessParticipants, 'admin-1');

    expect(sections[0].clusters[0]).toMatchObject({
      speakerName: 'Student',
      speakerRoleLabel: 'Student',
      speakerInitials: 'S',
    });
  });
});
