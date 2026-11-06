import type { Message } from '@/hooks/useInbox';
import { classifyInboxAttachmentMime } from '@/lib/inboxAttachments';

/** What the composer holds while the user is replying to a message. */
export interface ReplyDraft {
  id: string;
  author: string;
  text: string;
}

/** What a sent reply shows above its own text. `deleted` means the original
 *  is no longer in the thread. */
export type ReplyQuoteData =
  | { id: string; deleted: false; author: string; text: string }
  | { id: string; deleted: true };

export const REPLY_PREVIEW_MAX = 140;

/** One short line that stands in for a message: its words, or "Photo" / "PDF"
 *  / "Attachment" when it carried only a file. */
export function replyPreviewText(message: Pick<Message, 'body' | 'attachments'>): string {
  const collapsed = (message.body ?? '').replace(/\s+/g, ' ').trim();
  if (collapsed) {
    return collapsed.length > REPLY_PREVIEW_MAX
      ? `${collapsed.slice(0, REPLY_PREVIEW_MAX).trimEnd()}…`
      : collapsed;
  }
  const first = message.attachments?.[0];
  if (!first) return 'Message';
  const kind = classifyInboxAttachmentMime(first.mime_type);
  if (kind === 'image') return 'Photo';
  if (kind === 'pdf') return 'PDF';
  return 'Attachment';
}

/** Resolve a reply's target against the messages already loaded for this
 *  thread. An id that is not in the thread reads as deleted, which is also what
 *  keeps a stray id from ever showing another conversation's text. */
export function resolveReplyQuote(
  replyToId: string | null | undefined,
  messagesById: ReadonlyMap<string, Message>,
  authorOf: (senderId: string) => string,
): ReplyQuoteData | null {
  if (!replyToId) return null;
  const target = messagesById.get(replyToId);
  if (!target) return { id: replyToId, deleted: true };
  return {
    id: replyToId,
    deleted: false,
    author: authorOf(target.sender_id),
    text: replyPreviewText(target),
  };
}

/** Pixels the message has to travel before letting go starts a reply. */
export const REPLY_THRESHOLD_PX = 56;
/** The message never travels farther than this; past it the drag resists. */
export const REPLY_MAX_TRAVEL_PX = 72;

/** True when a release at this horizontal offset should open a reply. */
export function reachedReplyThreshold(offsetX: number) {
  return offsetX >= REPLY_THRESHOLD_PX;
}
