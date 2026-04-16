import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import type { Message } from '@/hooks/useInbox';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  message: Message;
  isOwn: boolean;
  senderName?: string | null;
}

export function MessageBubble({ message, isOwn, senderName }: Props) {
  return (
    <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
      {!isOwn && senderName && (
        <div className="text-xs text-muted-foreground px-1">{senderName}</div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm',
          isOwn
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-card border border-border rounded-bl-sm'
        )}
      >
        {message.body && <div className="text-sm whitespace-pre-wrap break-words">{message.body}</div>}
        {message.attachments.map((a) => (
          <AttachmentCard key={a.id} attachment={a} />
        ))}
      </div>
      <div className="text-[10px] text-muted-foreground px-1">
        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
      </div>
    </div>
  );
}
