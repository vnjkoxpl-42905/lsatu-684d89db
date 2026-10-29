import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import type { Message, Participant } from '@/hooks/useInbox';
import { formatParticipantName } from '@/lib/displayName';
import { initialsFromName } from './inboxDisplay';

export interface MessageCluster {
  senderId: string;
  speakerName: string;
  speakerRoleLabel: 'Student' | 'Instructor';
  speakerInitials: string;
  isInstructor: boolean;
  isOwn: boolean;
  showAvatar: boolean;
  createdAt: string;
  messages: Message[];
}

export interface DaySection {
  key: string;
  label: string;
  clusters: MessageCluster[];
}

/** Same-sender messages further apart than this start a new cluster, so each
 *  burst of conversation keeps its own timestamp header. */
export const CLUSTER_GAP_MS = 15 * 60 * 1000;

function dayLabel(date: Date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

function resolveSpeaker(participant: Participant | undefined) {
  const isInstructor = !!participant?.is_admin;
  const normalizedName = formatParticipantName(participant?.display_name, participant?.is_admin);

  if (isInstructor) {
    return {
      speakerName: 'Joshua',
      speakerRoleLabel: 'Instructor' as const,
      speakerInitials: 'J',
      isInstructor: true,
    };
  }

  const speakerName =
    participant?.display_name?.trim() || (normalizedName !== 'User' ? normalizedName : 'Student');

  return {
    speakerName,
    speakerRoleLabel: 'Student' as const,
    speakerInitials: speakerName === 'Student' ? 'S' : initialsFromName(speakerName).slice(0, 1) || 'S',
    isInstructor: false,
  };
}

export function buildDaySections(
  messages: Message[],
  participants: Participant[],
  ownId: string,
): DaySection[] {
  const sections: DaySection[] = [];
  const participantById = new Map(participants.map((participant) => [participant.user_id, participant]));

  let currentDay: Date | null = null;
  let currentSection: DaySection | null = null;
  let currentCluster: MessageCluster | null = null;

  messages.forEach((message, index) => {
    const created = new Date(message.created_at);

    if (!currentDay || !isSameDay(currentDay, created)) {
      currentDay = created;
      currentSection = {
        key: format(created, 'yyyy-MM-dd'),
        label: dayLabel(created),
        clusters: [],
      };
      sections.push(currentSection);
      currentCluster = null;
    }

    const previous = messages[index - 1];
    const sameSenderAsPrevious =
      !!previous &&
      previous.sender_id === message.sender_id &&
      isSameDay(new Date(previous.created_at), created) &&
      created.getTime() - new Date(previous.created_at).getTime() < CLUSTER_GAP_MS;

    if (!sameSenderAsPrevious || !currentCluster) {
      const participant = participantById.get(message.sender_id);
      const speaker = resolveSpeaker(participant);

      currentCluster = {
        senderId: message.sender_id,
        speakerName: speaker.speakerName,
        speakerRoleLabel: speaker.speakerRoleLabel,
        speakerInitials: speaker.speakerInitials,
        isInstructor: speaker.isInstructor,
        isOwn: message.sender_id === ownId,
        showAvatar: true,
        createdAt: message.created_at,
        messages: [],
      };
      currentSection!.clusters.push(currentCluster);
    }

    currentCluster.messages.push(message);
  });

  return sections;
}
