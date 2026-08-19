import { useState } from 'react';
import { Check, Loader2, PanelRightOpen, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { assignResourceToStudent, type AssignableResource } from '@/lib/teacherAssignResource';
import { summarizeNotifyResult } from '@/lib/classroomNotify';
import type { DeskResourcePreview } from './DeskResourcePreviewPanel';
import { dismissTeacherTodo } from './teacherTodoDismissals';

export interface AssignmentOfferData {
  id?: string;
  student_id: string;
  student_name?: string | null;
  resource: AssignableResource;
}

const KIND_LABELS: Record<string, string> = {
  activity: 'Activity',
  guided_drill: 'Guided drill',
  drill_question: 'Drill question',
  bootcamp_module: 'Bootcamp',
  route: 'Page',
  link: 'Link',
};

function toPreviewUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.href;
  } catch {
    return url.startsWith('/') ? url : null;
  }
}

export function AssignmentOfferCard({
  offer,
  onOpenBesideChat,
}: {
  offer: AssignmentOfferData;
  onOpenBesideChat?: (resource: DeskResourcePreview) => void;
}) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  if (dismissed) return null;

  const studentName = offer.student_name || 'the student';
  const title = offer.resource.title;
  const previewUrl = toPreviewUrl(offer.resource.url);
  const kindLabel = KIND_LABELS[(offer.resource.kind ?? '').toLowerCase()] ?? offer.resource.kind ?? 'Resource';

  const confirm = async () => {
    if (!user) {
      toast.error('Not signed in');
      return;
    }
    setSending(true);
    try {
      const result = await assignResourceToStudent({
        adminUserId: user.id,
        studentId: offer.student_id,
        resource: offer.resource,
      });
      const summary = summarizeNotifyResult(result.notify);
      setReceipt(`${result.reusedExisting ? 'Already assigned' : 'Assigned'} · ${summary}`);
      // The "assign next work" suggestion for this student is answered now, so
      // it must not resurface on the next queue refresh.
      void dismissTeacherTodo({
        adminUserId: user.id,
        sourceKind: 'desk-task',
        sourceId: `assign-${offer.student_id}`,
      }).catch(() => {/* dismissal is best-effort; the assignment already landed */});
      toast.success(`${result.reusedExisting ? 'Already assigned' : 'Assigned'} to ${studentName}`, {
        description: result.route,
      });
    } catch (e) {
      toast.error('Assignment failed', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-[88%] rounded-md border border-[#c8841f]/30 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-[#c8841f]">Assignment</div>
          <div className="text-sm font-semibold text-black/85">Send {title}</div>
          <div className="mt-0.5 text-xs text-black/55">to {studentName}</div>
          {offer.resource.subtitle ? (
            <div className="mt-1 line-clamp-2 text-[11px] text-black/45">{offer.resource.subtitle}</div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Deny assignment"
          className="rounded-full p-1 text-black/35 hover:bg-black/[0.05] hover:text-black/70"
          title="Deny"
          disabled={sending}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {receipt ? (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          <Check className="h-3 w-3" /> {receipt}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {previewUrl && onOpenBesideChat ? (
            <button
              type="button"
              onClick={() => onOpenBesideChat({ title, kindLabel, url: previewUrl })}
              disabled={sending}
              className="inline-flex items-center gap-1 rounded-full border border-black/15 bg-white px-2.5 py-1 text-[11px] text-black/70 hover:bg-black/[0.04] disabled:opacity-50"
            >
              <PanelRightOpen className="h-3 w-3" /> Open beside chat
            </button>
          ) : null}
          <button
            type="button"
            onClick={confirm}
            disabled={sending}
            className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[11px] font-medium text-white hover:bg-black/85 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Confirm & assign
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            disabled={sending}
            className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-black/50 hover:bg-black/[0.04] disabled:opacity-50"
          >
            <X className="h-3 w-3" /> Deny
          </button>
        </div>
      )}
    </div>
  );
}
