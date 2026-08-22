import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import { CheckCheck, Paperclip, TimerReset } from 'lucide-react';
import type { Conversation } from '@/hooks/useInbox';
import { initialsFromName, needsReply, otherParticipantName } from './inboxDisplay';
import { isParticipantOnline } from './inboxPresence';
import { SwipeableDeleteRow } from './SwipeableDeleteRow';

type Variant = 'admin' | 'student';

type Surface = 'dark' | 'light';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  variant?: Variant;
  surface?: Surface;
  emptyLabel?: string;
  /** Admin-only: when provided, each thread gets a trashcan + swipe-to-delete. */
  onDelete?: (id: string) => void;
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
  surface = 'dark',
  emptyLabel,
  onDelete,
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
  const isLight = isAdmin && surface === 'light';

  return (
    <div role="list" className={cn('flex flex-col', isAdmin ? 'gap-2 p-3' : 'gap-1 p-2')}>
      {conversations.map((c) => {
        const isActive = activeId === c.id;
        const name = otherParticipantName(c, user.id, c.subject || 'Conversation');
        const initial = initialsFromName(name);
        const replyRequired = needsReply(c, user.id);
        const otherParticipant = c.participants.find((participant) => participant.user_id !== user.id);
        const isOnline = isParticipantOnline(otherParticipant?.last_seen_at);
        const canDelete = isAdmin && !!onDelete;

        const item = (
          <button
            role="listitem"
            onClick={() => onSelect(c.id)}
            className={cn(
              'group w-full flex items-start gap-3 text-left transition-all relative border',
              isAdmin ? 'rounded-2xl px-3.5 py-3.5' : 'rounded-xl px-4 py-4',
              isLight
                ? isActive
                  ? 'border-border bg-muted/60 text-foreground ring-1 ring-border'
                  : 'border-transparent bg-white text-foreground hover:bg-muted/40'
                : isAdmin
                ? isActive
                  ? 'border-[#e6d6bb] bg-[#f8f2e4] text-[#151a24] shadow-[0_18px_38px_rgba(0,0,0,0.24)]'
                  : 'border-white/10 bg-white/[0.06] text-[#edf2f7] hover:border-white/15 hover:bg-white/[0.09]'
                : isActive
                  ? 'border-transparent bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] ring-1 ring-black/5'
                  : 'border-transparent hover:bg-white/40 hover:border-border/20'
            )}
          >
            <div
              className={cn(
                'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[10px] font-black tracking-tight transition-all',
                isLight
                  ? isActive
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-muted text-foreground ring-1 ring-border'
                  : isAdmin
                  ? isActive
                    ? 'bg-[#151a24] text-[#f6e9c8] shadow-sm'
                    : 'bg-[#f4d995] text-[#1a1f2b] shadow-sm'
                  : isActive
                    ? 'bg-slate-900 text-white shadow-sm scale-105'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 group-hover:ring-slate-300 shadow-sm',
              )}
              aria-hidden="true"
            >
              {initial}
              {isOnline && (
                <span className={cn('absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2', isAdmin && !isActive ? 'ring-[#141a24]' : 'ring-white')} />
              )}
            </div>

            
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <div
                    className={cn(
                      'truncate text-[13px] tracking-tight',
                      isLight
                        ? c.unread
                          ? 'font-black text-foreground'
                          : 'font-bold text-foreground/90'
                        : isAdmin
                        ? isActive
                          ? 'font-black text-[#151a24]'
                          : c.unread
                            ? 'font-black text-white'
                            : 'font-bold text-[#e4eaf3]'
                        : c.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700',
                    )}
                  >
                    {name}
                  </div>
                  {isOnline && !isAdmin && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    'shrink-0 text-[10px] font-medium tracking-wide uppercase',
                    isLight
                      ? c.unread ? 'text-primary' : 'text-muted-foreground'
                      : isAdmin
                      ? isActive
                        ? 'text-[#8b5b42]'
                        : c.unread
                          ? 'text-[#f4d995]'
                          : 'text-[#aab4c3]'
                      : c.unread ? 'text-primary' : 'text-slate-400',
                  )}
                >
                  {compactTime(c.last_message_at)}
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={cn(
                    'text-[12px] flex-1 line-clamp-1 break-words leading-relaxed',
                    isLight
                      ? c.unread ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      : isAdmin
                      ? isActive
                        ? 'font-semibold text-[#4d4539]'
                        : c.unread
                          ? 'font-semibold text-[#f8eed8]'
                          : 'text-[#aab4c3]'
                      : c.unread ? 'text-slate-900 font-medium' : 'text-slate-500',
                  )}
                >
                  {c.last_message?.body || c.subject || 'NEW CONVERSATION'}
                </div>
                {c.hasAttachments && (
                  <Paperclip
                    className={cn('w-3 h-3 shrink-0', isAdmin && !isActive ? 'text-[#f4d995]' : 'text-slate-400')}
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
              
              {isAdmin ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {replyRequired ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#a14f43]/15 px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-[#a14f43]">
                      <TimerReset className="h-3 w-3" />
                      Reply
                    </span>
                  ) : (
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em]', isLight ? 'bg-muted text-muted-foreground' : isActive ? 'bg-[#e8dcc7] text-[#5f513f]' : 'bg-white/10 text-[#c9d0dc]')}>
                      <CheckCheck className="h-3 w-3" />
                      Read
                    </span>
                  )}
                  {c.hasAttachments && (
                    <span className={cn('inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em]', isLight ? 'bg-muted text-muted-foreground' : isActive ? 'bg-[#e8dcc7] text-[#5f513f]' : 'bg-white/10 text-[#c9d0dc]')}>
                      File
                    </span>
                  )}
                </div>
              ) : replyRequired ? (
                <div className="mt-2.5 inline-flex items-center px-2 py-0.5 text-[9px] uppercase tracking-[0.05em] font-bold bg-red-50 text-red-600 rounded-md ring-1 ring-red-100">
                  Reply Required
                </div>
              ) : null}
            </div>
          </button>
        );

        if (!canDelete) {
          return <div key={c.id}>{item}</div>;
        }

        return (
          <SwipeableDeleteRow
            key={c.id}
            label={`conversation with ${name}`}
            rounded={isAdmin ? 'rounded-2xl' : 'rounded-xl'}
            onDelete={() => onDelete?.(c.id)}
          >
            {item}
          </SwipeableDeleteRow>
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
