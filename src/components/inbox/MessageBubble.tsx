import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import type { Message } from '@/hooks/useInbox';
import { format, isToday, isYesterday } from 'date-fns';

interface Props {
  message: Message;
  isOwn: boolean;
  senderName?: string | null;
}

function shortTime(d: Date) {
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

export function MessageBubble({ message, isOwn, senderName }: Props) {
  const created = new Date(message.created_at);
  return (
    <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
      {!isOwn && senderName && (
        <div className="text-[11px] text-muted-foreground px-1">{senderName}</div>
      )}
      <div className={cn('max-w-[80%] flex flex-col gap-2', isOwn ? 'items-end' : 'items-start')}>
        {message.body && (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed',
              isOwn
                ? 'bg-primary/90 text-primary-foreground rounded-br-md'
                : 'bg-muted/60 text-foreground border border-border/60 rounded-bl-md',
            )}
          >
            {message.body}
          </div>
        )}
        {message.attachments.length > 0 && (
          <div className={cn('flex flex-col gap-1.5 w-full', isOwn ? 'items-end' : 'items-start')}>
            {message.attachments.map((a) => (
              <AttachmentCard key={a.id} attachment={a} />
            ))}
          </div>
        )}
      </div>
      <div className="text-[10px] text-muted-foreground px-1">{shortTime(created)}</div>
    </div>
  );
}
