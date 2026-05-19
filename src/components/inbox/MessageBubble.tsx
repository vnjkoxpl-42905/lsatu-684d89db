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
      <div className={cn('flex flex-col gap-2 group', isOwn ? 'items-end' : 'items-start')}>
        {/* Dossier Label */}
        <div className={cn(
          "text-[9px] font-mono font-black uppercase tracking-[0.3em] flex items-center gap-2",
          isOwn ? "text-white/40" : "text-white/20"
        )}>
          {isOwn ? "JOSHUA" : senderName?.toUpperCase() || "STUDENT"}
          {showTimestamp && (
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-medium ml-2">
              {shortTime(created).toUpperCase()}
            </span>
          )}
        </div>

        <div
          className={cn(
            'flex flex-col gap-3 max-w-[85%] md:max-w-[80%]',
            isOwn ? 'items-end' : 'items-start',
          )}
        >
          {hasBody && (
            <div
              className={cn(
                'px-6 py-4 text-[14px] leading-relaxed break-words border transition-all',
                isOwn
                  ? 'bg-white text-black border-white font-serif italic selection:bg-black/10'
                  : 'bg-black text-white/90 border-white/20 selection:bg-white/20',
                isOwn 
                  ? "shadow-[4px_4px_0_rgba(255,255,255,0.05)]" 
                  : "shadow-[4px_4px_0_rgba(255,255,255,0.02)]"
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
