import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import type { Message } from '@/hooks/useInbox';
import { format, isToday } from 'date-fns';
import { useUserPermissions } from '@/hooks/useUserPermissions';

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
  const { is_admin } = useUserPermissions();
  const created = new Date(message.created_at);
  const hasBody = !!message.body;
  const hasAttachments = message.attachments.length > 0;

  if (is_admin) {
    return (
      <div className={cn('flex flex-col gap-2.5 group', isOwn ? 'items-end' : 'items-start')}>
        {/* Label */}
        <div className={cn(
          "text-[9px] font-bold uppercase tracking-[0.25em] flex items-center gap-3",
          isOwn ? "text-slate-400" : "text-slate-300"
        )}>
          {isOwn ? "JOSHUA" : senderName?.toUpperCase() || "STUDENT"}
          {showTimestamp && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-medium text-slate-400">
              {shortTime(created).toUpperCase()}
            </span>
          )}
        </div>

        <div
          className={cn(
            'flex flex-col gap-4 max-w-[85%] md:max-w-[75%]',
            isOwn ? 'items-end' : 'items-start',
          )}
        >
          {hasBody && (
            <div
              className={cn(
                'px-6 py-5 text-[15px] leading-[1.6] break-words border transition-all',
                isOwn
                  ? 'bg-slate-900 text-white border-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.08)] rounded-2xl rounded-tr-sm'
                  : 'bg-white text-slate-800 border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-2xl rounded-tl-sm',
              )}
            >
              {message.body}
            </div>
          )}
          {hasAttachments && (
            <div
              className={cn(
                'flex flex-col gap-3 w-full max-w-full',
                isOwn ? 'items-end' : 'items-start',
              )}
            >
              {message.attachments.map((a) => (
                <AttachmentCard key={a.id} attachment={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
      {!isOwn && senderName && (
        <div className="text-[11px] text-muted-foreground px-1 mt-1">{senderName}</div>
      )}
      <div
        className={cn(
          'flex flex-col gap-1.5 max-w-[85%] md:max-w-[70%]',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {hasBody && (
          <div
            className={cn(
              'rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words leading-relaxed',
              isOwn
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted/50 text-foreground rounded-bl-md',
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
        <div className="text-[10px] text-muted-foreground/80 px-1">{shortTime(created)}</div>
      )}
    </div>
  );
}
