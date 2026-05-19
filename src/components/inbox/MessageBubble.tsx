import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import type { Message } from '@/hooks/useInbox';
import { format, isToday } from 'date-fns';

interface Props {
  message: Message;
  isOwn: boolean;
  senderName?: string | null;
  showTimestamp?: boolean;
}

function shortTime(d: Date) {
  if (isToday(d)) return format(d, 'h:mm a');
  return format(d, 'MMM d, h:mm a');
}

export function MessageBubble({ message, isOwn, senderName, showTimestamp = true }: Props) {
  const created = new Date(message.created_at);
  const hasBody = !!message.body;
  const hasAttachments = message.attachments.length > 0;

  return (
    <div className={cn('flex flex-col gap-1.5', isOwn ? 'items-end' : 'items-start')}>
      {!isOwn && senderName && (
        <div className="text-[11px] font-medium text-muted-foreground px-1 mt-1">{senderName}</div>
      )}
      <div
        className={cn(
          'flex flex-col gap-1.5 max-w-[88%] md:max-w-[72%]',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {hasBody && (
          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-relaxed shadow-sm',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-background text-foreground border border-border/70 rounded-bl-md',
            )}
          >
            {message.body}
          </div>
        )}
        {hasAttachments && (
          <div
            className={cn(
              'flex flex-col gap-1.5 w-full max-w-full',
              isOwn ? 'items-end' : 'items-start',
            )}
          >
            {message.attachments.map((a) => (
              <AttachmentCard key={a.id} attachment={a} />
            ))}
          </div>
        )}
      </div>
      {showTimestamp && (
        <div className="text-[10px] text-muted-foreground/70 px-1">{shortTime(created)}</div>
      )}
    </div>
  );
}
