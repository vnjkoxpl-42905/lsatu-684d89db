import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { Paperclip } from 'lucide-react';
import type { Conversation } from '@/hooks/useInbox';
import { initialsFromName, needsReply, otherParticipantName } from './inboxDisplay';

type Variant = 'admin' | 'student';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  variant?: Variant;
  emptyLabel?: string;
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
    <div role="list" className="flex flex-col gap-1 p-2">
      {conversations.map((c) => {
        const isActive = activeId === c.id;
        const name = otherParticipantName(c, user.id, c.subject || 'Conversation');
        const initial = initialsFromName(name);
        const replyRequired = needsReply(c, user.id);

        return (
          <button
            key={c.id}
            role="listitem"
            onClick={() => onSelect(c.id)}
            className={cn(
              'group w-full flex items-start gap-3 text-left transition-all relative',
              'px-4 py-4 rounded-xl border',
              isActive
                ? 'border-transparent bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-black/5'
                : 'border-transparent hover:bg-white/40 hover:border-border/20'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 flex items-center justify-center text-[10px] font-bold shrink-0 rounded-full transition-all tracking-tight',
                isActive 
                  ? 'bg-slate-900 text-white shadow-sm scale-105' 
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 group-hover:ring-slate-300 shadow-sm',
              )}
              aria-hidden="true"
            >
              {initial}
            </div>

            
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div
                  className={cn(
                    'truncate text-[13px] tracking-tight',
                    c.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700',
                  )}
                >
                  {name}
                </div>
                <div
                  className={cn(
                    'shrink-0 text-[10px] font-medium tracking-wide uppercase',
                    c.unread ? 'text-primary' : 'text-slate-400',
                  )}
                >
                  {compactTime(c.last_message_at)}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    'text-[12px] flex-1 line-clamp-1 break-words leading-relaxed',
                    c.unread ? 'text-slate-900 font-medium' : 'text-slate-500',
                  )}
                >
                  {c.last_message?.body || c.subject || 'NEW CONVERSATION'}
                </div>
                {c.hasAttachments && (
                  <Paperclip
                    className="w-3 h-3 text-slate-400 shrink-0"
                    aria-label="Has attachments"
                  />
                )}
                {c.unread && (
                  <div
                    className="w-1.5 h-1.5 shrink-0 bg-primary rounded-full shadow-[0_0_0_2px_rgba(var(--primary),0.1)]"
                    aria-label="Unread"
                  />
                )}
              </div>
              
              {replyRequired && (
                <div className="mt-2.5 inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-[0.05em] font-bold bg-red-50 text-red-600 rounded-md ring-1 ring-red-100">
                  Reply Required
                </div>
              )}
              {!isAdmin && (
                <div className="mt-2.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
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
