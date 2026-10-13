import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ChevronDown, Clock3, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useConversationMessages, type Conversation, type Message, type MessageAttachment } from '@/hooks/useInbox';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { MessageBubble } from './MessageBubble';
import { MessageComposer, type ComposerSeed, type PendingHandlers } from './MessageComposer';
import { AdminIntelligencePanel } from './AdminIntelligencePanel';
import { formatParticipantName } from '@/lib/displayName';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { initialsFromName } from './inboxDisplay';
import { AttachmentPreviewSheet } from './AttachmentPreviewSheet';
import { buildDaySections } from './messageClusters';
import { isParticipantOnline } from './inboxPresence';
import './inbox-thread.css';

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

const JOSHUA_ROBOT_AVATAR_SRC = '/mainhub/joshua-robot-avatar.png';

/** Distance (px) from the bottom within which we treat the reader as "caught
 *  up" and keep auto-scrolling on new messages. */
const NEAR_BOTTOM_PX = 120;

interface PendingMessage {
  localId: string;
  body: string;
  createdAtMs: number;
  status: 'sending' | 'failed';
}

const STUDENT_PROMPTS = [
  'Can we go over a question from my homework?',
  'I keep missing the same question type. Can you help?',
  'Here is where I am in my studying this week.',
];

function ConversationSkeleton() {
  return (
    <div className="px-4 py-5 space-y-5">
      <div className="flex flex-col items-start gap-1.5">
        <div className="h-2 rounded bg-[var(--msg-line)] animate-pulse w-12 ml-1" />
        <div className="h-9 w-48 rounded-2xl rounded-bl-md bg-[var(--msg-line)] animate-pulse" />
        <div className="h-9 w-36 rounded-2xl bg-[var(--msg-line)] animate-pulse" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-9 w-56 rounded-2xl rounded-br-md bg-[var(--msg-line)]/70 animate-pulse" />
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <div className="h-9 w-64 rounded-2xl rounded-bl-md bg-[var(--msg-line)] animate-pulse" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-9 w-44 rounded-2xl rounded-br-md bg-[var(--msg-line)]/70 animate-pulse" />
        <div className="h-9 w-60 rounded-2xl bg-[var(--msg-line)]/70 animate-pulse" />
      </div>
    </div>
  );
}

function TypingIndicatorRow({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 pb-1">
      <div className="flex items-center gap-1 rounded-[16px] rounded-bl-[5px] border border-[var(--msg-line)] bg-[var(--msg-bubble-paper)] px-3.5 py-2.5 shadow-[var(--msg-shadow)]">
        <span className="msgs-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--msg-meta)]" />
        <span className="msgs-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--msg-meta)]" />
        <span className="msgs-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--msg-meta)]" />
      </div>
      <span className="text-[11px] font-semibold text-[var(--msg-meta)]">{name} is typing…</span>
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
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const [showScrollPill, setShowScrollPill] = useState(false);
  const [newWhileAway, setNewWhileAway] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [composerSeed, setComposerSeed] = useState<ComposerSeed | null>(null);

  const { otherTyping, broadcastTyping, broadcastStopped } = useTypingIndicator(
    conversation.id,
    user?.id ?? null,
  );

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

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    nearBottomRef.current = nearBottom;
    setShowScrollPill(!nearBottom);
    if (nearBottom) setNewWhileAway(0);
  }, []);

  const scrollToBottom = useCallback(
    (smooth: boolean) => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reducedMotion ? 'smooth' : 'auto' });
      setNewWhileAway(0);
    },
    [reducedMotion],
  );

  // Auto-scroll only while the reader is already caught up; when they've
  // scrolled up into history, count arrivals for the jump pill instead.
  useEffect(() => {
    const firstLoad = prevCountRef.current === 0;
    const grew = messages.length > prevCountRef.current;
    prevCountRef.current = messages.length;
    if (nearBottomRef.current || firstLoad) {
      scrollToBottom(!firstLoad);
    } else if (grew) {
      setNewWhileAway((n) => n + 1);
    }
  }, [messages.length, pending.length, otherTyping, scrollToBottom]);

  // Reconcile optimistic sends: once the real row shows up in the fetched
  // thread, drop the matching pending bubble.
  useEffect(() => {
    if (pending.length === 0 || !user) return;
    setPending((prev) =>
      prev.filter(
        (p) =>
          p.status === 'failed' ||
          !messages.some(
            (m) =>
              m.sender_id === user.id &&
              m.body === p.body &&
              new Date(m.created_at).getTime() >= p.createdAtMs - 60_000,
          ),
      ),
    );
  }, [messages, pending.length, user]);

  const pendingHandlers = useMemo<PendingHandlers>(
    () => ({
      onPendingStart: ({ localId, body }) => {
        setPending((prev) => [
          ...prev,
          { localId, body, createdAtMs: Date.now(), status: 'sending' },
        ]);
      },
      onPendingResolve: (localId, ok) => {
        if (ok) return; // success is reconciled against the fetched thread
        setPending((prev) =>
          prev.map((p) => (p.localId === localId ? { ...p, status: 'failed' } : p)),
        );
      },
    }),
    [],
  );

  const retryPending = useCallback(
    async (localId: string) => {
      const item = pending.find((p) => p.localId === localId);
      if (!item || !user) return;
      setPending((prev) =>
        prev.map((p) => (p.localId === localId ? { ...p, status: 'sending' } : p)),
      );
      const { error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversation.id, sender_id: user.id, body: item.body });
      if (error) {
        setPending((prev) =>
          prev.map((p) => (p.localId === localId ? { ...p, status: 'failed' } : p)),
        );
        toast.error('Still could not send. Check your connection and retry.');
        return;
      }
      refresh();
      onMessageSent?.();
    },
    [pending, user, conversation.id, refresh, onMessageSent],
  );

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
  const typingName = adminView ? (formattedNames[0] || 'Student') : 'Joshua';

  const headerInitial = useMemo(() => {
    if (!adminView) return 'J';
    return initialsFromName(headerName);
  }, [adminView, headerName]);

  if (!user) return null;

  const ownSideIsInstructor = is_admin;

  return (
    <div className={cn('msgs-scope flex h-full flex-col', stageLayout ? 'msgs-stage-paper' : 'bg-[var(--msg-page)]')}>
      {!hideHeader && (
        <div className="flex shrink-0 flex-col border-b border-[var(--msg-line)] bg-[var(--msg-panel)]">
          <div className={cn('flex items-center gap-4 px-4 py-3.5', stageLayout ? 'sm:px-6' : 'sm:px-6 lg:px-8')}>
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className={cn('-ml-2 rounded-xl text-[var(--msg-ink)] hover:bg-[var(--msg-hover)]', !stageLayout && 'md:hidden')}
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className={cn('relative shrink-0', !stageLayout && 'md:hidden')}>
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-[13px] font-black tracking-tight shadow-[var(--msg-shadow)]',
                  adminView
                    ? 'bg-[var(--msg-bubble-ink)] text-[var(--msg-bubble-ink-text)]'
                    : 'bg-[#070b11] ring-1 ring-black/10',
                )}
                aria-hidden="true"
              >
                {adminView ? (
                  headerInitial
                ) : (
                  <img
                    src={JOSHUA_ROBOT_AVATAR_SRC}
                    alt=""
                    draggable={false}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--msg-panel)]',
                  participantOnline ? 'bg-emerald-500 msgs-presence-online' : 'bg-[var(--msg-meta-soft)]',
                )}
                aria-hidden="true"
              />
            </div>

            <div className={cn('min-w-0 flex-1', !stageLayout && 'md:hidden')}>
              <div className={cn(
                'truncate font-black leading-tight tracking-tight text-[var(--msg-ink)]',
                stageLayout ? 'text-base' : 'text-xl',
              )}>
                {headerName}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--msg-meta)]">
                <span>{adminView ? headerSubtitle : 'Your coach'}</span>
                <span className="h-1 w-1 rounded-full bg-[var(--msg-meta-soft)]" aria-hidden="true" />
                <span className={cn(participantOnline && 'text-[var(--msg-online)]')}>
                  {participantOnline ? 'Online now' : 'Away'}
                </span>
              </div>
            </div>

            {adminView && (
              <div className={cn(
                'hidden min-w-0 items-center gap-4 md:flex',
                stageLayout ? 'shrink-0 justify-end' : 'flex-1 justify-between',
              )}>
                <div className={cn('min-w-0', stageLayout && 'hidden')}>
                  <div className="truncate text-base font-black leading-tight text-[var(--msg-ink)]">{headerName}</div>
                  <div className="mt-1 truncate text-xs font-semibold text-[var(--msg-meta)]">{headerSubtitle}</div>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5',
                    participantOnline
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400'
                      : 'border-[var(--msg-line)] bg-[var(--msg-page)] text-[var(--msg-meta)]',
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', participantOnline ? 'bg-emerald-500 msgs-presence-online' : 'bg-[var(--msg-meta-soft)]')} />
                    {participantOnline ? 'Online' : 'Away'}
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--msg-bubble-ink)] px-3 py-1.5 text-[var(--msg-bubble-ink-text)] transition hover:opacity-90"
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
              <div className="hidden md:flex items-center gap-2 text-[11px] font-semibold text-[var(--msg-meta)]">
                <span className={cn('h-2 w-2 rounded-full', participantOnline ? 'bg-emerald-500 msgs-presence-online' : 'bg-[var(--msg-meta-soft)]')} />
                <span className={cn(participantOnline && 'text-[var(--msg-online)]')}>
                  {participantOnline ? 'Joshua is online' : 'Joshua is away'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            'flex h-full flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-border',
            compact ? 'px-4 py-5' : stageLayout ? 'px-4 py-8 sm:px-8' : 'px-6 py-8 lg:px-10',
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
          ) : messages.length === 0 && pending.length === 0 ? (
            studentFacing || !adminView ? (
              <div className={cn('mx-auto my-auto w-full max-w-md text-center', compact ? 'py-10' : 'py-16')}>
                <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#070b11] shadow-[var(--msg-shadow-deep)] ring-1 ring-black/10">
                  <img
                    src={JOSHUA_ROBOT_AVATAR_SRC}
                    alt=""
                    draggable={false}
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="mt-5 text-lg font-black tracking-tight text-[var(--msg-ink)]">
                  Start the conversation with Joshua
                </div>
                <p className="mt-1.5 text-sm font-medium text-[var(--msg-meta)]">
                  Questions, homework, screenshots of your work — everything lives in this one thread.
                </p>
                <div className="mt-6 flex flex-col items-center gap-2">
                  {STUDENT_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setComposerSeed({ text: prompt, nonce: Date.now() })}
                      className="rounded-full border border-[var(--msg-line)] bg-[var(--msg-panel)] px-4 py-2 text-[13px] font-semibold text-[var(--msg-ink)] shadow-[var(--msg-shadow)] transition hover:border-[var(--msg-accent)] hover:text-[var(--msg-accent)]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={cn('my-auto text-center text-sm font-medium text-[var(--msg-meta-soft)]', compact ? 'py-16' : 'py-32')}>
                {emptyStateLabel}
              </div>
            )
          ) : (
            <div className={cn(
              'mx-auto mt-auto w-full',
              compact ? 'space-y-5 max-w-none' : 'space-y-8',
              !compact && (adminView ? 'max-w-4xl' : 'max-w-3xl'),
            )}>
              {sections.map((section) => (
                <div key={section.key} className="space-y-5">
                  <div className={cn('flex justify-center', compact ? 'my-5' : 'my-8')}>
                    <span className="rounded-full border border-[var(--msg-line)] bg-[var(--msg-panel)] px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--msg-meta)] shadow-[var(--msg-shadow)]">
                      {section.label}
                    </span>
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

              <AnimatePresence>
                {pending.map((p) => (
                  <motion.div
                    key={p.localId}
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className={cn('flex w-full', ownSideIsInstructor ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn('flex max-w-[520px] flex-col gap-1', ownSideIsInstructor ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'break-words whitespace-pre-wrap px-[18px] py-[13px] text-[15px] leading-[1.6]',
                          ownSideIsInstructor
                            ? 'rounded-[18px] rounded-br-[5px] bg-[var(--msg-bubble-ink)] text-[var(--msg-bubble-ink-text)]'
                            : 'rounded-[18px] rounded-bl-[5px] border border-[var(--msg-line)] bg-[var(--msg-bubble-paper)] text-[var(--msg-bubble-paper-text)]',
                          p.status === 'sending' && 'opacity-70',
                        )}
                      >
                        {p.body}
                      </div>
                      {p.status === 'sending' ? (
                        <span className="flex items-center gap-1 pr-1 text-[10px] font-semibold text-[var(--msg-meta)]">
                          <Clock3 className="h-3 w-3 animate-pulse" aria-hidden="true" />
                          Sending…
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void retryPending(p.localId)}
                          className="flex items-center gap-1 pr-1 text-[10px] font-bold text-red-600 transition hover:text-red-700"
                        >
                          <RotateCcw className="h-3 w-3" aria-hidden="true" />
                          Not sent — tap to retry
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {otherTyping ? <TypingIndicatorRow name={typingName} /> : null}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showScrollPill && (
            <motion.button
              type="button"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.16 }}
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--msg-accent)] px-3.5 py-2 text-[12px] font-bold text-white shadow-[var(--msg-shadow-deep)] transition hover:brightness-110"
              aria-label="Jump to latest messages"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              {newWhileAway > 0 ? `${newWhileAway} new` : 'Latest'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-[var(--msg-line)] bg-[var(--msg-panel)]/95 backdrop-blur-md">
        <MessageComposer
          conversationId={conversation.id}
          onSent={() => { refresh(); onMessageSent?.(); }}
          studentFacing={studentFacing}
          seed={composerSeed}
          pendingHandlers={pendingHandlers}
          onTyping={broadcastTyping}
          onTypingStop={broadcastStopped}
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
