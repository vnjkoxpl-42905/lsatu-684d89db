import { ExternalLink, ArrowUpRight, Copy, Check, X, Send, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHubStudents, type HubStudentRow } from '@/hooks/useHubStudents';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface LinkResult {
  id: string;
  kind: string;
  source_id: string;
  title: string;
  subtitle?: string | null;
  url?: string | null;
  snippet?: string | null;
  score?: number | null;
}

const KIND_LABELS: Record<string, string> = {
  guided_drill: 'Guided drill',
  drill_question: 'Drill question',
  activity: 'Activity',
  bootcamp_day: 'Bootcamp day',
  bootcamp_lesson: 'Bootcamp lesson',
  concept: 'Concept',
  question_type_strategy: 'Strategy',
  tactical_pattern: 'Pattern',
  student: 'Student',
  teaching_asset: 'Asset',
  route: 'Page',
};

function isInternal(url: string): boolean {
  if (url.startsWith('/')) return true;
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

function toInternalPath(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

function absoluteUrl(url: string): string {
  return isInternal(url)
    ? `${window.location.origin}${toInternalPath(url)}`
    : url;
}

export function LinkCard({ result }: { result: LinkResult }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<HubStudentRow | null>(null);

  const url = result.url;
  const kindLabel = KIND_LABELS[result.kind] ?? result.kind;

  if (dismissed) return null;

  const openInApp = () => {
    if (!url) return;
    if (isInternal(url)) navigate(toInternalPath(url));
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openNewTab = () => {
    if (!url) return;
    window.open(absoluteUrl(url), '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(absoluteUrl(url));
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="w-full max-w-[88%] rounded-md border border-black/10 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-[#c8841f]">{kindLabel}</div>
          <div className="truncate text-sm font-semibold text-black/85">{result.title}</div>
          {result.subtitle ? (
            <div className="truncate text-xs text-black/55">{result.subtitle}</div>
          ) : null}
          {result.snippet ? (
            <div className="mt-1 line-clamp-2 text-[11px] text-black/45">{result.snippet}</div>
          ) : null}
          {!url ? (
            <div className="mt-1 text-[11px] italic text-black/40">No direct link available.</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="rounded-full p-1 text-black/35 hover:bg-black/[0.05] hover:text-black/70"
          title="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {url ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={openInApp}
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1',
              'text-[11px] font-medium text-white hover:bg-black/85',
            )}
            title="Confirm — open here"
          >
            <Check className="h-3 w-3" />
            Confirm & open
          </button>
          <button
            type="button"
            onClick={openNewTab}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:bg-black/[0.04]"
          >
            <ExternalLink className="h-3 w-3" />
            New tab
          </button>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="inline-flex items-center gap-1 rounded-full border border-[#c8841f]/40 bg-[#c8841f]/10 px-2.5 py-1 text-[11px] font-medium text-[#8a5a10] hover:bg-[#c8841f]/15"
          >
            <Send className="h-3 w-3" />
            Send to student
          </button>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:bg-black/[0.04]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            Copy
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/50 hover:bg-black/[0.04]"
          >
            Deny
          </button>
        </div>
      ) : (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/50 hover:bg-black/[0.04]"
          >
            Dismiss
          </button>
        </div>
      )}

      <StudentPickerDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onPick={(student) => {
          setAssignOpen(false);
          setConfirmOpen(student);
        }}
      />

      {url && confirmOpen ? (
        <ConfirmSendDialog
          student={confirmOpen}
          link={{ title: result.title, url: absoluteUrl(url) }}
          onClose={() => setConfirmOpen(null)}
        />
      ) : null}
    </div>
  );
}

function StudentPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (student: HubStudentRow) => void;
}) {
  const { rows, loading } = useHubStudents();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows.slice(0, 30);
    return rows
      .filter(
        (r) =>
          (r.display_name ?? '').toLowerCase().includes(needle) ||
          (r.email ?? '').toLowerCase().includes(needle),
      )
      .slice(0, 30);
  }, [rows, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send to student</DialogTitle>
          <DialogDescription>Pick a student. You'll confirm before anything is sent.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/40" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students..."
            className="pl-8"
          />
        </div>
        <div className="max-h-72 overflow-y-auto -mx-1">
          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-black/50">Loading students…</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-black/50">No students match.</div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.class_id}
                type="button"
                onClick={() => onPick(s)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left hover:bg-black/[0.04]"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-black/85">
                    {s.display_name ?? '(unnamed)'}
                  </div>
                  {s.email ? (
                    <div className="truncate text-[11px] text-black/45">{s.email}</div>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmSendDialog({
  student,
  link,
  onClose,
}: {
  student: HubStudentRow;
  link: { title: string; url: string };
  onClose: () => void;
}) {
  const defaultBody = `Hi ${student.display_name ?? 'there'} — here's something to look at:\n\n${link.title}\n${link.url}`;
  const [body, setBody] = useState(defaultBody);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('teacher-operator-chat', {
        body: {
          action: 'send_student_message',
          student_id: student.class_id,
          body,
        },
      });
      if (error || (data as { ok?: boolean })?.ok === false) {
        throw new Error(error?.message ?? (data as { error?: string })?.error ?? 'Send failed');
      }
      toast.success(`Sent to ${student.display_name ?? 'student'}`);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm — send to {student.display_name ?? 'student'}?</DialogTitle>
          <DialogDescription>
            This drops a message in your 1:1 thread with this student.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className="w-full resize-none rounded-md border border-black/15 bg-white px-3 py-2 text-sm text-black/85 focus:outline-none focus:ring-2 focus:ring-[#c8841f]/40"
        />
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/[0.04] disabled:opacity-50"
          >
            <X className="h-3 w-3" /> Deny
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !body.trim()}
            className="inline-flex items-center gap-1 rounded-full bg-[#c8841f] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#b07418] disabled:opacity-50"
          >
            <Check className="h-3 w-3" /> {sending ? 'Sending…' : 'Confirm & send'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function linksFromToolResults(
  toolResults?: Array<{ name: string; result: { ok: boolean; data?: unknown } }>,
): LinkResult[] {
  if (!toolResults?.length) return [];
  const out: LinkResult[] = [];
  for (const tr of toolResults) {
    if (tr.name !== 'find_link' || !tr.result?.ok) continue;
    const data = tr.result.data as { results?: LinkResult[] } | undefined;
    if (Array.isArray(data?.results)) out.push(...data.results);
  }
  return out;
}
