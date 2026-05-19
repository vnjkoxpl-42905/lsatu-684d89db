import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMessages, type Conversation, type Message } from '@/hooks/useInbox';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { formatParticipantName } from '@/lib/displayName';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onMessageSent?: () => void;
  /** When true, suppress the internal header — for embedded use inside a
   *  containing surface (e.g. FloatingMessenger) that renders its own. */
  hideHeader?: boolean;
}

function dayLabel(d: Date) {
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

interface DisplayMessage {
  msg: Message;
  showSenderName: boolean;
  isLastInGroup: boolean;
}

interface DaySection {
  key: string;
  label: string;
  items: DisplayMessage[];
}

function groupMessages(messages: Message[], ownId: string): DaySection[] {
  const sections: DaySection[] = [];
  let currentDay: Date | null = null;
  let currentSection: DaySection | null = null;

  messages.forEach((m, i) => {
    const created = new Date(m.created_at);
    if (!currentDay || !isSameDay(currentDay, created)) {
      currentDay = created;
      currentSection = {
        key: format(created, 'yyyy-MM-dd'),
        label: dayLabel(created),
        items: [],
      };
      sections.push(currentSection);
    }

    const prev = messages[i - 1];
    const next = messages[i + 1];
    const sameSenderAsPrev =
      !!prev && prev.sender_id === m.sender_id && isSameDay(new Date(prev.created_at), created);
    const sameSenderAsNext =
      !!next && next.sender_id === m.sender_id && isSameDay(new Date(next.created_at), created);

    const isOwn = m.sender_id === ownId;
    currentSection!.items.push({
      msg: m,
      showSenderName: !isOwn && !sameSenderAsPrev,
      isLastInGroup: !sameSenderAsNext,
    });
  });

  return sections;
}

function ConversationSkeleton() {
  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col items-start gap-1.5">
        <div className="h-2 rounded bg-muted/60 animate-pulse w-12 ml-1" />
        <div className="h-9 w-48 rounded-2xl rounded-bl-md bg-muted/60 animate-pulse" />
        <div className="h-9 w-36 rounded-2xl bg-muted/60 animate-pulse" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-9 w-56 rounded-2xl rounded-br-md bg-muted/40 animate-pulse" />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <div className="h-9 w-64 rounded-2xl rounded-bl-md bg-muted/60 animate-pulse" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-9 w-44 rounded-2xl rounded-br-md bg-muted/40 animate-pulse" />
        <div className="h-9 w-60 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    </div>
  );
}

export function ConversationView({ conversation, onBack, onMessageSent, hideHeader = false }: Props) {
  const { user } = useAuth();
  const { is_admin } = useUserPermissions();
  const { messages, loading, refresh } = useConversationMessages(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const sections = useMemo(
    () => (user ? groupMessages(messages, user.id) : []),
    [messages, user],
  );

  if (!user) return null;

  const others = conversation.participants.filter((p) => p.user_id !== user.id);
  const formattedNames = others
    .map((o) => formatParticipantName(o.display_name, o.is_admin))
    .filter((n) => n && n !== 'User');

  const headerName = is_admin
    ? formattedNames.join(', ') || conversation.subject || 'Conversation'
    : formattedNames.find((n) => n) || 'Joshua';
  const headerInitial = headerName.charAt(0).toUpperCase();
  const headerSubtitle = is_admin
    ? conversation.subject || 'Student message thread'
    : 'Your coach';

  const nameById = new Map(
    conversation.participants.map((p) => [p.user_id, formatParticipantName(p.display_name, p.is_admin)]),
  );

  return (
    <div className={cn("flex flex-col h-full", is_admin ? "bg-[#020408]" : "bg-background")}>
      {!hideHeader && (
        <div className={cn(
          "flex items-center gap-4 px-8 py-8 shrink-0",
          is_admin ? "border-b border-white/10 bg-black" : "border-b border-border bg-background/90 backdrop-blur"
        )}>
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-2" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div
            className={cn(
              'w-14 h-14 flex items-center justify-center text-sm font-black shrink-0',
              is_admin
                ? 'bg-white text-black rounded-none shadow-[6px_6px_0_rgba(255,255,255,0.05)] border border-white'
                : !is_admin
                  ? 'bg-primary/10 text-primary ring-1 ring-primary/25 rounded-full'
                  : 'bg-muted text-foreground/70 rounded-full',
            )}
            aria-hidden="true"
          >
            {is_admin ? headerInitial : <MessageCircle className="w-5 h-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn(
              "font-bold text-xl truncate leading-tight tracking-tight",
              is_admin ? "text-white uppercase tracking-[0.05em]" : "text-foreground"
            )}>
              {headerName}
            </div>
            <div className={cn(
              "text-[10px] truncate mt-1 font-mono uppercase tracking-[0.25em]",
              is_admin ? "text-white/30" : "text-muted-foreground"
            )}>
              {is_admin ? headerSubtitle : 'Send questions, context, and files in one thread'}
            </div>
          </div>
          
          {is_admin && (
            <div className="hidden lg:flex items-center gap-10 border-l border-white/10 pl-10 ml-10 font-mono text-[9px] uppercase tracking-[0.2em]">
              <div className="flex flex-col gap-1.5">
                <span className="text-white/10 font-bold">Status</span>
                <span className="text-emerald-500 font-bold">Active</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-white/10 font-bold">Current Point</span>
                <span className="text-white/60 font-bold">PT120 · S1</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto px-8 py-10 scrollbar-thin scrollbar-thumb-white/10',
          is_admin ? 'bg-[#020408]' : 'bg-muted/20',
        )}
      >
        {loading ? (
          <ConversationSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center text-[10px] uppercase tracking-[0.4em] font-black text-white/5 py-32">
            NO COMMUNICATION LOGGED
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-12">
            {sections.map((section) => (
              <div key={section.key} className="space-y-6">
                <div className="flex items-center gap-6 my-10">
                  <div className={cn("flex-1 h-px", is_admin ? "bg-white/5" : "bg-border/60")} />
                  <div className={cn(
                    "text-[9px] uppercase tracking-[0.4em] font-black",
                    is_admin ? "text-white/15" : "text-muted-foreground"
                  )}>
                    {section.label}
                  </div>
                  <div className={cn("flex-1 h-px", is_admin ? "bg-white/5" : "bg-border/60")} />
                </div>
                {section.items.map(({ msg, showSenderName, isLastInGroup }) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user.id}
                    senderName={showSenderName ? nameById.get(msg.sender_id) : null}
                    showTimestamp={isLastInGroup}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn(is_admin && "bg-black p-6 border-t border-white/10")}>
        <MessageComposer conversationId={conversation.id} onSent={() => { refresh(); onMessageSent?.(); }} />
      </div>
    </div>
  );
}
