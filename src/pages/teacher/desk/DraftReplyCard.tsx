import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy, Loader2, Maximize2, Pencil, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useGmailSend } from '@/features/admin-inbox/gmail/hooks/useGmailSend';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DraftEditor } from './DraftEditor';

/** The draft payload echoed by the `create_draft` tool (see teacher-operator-chat). */
export interface DraftReplyData {
  id?: string;
  draft_type?: string;
  student_id?: string;
  draft_markdown?: string;
  prompt?: string;
  variant_label?: string;
  channel?: 'student_message' | 'email';
  to?: string;
  subject?: string;
}

const DRAFT_TYPE_LABELS: Record<string, string> = {
  message: 'Draft reply',
  session_recap: 'Session recap',
  next_assignment: 'Next assignment',
  next_session_plan: 'Next session plan',
  classroom_update_bundle: 'Classroom update',
};

function headerLabel(draft: DraftReplyData): string {
  if (draft.variant_label?.trim()) return draft.variant_label.trim();
  if (draft.channel === 'email') return 'Draft email';
  return DRAFT_TYPE_LABELS[draft.draft_type ?? ''] ?? 'Draft';
}

function timeStamp(): string {
  return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * The Teacher Desk "Draft Bubble" (./CONTEXT.md → "Draft Bubble"): a draft the
 * assistant produced rendered as a distinct full-width document card, not a chat
 * speech bubble. Carries Edit / Copy / Expand / Send. Send is confirm-gated and
 * never automatic — student messages use a two-tap inline confirm, email drafts
 * open a confirm dialog with editable recipient/subject. On commit the card locks
 * to a receipt.
 */
export function DraftReplyCard({
  draft,
  localPreview,
}: {
  draft: DraftReplyData;
  localPreview: boolean;
}) {
  const isEmail = draft.channel === 'email';
  const [body, setBody] = useState(draft.draft_markdown ?? '');
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);

  // Send lifecycle
  const [confirming, setConfirming] = useState(false); // student two-tap
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [emailTo, setEmailTo] = useState(draft.to ?? '');
  const [emailSubject, setEmailSubject] = useState(draft.subject ?? '');
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gmailSend = useGmailSend();

  // Resolve the student's display name for the confirm/receipt copy.
  useEffect(() => {
    if (isEmail || !draft.student_id) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('class_id', draft.student_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.display_name) setStudentName(data.display_name);
      });
    return () => {
      cancelled = true;
    };
  }, [draft.student_id, isEmail]);

  useEffect(
    () => () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  const recipientName = studentName ?? 'the student';
  const locked = receipt !== null;

  const copy = () => {
    if (!body.trim()) return;
    void navigator.clipboard?.writeText(body).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
      toast.success('Draft copied');
    });
  };

  const armConfirm = () => {
    setConfirming(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
  };

  const sendStudent = async () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirming(false);
    if (!draft.student_id) {
      toast.error('This draft has no student attached.');
      return;
    }
    if (localPreview) {
      toast.error('Sending connects on the live teacher desk.');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('teacher-operator-chat', {
        body: { action: 'send_student_message', student_id: draft.student_id, body },
      });
      if (error) throw error;
      if (data?.error || data?.ok === false) throw new Error(data?.error ?? 'Send failed');
      setReceipt(`Sent to ${recipientName} · ${timeStamp()}`);
      setEditing(false);
      toast.success(`Sent to ${recipientName}`);
    } catch (e) {
      toast.error('Send failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  };

  const sendEmail = async () => {
    if (localPreview) {
      toast.error('Sending connects on the live teacher desk.');
      return;
    }
    if (!emailTo.trim()) {
      toast.error('Add a recipient first.');
      return;
    }
    setSending(true);
    try {
      await gmailSend.mutateAsync({ to: emailTo.trim(), subject: emailSubject.trim(), text: body });
      setReceipt(`Sent via Gmail · ${timeStamp()}`);
      setEditing(false);
      setEmailOpen(false);
    } catch {
      // useGmailSend already surfaces a toast.error on failure.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] text-white shadow-[0_18px_44px_rgba(0,0,0,0.22)]">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#e0a64a]" strokeWidth={1.6} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            {headerLabel(draft)}
          </span>
        </div>
        {locked ? (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            {receipt}
          </span>
        ) : (
          <div className="flex items-center gap-1">
            <CardAction label={editing ? 'Done' : 'Edit'} onClick={() => setEditing((v) => !v)} active={editing}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.6} />
            </CardAction>
            <CardAction label={copied ? 'Copied' : 'Copy'} onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />}
            </CardAction>
            <CardAction label="Expand" onClick={() => setExpanded(true)}>
              <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.6} />
            </CardAction>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3.5">
        {editing && !locked ? (
          <DraftEditor value={body} onChange={setBody} canUseAi={!localPreview} ariaLabel="Edit draft" />
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 text-[13px] leading-relaxed text-white/88">
            <ReactMarkdown>{body || '_Empty draft._'}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Send footer */}
      {!locked ? (
        <div className="flex items-center justify-end gap-2 border-t border-white/8 px-4 py-2.5">
          {confirming ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (confirmTimer.current) clearTimeout(confirmTimer.current);
                  setConfirming(false);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/12 px-3 text-xs text-white/70 transition hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.6} /> Cancel
              </button>
              <button
                type="button"
                onClick={sendStudent}
                disabled={sending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
              >
                {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={1.8} />}
                Send to {recipientName}?
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={isEmail ? () => setEmailOpen(true) : armConfirm}
              disabled={sending}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={1.8} />}
              {isEmail ? 'Send via Gmail' : 'Send'}
            </button>
          )}
        </div>
      ) : null}

      {/* Expand / full view */}
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-2xl border-white/10 bg-[#171717] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Sparkles className="h-4 w-4 text-[#e0a64a]" strokeWidth={1.6} />
              {headerLabel(draft)}
            </DialogTitle>
          </DialogHeader>
          {locked ? (
            <div className="prose prose-sm prose-invert max-w-none text-white/88">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          ) : (
            <DraftEditor value={body} onChange={setBody} canUseAi={!localPreview} ariaLabel="Edit draft (expanded)" />
          )}
        </DialogContent>
      </Dialog>

      {/* Email confirm-send dialog */}
      <AlertDialog open={emailOpen} onOpenChange={(open) => !sending && setEmailOpen(open)}>
        <AlertDialogContent className="max-w-[480px] gap-5 border-white/10 bg-[#171717] p-6 text-white shadow-2xl">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-xl font-semibold tracking-tight text-white">Send this email?</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-6 text-white/72">
              Review the recipient and subject before this sends via Gmail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <label className="block text-left">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">To</span>
              <input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="name@example.com"
                className="h-9 w-full rounded-md border border-white/12 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
              />
            </label>
            <label className="block text-left">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">Subject</span>
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject"
                className="h-9 w-full rounded-md border border-white/12 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/35"
              />
            </label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-white/8 bg-white/[0.03] px-3 py-2 text-[13px] leading-relaxed text-white/70">
              {body || 'Empty draft.'}
            </div>
          </div>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <button
              type="button"
              onClick={() => setEmailOpen(false)}
              disabled={sending}
              className="mt-0 inline-flex h-9 items-center justify-center rounded-md border border-white/12 bg-transparent px-4 text-sm text-white/82 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={sendEmail}
              disabled={sending || !emailTo.trim()}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" strokeWidth={1.8} />}
              Send via Gmail
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CardAction({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition',
        active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white',
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
