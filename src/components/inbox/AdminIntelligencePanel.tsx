import type { ReactNode } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  Cloud,
  FileText,
  Mail,
  MessageSquareText,
  NotebookPen,
  Paperclip,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { Conversation } from '@/hooks/useInbox';
import { cn } from '@/lib/utils';
import { initialsFromName, needsReply, otherParticipantName } from './inboxDisplay';
import { isParticipantOnline } from './inboxPresence';

interface Props {
  conversation: Conversation | null;
  ownId: string | null;
  className?: string;
}

function relativeTime(iso?: string | null) {
  if (!iso) return 'No recent activity';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No recent activity';
  return `${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

function IntelligenceCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#d9cbb5]/80 bg-[#fffaf0]/90 p-4 shadow-[0_16px_40px_rgba(39,31,23,0.08)]">
      <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8b5b42]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </section>
  );
}

export function AdminIntelligencePanel({ conversation, ownId, className }: Props) {
  const studentName = conversation && ownId
    ? otherParticipantName(conversation, ownId, conversation.subject || 'Student')
    : 'No student selected';
  const initials = initialsFromName(studentName);
  const student = conversation?.participants.find((p) => p.user_id !== ownId);
  const online = isParticipantOnline(student?.last_seen_at);
  const replyRequired = !!(conversation && ownId && needsReply(conversation, ownId));
  const lastMessageDate = conversation?.last_message?.created_at
    ? new Date(conversation.last_message.created_at)
    : null;

  const deliveryRecommendation = replyRequired || conversation?.hasAttachments ? 'Both' : 'Message';
  const deliveryReason = replyRequired
    ? 'Reply is waiting and email gives a backup path.'
    : conversation?.hasAttachments
      ? 'Attachments are easier to preserve by email and in-app.'
      : 'Student is active enough for a lightweight in-app reply.';

  return (
    <aside
      className={cn(
        'hidden min-h-0 border-l border-[#1f2633] bg-[#101722] text-[#f7edd7] xl:flex xl:flex-col',
        className,
      )}
      aria-label="Student intelligence panel"
    >
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#101722]/95 p-5 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0d28e] text-sm font-black text-[#161b25] shadow-[0_12px_28px_rgba(0,0,0,0.22)]">
            {conversation ? initials : 'LS'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-black tracking-tight">{studentName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#b8c1d1]">
              <span className={cn('inline-flex items-center gap-1.5', online ? 'text-[#9ed6a8]' : 'text-[#b8c1d1]')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-[#9ed6a8]' : 'bg-[#697485]')} />
                {online ? 'Active now' : relativeTime(student?.last_seen_at)}
              </span>
              <span className="text-white/25">/</span>
              <span>{replyRequired ? 'Needs reply' : 'Stable thread'}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-[#f0d28e]/20 bg-[#19202c] p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#f0d28e]">Pinned Work State</div>
          <div className="mt-2 text-sm font-bold leading-snug text-[#fff6e5]">
            Intro to LR context ready
          </div>
          <div className="mt-1 text-xs leading-relaxed text-[#b8c1d1]">
            Current assignment and email aliases are scaffolded here until the backend exposes durable records.
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <IntelligenceCard title="Student Identity" icon={UserRound}>
          <div className="space-y-2 text-xs text-[#4f463a]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8c7b66]">Account</span>
              <span className="truncate font-bold text-[#211b16]">{studentName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#8c7b66]">Aliases</span>
              <span className="font-bold text-[#a14f43]">Not linked yet</span>
            </div>
            <div className="rounded-xl bg-[#efe4d3] px-3 py-2 text-[11px] font-semibold text-[#5f513f]">
              Alias matching needs a backend table before this becomes writable.
            </div>
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="Current Assignment" icon={CalendarClock}>
          <div className="rounded-xl border border-[#e2d1ba] bg-white/60 p-3">
            <div className="text-sm font-black text-[#211b16]">Main Conclusion practice</div>
            <div className="mt-1 text-xs leading-relaxed text-[#665a4b]">Active material context can be attached to the next coaching reply.</div>
            <div className="mt-3 inline-flex rounded-full bg-[#ead8c0] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#8b5b42]">
              Context card ready
            </div>
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="Recent Gmail" icon={Mail}>
          <div className="space-y-2">
            <div className="rounded-xl border border-[#e2d1ba] bg-white/60 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-[#211b16]">Gmail context</span>
                <span className="rounded-full bg-[#efe4d3] px-2 py-0.5 text-[10px] font-black uppercase text-[#8b5b42]">Admin only</span>
              </div>
              <p className="mt-1 leading-relaxed text-[#665a4b]">
                Use the Gmail tab for full history. Relevant threads can later hydrate this card.
              </p>
            </div>
            <button className="w-full rounded-xl border border-[#d8c6ad] bg-[#151b25] px-3 py-2 text-left text-xs font-black text-[#f7edd7] transition hover:bg-[#1d2634]">
              Open Gmail workspace
            </button>
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="Drive / Files" icon={Cloud}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-white/60 p-3">
              <Paperclip className="mb-2 h-4 w-4 text-[#8b5b42]" />
              <div className="font-black text-[#211b16]">{conversation?.hasAttachments ? 'Has files' : 'No files yet'}</div>
              <div className="mt-1 text-[#665a4b]">Thread uploads</div>
            </div>
            <div className="rounded-xl bg-white/60 p-3">
              <FileText className="mb-2 h-4 w-4 text-[#8b5b42]" />
              <div className="font-black text-[#211b16]">Drive</div>
              <div className="mt-1 text-[#665a4b]">Attach source</div>
            </div>
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="Smart Delivery" icon={Send}>
          <div className="space-y-3">
            <div className="rounded-xl bg-[#182131] p-3 text-[#f7edd7]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#f0d28e]">Recommended</span>
                <span className="rounded-full bg-[#a14f43] px-2.5 py-1 text-[10px] font-black">{deliveryRecommendation}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#c9d0dc]">{deliveryReason}</p>
            </div>
            <div className="text-[11px] font-semibold leading-relaxed text-[#665a4b]">
              Training shape: recommended mode, final mode, reason signals, override, outcome.
            </div>
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="Quick Actions" icon={CheckCircle2}>
          <div className="grid grid-cols-2 gap-2">
            {['Send assignment', 'Request screenshot', 'Follow-up', 'Link alias'].map((label) => (
              <button
                key={label}
                className="rounded-xl border border-[#e0ceb4] bg-white/60 px-2.5 py-2 text-left text-[11px] font-black text-[#3c3328] transition hover:border-[#a14f43]/50 hover:bg-white"
              >
                {label}
              </button>
            ))}
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="AI Reply Context" icon={Bot}>
          <div className="space-y-2 text-xs text-[#665a4b]">
            <div className="flex items-center gap-2 rounded-xl bg-white/60 p-3">
              <Sparkles className="h-4 w-4 text-[#a14f43]" />
              <span className="font-semibold">Generate draft from selected Messages, Gmail, and Drive context.</span>
            </div>
            <button className="w-full rounded-xl bg-[#a14f43] px-3 py-2 text-left font-black text-white transition hover:bg-[#8d453a]">
              Generate coaching draft
            </button>
          </div>
        </IntelligenceCard>

        <IntelligenceCard title="Notes / Tasks" icon={NotebookPen}>
          <div className="space-y-2 text-xs text-[#665a4b]">
            <div className="rounded-xl bg-white/60 p-3">
              <div className="font-black text-[#211b16]">Next admin note</div>
              <div className="mt-1 leading-relaxed">
                Last message {lastMessageDate ? format(lastMessageDate, 'MMM d, h:mm a') : 'is not available'}.
              </div>
            </div>
            <button className="w-full rounded-xl border border-dashed border-[#c9b79b] px-3 py-2 text-left font-black text-[#8b5b42]">
              Add private follow-up
            </button>
          </div>
        </IntelligenceCard>
      </div>
    </aside>
  );
}
