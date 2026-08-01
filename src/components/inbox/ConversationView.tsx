import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMessages, type Conversation, type Message, type MessageAttachment } from '@/hooks/useInbox';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { AdminIntelligencePanel } from './AdminIntelligencePanel';
import { formatParticipantName } from '@/lib/displayName';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { initialsFromName } from './inboxDisplay';
import { AttachmentPreviewSheet } from './AttachmentPreviewSheet';
import { buildDaySections } from './messageClusters';
import { isParticipantOnline } from './inboxPresence';

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onMessageSent?: () => void;
  /** When true, suppress the internal header — for embedded use inside a
   *  containing surface (e.g. FloatingMessenger) that renders its own. */
  hideHeader?: boolean;
  compact?: boolean;
  emptyStateLabel?: string;
  studentFacing?: boolean;
  /**
   * 'panel' (default) is the two-pane behaviour: the back button and the
   * identity block only show on mobile, because a sibling thread list supplies
   * both on desktop. 'stage' is for the standalone /inbox surface, where the
   * conversation owns the whole center stage and there is no list beside it —
   * back and identity must be visible at every width.
   */
  layout?: 'panel' | 'stage';
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

export function ConversationView({
  conversation,
  onBack,
  onMessageSent,
  hideHeader = false,
  compact = false,
  emptyStateLabel = 'No communication logged',
  studentFacing = false,
  layout = 'panel',
}: Props) {
  const stageLayout = layout === 'stage';
  const { user } = useAuth();
  const { is_admin } = useUserPermissions();
  const { messages, loading, error: threadError, refresh, deleteMessage } = useConversationMessages(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);

  const canDeleteMessage = useCallback(
    (message: Message) => !!user && (message.sender_id === user.id || is_admin),
    [user, is_admin],
  );

  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      void deleteMessage(messageId)
        .then(() => {
          toast.success('Message deleted');
          onMessageSent?.();
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : 'Could not delete the message');
        });
    },
    [deleteMessage, onMessageSent],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const sections = useMemo(
    () => (user ? buildDaySections(messages, conversation.participants, user.id) : []),
    [messages, conversation.participants, user],
  );

  const others = user
    ? conversation.participants.filter((p) => p.user_id !== user.id)
    : [];
  const primaryOther = others[0] ?? null;
  const participantOnline = isParticipantOnline(primaryOther?.last_seen_at);
  const otherLastReadAt = primaryOther?.last_read_at ?? null;
  // Find the id of the caller's most-recently-sent message that the other
  // participant has already opened past — that's the one we mark "Seen".
  const lastSeenOwnMessageId = useMemo(() => {
    if (!user || !otherLastReadAt) return null;
    const readMs = new Date(otherLastReadAt).getTime();
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.sender_id !== user.id) continue;
      if (new Date(m.created_at).getTime() <= readMs) return m.id;
    }
    return null;
  }, [messages, otherLastReadAt, user]);
  const formattedNames = others
    .map((o) => formatParticipantName(o.display_name, o.is_admin))
    .filter((n) => n && n !== 'User');

  const adminView = is_admin && !studentFacing;

  const headerName = adminView
    ? formattedNames.join(', ') || conversation.subject || 'Conversation'
    : formattedNames.find((n) => n) || 'Joshua';
  const headerSubtitle = adminView
    ? conversation.subject || 'Student message thread'
    : 'Your coach';

  const headerInitial = useMemo(() => {
    if (!adminView) return 'J';
    return initialsFromName(headerName);
  }, [adminView, headerName]);

  if (!user) return null;

  return (
    <div className={cn('flex h-full flex-col', stageLayout ? 'bg-muted/30' : 'bg-[#fafafa]')}>
      {!hideHeader && (
        <div className={cn(
          'flex shrink-0 flex-col',
          stageLayout ? 'border-b border-border bg-background' : 'border-b border-zinc-200 bg-white',
        )}>
          <div className={cn('flex items-center gap-4 px-4 py-4', stageLayout ? 'sm:px-6' : 'sm:px-6 lg:px-8')}>
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className={cn('-ml-2 rounded-xl', !stageLayout && 'md:hidden')}
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[10px] font-black tracking-tight transition-all',
                !stageLayout && 'md:hidden',
                stageLayout
                  ? 'bg-foreground text-background'
                  : adminView
                  ? 'bg-[#151a24] text-[#f7edd7] ring-1 ring-[#151a24]/15'
                  : 'bg-[#203024] text-[#f8eed8] ring-1 ring-[#203024]/15',
              )}
              aria-hidden="true"
            >
              {headerInitial}
            </div>

            <div className={cn('min-w-0 flex-1', !stageLayout && 'md:hidden')}>
              <div className={cn(
                'truncate font-black leading-tight tracking-tight',
                stageLayout ? 'text-base text-foreground' : 'text-xl',
                !stageLayout && (adminView ? 'text-[#171b24]' : 'text-[#211b16]'),
              )}>
                {headerName}
              </div>
              <div className={cn(
                'mt-1 truncate text-xs font-semibold',
                stageLayout ? 'text-muted-foreground' : adminView ? 'text-[#756957]' : 'text-[#7a6b58]',
              )}>
                {adminView ? headerSubtitle : 'Send questions, context, and files in one thread'}
              </div>
            </div>

            {adminView && (
              <div className={cn(
                'hidden min-w-0 items-center gap-4 md:flex',
                stageLayout ? 'shrink-0 justify-end' : 'flex-1 justify-between',
              )}>
                <div className={cn('min-w-0', stageLayout && 'hidden')}>
                  <div className="truncate text-base font-black leading-tight text-[#171b24]">{headerName}</div>
                  <div className="mt-1 truncate text-xs font-semibold text-[#756957]">{headerSubtitle}</div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5',
                    stageLayout
                      ? 'bg-muted text-muted-foreground'
                      : participantOnline ? 'bg-[#dfeee1] text-[#376143]' : 'bg-[#efe4d3] text-[#756957]',
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', participantOnline ? 'bg-emerald-500' : stageLayout ? 'bg-muted-foreground/50' : 'bg-[#a79a87]')} />
                    {participantOnline ? 'Online' : 'Away'}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition',
                          stageLayout
                            ? 'bg-foreground text-background hover:bg-foreground/90'
                            : 'bg-[#151a24] text-[#f7edd7] hover:bg-[#222a38]',
                        )}
                      >
                        Context
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[360px] max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none">
                      <AdminIntelligencePanel
                        conversation={conversation}
                        ownId={user.id}
                        className="!flex max-h-[72vh] w-full overflow-hidden rounded-2xl border border-[#1f2633] shadow-[0_24px_70px_rgba(0,0,0,0.30)]"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
            {!adminView && (
              <div className="hidden md:flex items-center gap-2 text-[11px] font-medium text-slate-500">
                <span className={cn('h-2 w-2 rounded-full', participantOnline ? 'bg-emerald-500' : 'bg-slate-300')} />
                <span>{participantOnline ? 'Joshua is online' : 'Joshua is away'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        className={cn(
          'flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border min-h-0',
          compact ? 'px-4 py-5' : stageLayout ? 'px-4 py-8 sm:px-8' : 'px-10 py-12',
          stageLayout ? 'bg-muted/30' : 'bg-[#fafafa]',
        )}
      >
        {loading ? (
          <ConversationSkeleton />
        ) : threadError ? (
          <div className="mx-auto max-w-sm rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive">
            <div>{threadError}.</div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => refresh()}>
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className={cn(
            'text-center text-sm font-medium text-slate-300',
            compact ? 'py-16' : 'py-32',
          )}>
            {emptyStateLabel}
          </div>
        ) : (
          <div className={cn(
            'mx-auto',
            compact ? 'space-y-6 max-w-none' : 'space-y-10',
            !compact && (adminView ? 'max-w-4xl' : 'max-w-3xl'),
          )}>
            {sections.map((section) => (
              <div key={section.key} className="space-y-6">
                <div className={cn('flex items-center gap-6', compact ? 'my-6' : 'my-10')}>
                  <div className={cn('h-px flex-1', stageLayout ? 'bg-border' : 'bg-[#e4e4e7]')} />
                  <div className={cn(
                    'text-[10px] font-black uppercase tracking-[0.2em]',
                    stageLayout ? 'text-muted-foreground' : 'text-[#a1a1aa]',
                  )}>
                    {section.label}
                  </div>
                  <div className={cn('h-px flex-1', stageLayout ? 'bg-border' : 'bg-[#e4e4e7]')} />
                </div>
                {section.clusters.map((cluster) => (
                  <MessageBubble
                    key={`${section.key}-${cluster.senderId}-${cluster.createdAt}`}
                    cluster={cluster}
                    onPreviewAttachment={setPreviewAttachment}
                    canDeleteMessage={canDeleteMessage}
                    onDeleteMessage={handleDeleteMessage}
                    lastSeenOwnMessageId={lastSeenOwnMessageId}
                    otherLastReadAt={otherLastReadAt}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cn(
        'shrink-0 backdrop-blur-md',
        stageLayout ? 'border-t border-border bg-background/90' : 'border-t border-zinc-200 bg-white/92',
      )}>
        <MessageComposer
          conversationId={conversation.id}
          onSent={() => { refresh(); onMessageSent?.(); }}
          studentFacing={studentFacing}
        />
      </div>

      <AttachmentPreviewSheet
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      />
    </div>
  );
}
