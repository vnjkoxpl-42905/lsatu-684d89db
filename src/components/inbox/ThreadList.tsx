import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { Paperclip } from 'lucide-react';
import type { Conversation } from '@/hooks/useInbox';
import { formatParticipantName } from '@/lib/displayName';

type Variant = 'admin' | 'student';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  variant?: Variant;
  emptyLabel?: string;
}

function otherParticipantName(c: Conversation, ownId: string, fallback: string) {
  const others = c.participants.filter((p) => p.user_id !== ownId);
  const names = others
    .map((o) => formatParticipantName(o.display_name, o.is_admin))
    .filter((n) => n && n !== 'User');
  if (names.length > 0) return names.join(', ');
  return c.subject || fallback;
}

function needsReply(c: Conversation, ownId: string) {
  return !!(c.last_message && c.last_message.sender_id !== ownId);
}

function compactTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function ThreadList({
  conversations,
  activeId,
  onSelect,
  variant = 'admin',
  emptyLabel,
}: Props) {
  const { user } = useAuth();
  if (!user) return null;

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        {emptyLabel ?? 'No conversations yet.'}
      </div>
    );
  }

  const isAdmin = variant === 'admin';

  return (
    <div role="list">
      {conversations.map((c) => {
        const fallback = isAdmin ? 'Conversation' : 'Joshua';
        const name = otherParticipantName(c, user.id, fallback);
        const initial = name.charAt(0).toUpperCase();
        const isActive = c.id === activeId;
        const reply = isAdmin && needsReply(c, user.id);
        return (
          <button
            key={c.id}
            role="listitem"
            onClick={() => onSelect(c.id)}
            className={cn(
              'group w-full px-4 py-3.5 flex items-start gap-3 text-left',
              'border-l-2 border-b border-border/50',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:bg-accent/40',
              isActive
                ? 'bg-accent/70 border-l-primary'
                : 'border-l-transparent hover:bg-accent/30',
            )}
          >
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-shadow',
                isActive
                  ? 'bg-foreground/10 text-foreground ring-1 ring-foreground/20'
                  : 'bg-muted text-foreground/70',
              )}
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    'truncate text-sm',
                    c.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
                  )}
                >
                  {name}
                </div>
                <div
                  className={cn(
                    'shrink-0 text-[10px] tabular-nums',
                    c.unread ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {compactTime(c.last_message_at)}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    'text-xs flex-1 line-clamp-1 break-words',
                    c.unread ? 'text-foreground/90' : 'text-muted-foreground',
                  )}
                >
                  {c.last_message?.body || c.subject || 'New conversation'}
                </div>
                {isAdmin && c.hasAttachments && (
                  <Paperclip
                    className="w-3 h-3 text-muted-foreground shrink-0"
                    aria-label="Has attachments"
                  />
                )}
                {c.unread && (
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"
                    aria-label="Unread"
                  />
                )}
              </div>
              {reply && (
                <div className="mt-1.5 inline-flex items-center px-1.5 py-px text-[9px] uppercase tracking-[0.12em] font-semibold rounded text-amber-700 dark:text-amber-300/90 bg-amber-500/10">
                  Needs reply
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
