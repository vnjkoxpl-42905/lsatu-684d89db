import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCheck, Clock3, FileText, Mail, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useConversationMessages, type Conversation, type MessageAttachment } from '@/hooks/useInbox';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
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
}: Props) {
  const { user } = useAuth();
  const { is_admin } = useUserPermissions();
  const { messages, loading, refresh } = useConversationMessages(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);

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
    <div className={cn('flex h-full flex-col', adminView ? 'bg-[#f7f3ea]' : 'bg-[#fffdf8]')}>
      {!hideHeader && (
        <div className={cn(
          'flex shrink-0 flex-col',
          adminView ? 'border-b border-[#ded1bd] bg-white/58' : 'border-b border-[#eadfcf] bg-[#fffaf2]/82',
        )}>
          <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
            {onBack && (
              <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden -ml-2 rounded-xl" aria-label="Back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[10px] font-black tracking-tight transition-all md:hidden',
                adminView
                  ? 'bg-[#151a24] text-[#f7edd7] ring-1 ring-[#151a24]/15'
                  : 'bg-[#203024] text-[#f8eed8] ring-1 ring-[#203024]/15',
              )}
              aria-hidden="true"
            >
              {headerInitial}
            </div>

            <div className="min-w-0 flex-1 md:hidden">
              <div className={cn(
                'truncate text-xl font-black leading-tight tracking-tight',
                adminView ? 'text-[#171b24]' : 'text-[#211b16]',
              )}>
                {headerName}
              </div>
              <div className={cn(
                'mt-1 truncate text-xs font-semibold',
                adminView ? 'text-[#756957]' : 'text-[#7a6b58]',
              )}>
                {adminView ? headerSubtitle : 'Send questions, context, and files in one thread'}
              </div>
            </div>
            
            {adminView && (
              <div className="hidden flex-1 items-center justify-between gap-4 md:flex">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8b5b42]">Student context attached</div>
                  <div className="mt-1 text-sm font-black text-[#171b24]">Due soon · Main conclusion drills · files and Gmail context available</div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 text-[10px] font-black uppercase tracking-[0.1em]">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5', participantOnline ? 'bg-[#dfeee1] text-[#376143]' : 'bg-[#efe4d3] text-[#756957]')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', participantOnline ? 'bg-emerald-500' : 'bg-[#a79a87]')} />
                    {participantOnline ? 'Online' : 'Away'}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#efe4d3] px-2.5 py-1.5 text-[#756957]">
                    <Mail className="h-3 w-3" />
                    Gmail ready
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#efe4d3] px-2.5 py-1.5 text-[#756957]">
                    <FileText className="h-3 w-3" />
                    Attach context
                  </span>
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
          compact ? 'px-4 py-5' : 'px-10 py-12',
          adminView
            ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(250,247,239,0.94)),#f7f3ea]'
            : 'bg-[radial-gradient(circle_at_20%_0%,rgba(184,129,78,0.08),transparent_30%),#fffdf8]',
        )}
      >
        {loading ? (
          <ConversationSkeleton />
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
            {adminView && (
              <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-full border border-[#ded1bd] bg-[#fffaf0]/82 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#8b5b42] shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Conversation is linked to the command context panel
              </div>
            )}
            {sections.map((section) => (
              <div key={section.key} className="space-y-6">
                <div className={cn('flex items-center gap-6', compact ? 'my-6' : 'my-10')}>
                  <div className={cn('h-px flex-1', adminView ? 'bg-[#ded1bd]' : 'bg-[#eadfcf]')} />
                  <div className={cn('text-[10px] font-black uppercase tracking-[0.2em]', adminView ? 'text-[#9a8160]' : 'text-[#9a8160]')}>
                    {section.label}
                  </div>
                  <div className={cn('h-px flex-1', adminView ? 'bg-[#ded1bd]' : 'bg-[#eadfcf]')} />
                </div>
                {section.clusters.map((cluster) => (
                  <MessageBubble
                    key={`${section.key}-${cluster.senderId}-${cluster.createdAt}`}
                    cluster={cluster}
                    onPreviewAttachment={setPreviewAttachment}
                  />
                ))}
              </div>
            ))}
            {adminView && (
              <div className="ml-auto max-w-lg rounded-2xl border border-[#ded1bd] bg-[#fffaf0] p-4 shadow-[0_16px_34px_rgba(86,61,32,0.10)]">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8b5b42]">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Admin delivery state
                </div>
                <div className="mt-2 grid gap-2 text-xs font-semibold text-[#5f513f] sm:grid-cols-3">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#efe4d3] px-2.5 py-2">
                    <Clock3 className="h-3.5 w-3.5" />
                    In-app delivered
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#efe4d3] px-2.5 py-2">
                    <CheckCheck className="h-3.5 w-3.5" />
                    Read state tracked
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#efe4d3] px-2.5 py-2">
                    <Mail className="h-3.5 w-3.5" />
                    Email optional
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={cn('shrink-0 border-t backdrop-blur-md', adminView ? 'border-[#ded1bd] bg-[#f7f3ea]/92' : 'border-[#eadfcf] bg-[#fffaf2]/90')}>
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
