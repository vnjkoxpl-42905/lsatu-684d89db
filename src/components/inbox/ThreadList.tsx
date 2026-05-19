import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { MessageCircle, Paperclip } from 'lucide-react';
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
    <div role="list" className={cn(isAdmin && "bg-[#05070A]")}>
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
              'group w-full flex items-start gap-4 text-left transition-all relative',
              isAdmin 
                ? [
                    'px-4 py-5 border-b border-white/5',
                    isActive 
                      ? 'bg-white/[0.03]' 
                      : 'hover:bg-white/[0.02]'
                  ]
                : [
                    'px-3.5 py-3.5 rounded-lg border border-border/70 bg-background shadow-sm mt-2 first:mt-0',
                    isActive
                      ? 'border-primary/35 bg-primary/[0.04] ring-1 ring-primary/15'
                      : 'hover:bg-muted/40 hover:border-border'
                  ]
            )}
          >
            {/* Active Indicator (Admin only) */}
            {isAdmin && isActive && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]" />
            )}

            <div
              className={cn(
                'w-10 h-10 flex items-center justify-center text-xs font-bold shrink-0',
                isAdmin
                  ? [
                      'rounded-none border border-white/10',
                      isActive ? 'bg-white text-black border-white' : 'bg-black text-white/40'
                    ]
                  : [
                      'rounded-full',
                      isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-primary/10 text-primary ring-1 ring-primary/20'
                    ],
              )}
              aria-hidden="true"
            >
              {isAdmin ? initial : <MessageCircle className="w-4 h-4" />}
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    'truncate text-[13px] tracking-wide',
                    isAdmin
                      ? c.unread ? 'font-bold text-white' : 'font-medium text-white/50'
                      : c.unread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
                  )}
                >
                  {name}
                </div>
                <div
                  className={cn(
                    'shrink-0 text-[9px] font-mono tabular-nums tracking-[0.1em]',
                    isAdmin
                      ? c.unread ? 'text-white' : 'text-white/20'
                      : c.unread ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  {compactTime(c.last_message_at).toUpperCase()}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    'text-[12px] flex-1 line-clamp-1 break-words leading-relaxed',
                    isAdmin
                      ? c.unread ? 'text-white/70' : 'text-white/25'
                      : c.unread ? 'text-foreground/90' : 'text-muted-foreground',
                  )}
                >
                  {c.last_message?.body || c.subject || 'NEW CONVERSATION'}
                </div>
                {isAdmin && c.hasAttachments && (
                  <Paperclip
                    className="w-3 h-3 text-white/20 shrink-0"
                    aria-label="Has attachments"
                  />
                )}
                {c.unread && (
                  <div
                    className={cn(
                      "w-1.5 h-1.5 shrink-0",
                      isAdmin ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "bg-primary rounded-full"
                    )}
                    aria-label="Unread"
                  />
                )}
              </div>
              
              {reply && (
                <div className="mt-2.5 inline-flex items-center px-1.5 py-0.5 text-[8px] uppercase tracking-[0.25em] font-black bg-white text-black">
                  REPLY REQUIRED
                </div>
              )}
              {!isAdmin && (
                <div className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  1:1 coaching
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function ThreadListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 animate-pulse">
          <div className="h-4 w-1/2 bg-muted rounded mb-2" />
          <div className="h-3 w-3/4 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}
