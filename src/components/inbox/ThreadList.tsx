import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/hooks/useInbox';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

function otherParticipantName(c: Conversation, ownId: string) {
  const others = c.participants.filter((p) => p.user_id !== ownId);
  if (others.length === 0) return c.subject || 'Conversation';
  return others.map((o) => o.display_name || 'Unnamed').join(', ');
}

export function ThreadList({ conversations, activeId, onSelect }: Props) {
  const { user } = useAuth();
  if (!user) return null;

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((c) => {
        const name = otherParticipantName(c, user.id);
        const initial = name.charAt(0).toUpperCase();
        const isActive = c.id === activeId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-accent/50 transition-colors',
              isActive && 'bg-accent'
            )}
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
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
                <div className={cn('text-xs truncate flex-1', c.unread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {c.last_message?.body || c.subject || 'New conversation'}
                </div>
                {c.unread && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
