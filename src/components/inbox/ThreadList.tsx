import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
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
    <div>
      {conversations.map((c) => {
        const fallback = isAdmin ? 'Conversation' : 'Joshua';
        const name = otherParticipantName(c, user.id, fallback);
        const initial = name.charAt(0).toUpperCase();
        const isActive = c.id === activeId;
        const reply = isAdmin && needsReply(c, user.id);
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full px-4 py-3 flex items-start gap-3 text-left transition-colors',
              'border-l-2 border-b border-border/60',
              isActive
                ? 'bg-accent/60 border-l-primary'
                : 'border-l-transparent hover:bg-accent/30'
            )}
          >
            <div className="w-9 h-9 rounded-full bg-muted/70 flex items-center justify-center text-xs font-medium shrink-0 text-foreground/80">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm truncate">{name}</div>
                <div className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true })}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <div
                  className={cn(
                    'text-xs truncate flex-1',
                    c.unread ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {c.last_message?.body || c.subject || 'New conversation'}
                </div>
                {isAdmin && c.hasAttachments && (
                  <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" aria-label="Has attachments" />
                )}
                {c.unread && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </div>
              {reply && (
                <div className="mt-1.5 inline-flex items-center text-[10px] uppercase tracking-wider text-amber-600/90 dark:text-amber-400/90">
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
