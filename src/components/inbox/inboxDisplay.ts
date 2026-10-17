import type { Conversation } from '@/hooks/useInbox';
import { formatParticipantName } from '@/lib/displayName';

export function needsReply(conversation: Conversation, ownId: string) {
  return !!(
    conversation.last_message &&
    conversation.last_message.sender_id !== ownId
  );
}

export function otherParticipantName(
  conversation: Conversation,
  ownId: string,
  fallback: string,
) {
  const names = conversation.participants
    .filter((participant) => participant.user_id !== ownId)
    .map((participant) =>
      formatParticipantName(participant.display_name, participant.is_admin),
    )
    .filter((name) => name && name !== 'User');

  if (names.length > 0) return names.join(', ');
  return conversation.subject || fallback;
}

export function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}
