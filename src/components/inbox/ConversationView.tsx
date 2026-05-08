import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
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
    : 'Messages and PDF attachments';

  const nameById = new Map(
    conversation.participants.map((p) => [p.user_id, formatParticipantName(p.display_name, p.is_admin)]),
  );

  return (
    <div className="flex flex-col h-full">
      {!hideHeader && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur shrink-0">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-2" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
              !is_admin
                ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30'
                : 'bg-muted text-foreground/70',
            )}
            aria-hidden="true"
          >
            {headerInitial}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-base truncate leading-tight">{headerName}</div>
            <div className="text-[11px] text-muted-foreground truncate mt-0.5">
              {headerSubtitle}
            </div>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 bg-background">
        {loading ? (
          <ConversationSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.key} className="space-y-1.5">
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-border/60" />
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {section.label}
                  </div>
                  <div className="flex-1 h-px bg-border/60" />
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

      <MessageComposer conversationId={conversation.id} onSent={() => { refresh(); onMessageSent?.(); }} />
    </div>
  );
}
