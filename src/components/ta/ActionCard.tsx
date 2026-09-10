import { useState } from "react";
import DOMPurify from "dompurify";
import { Check, X, Loader2, Zap, BookOpen, GraduationCap, StickyNote, Dumbbell, ClipboardList, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionProposal, Disambiguation, Proposal } from "@/lib/agentActions";
import { isActionProposal } from "@/lib/agentActions";

interface Props {
  interactionId: string;
  proposal: Proposal;
  actionStatus: "pending" | "confirmed" | "cancelled" | "failed" | null;
  onConfirm: (interactionId: string, proposal: ActionProposal) => Promise<void>;
  onCancel: (interactionId: string) => Promise<void>;
  /** Pick a disambiguation candidate by sending a follow-up message. */
  onPick: (label: string) => void;
}

const KIND_ICON: Record<ActionProposal["kind"], typeof Zap> = {
  guided_drill: Dumbbell,
  homework: BookOpen,
  bootcamp_module: GraduationCap,
  note: StickyNote,
  activity: ClipboardList,
  message: MessageSquare,
};

const KIND_LABEL: Record<ActionProposal["kind"], string> = {
  guided_drill: "Guided drill",
  homework: "Homework",
  bootcamp_module: "Bootcamp module",
  note: "Note",
  activity: "Activity",
  message: "Message",
};

function statusBadge(status: Props["actionStatus"]) {
  const map = {
    confirmed: ["bg-emerald-500/15 text-emerald-300", "Done"],
    cancelled: ["bg-zinc-500/15 text-zinc-300", "Cancelled"],
    failed: ["bg-red-500/15 text-red-300", "Failed"],
    pending: ["bg-amber-500/15 text-amber-300", "Pending"],
  } as const;
  const [cls, label] = map[status ?? "pending"];
  return (
    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${cls}`}>
      {label}
    </span>
  );
}

function DisambiguationCard({
  data,
  onPick,
}: {
  data: Disambiguation;
  onPick: (label: string) => void;
}) {
  return (
    <div className="mt-2 border border-zinc-800 rounded-lg bg-zinc-900/60 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900 text-sm text-zinc-200">
        {data.summary}
      </div>
      {data.candidates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
          {data.candidates.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.label)}
              className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActionCard({
  interactionId,
  proposal,
  actionStatus,
  onConfirm,
  onCancel,
  onPick,
}: Props) {
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);

  if (!isActionProposal(proposal)) {
    return <DisambiguationCard data={proposal} onPick={onPick} />;
  }

  const disabled = actionStatus !== "pending" || busy !== null;
  const Icon = KIND_ICON[proposal.kind];
  const noteHtml =
    proposal.kind === "note" ? DOMPurify.sanitize(proposal.generated_html ?? "") : null;

  const confirm = async () => {
    setBusy("confirm");
    try {
      await onConfirm(interactionId, proposal);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    setBusy("cancel");
    try {
      await onCancel(interactionId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2 border border-zinc-800 rounded-lg bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon className="h-4 w-4 text-zinc-400 shrink-0" aria-hidden />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">
              {KIND_LABEL[proposal.kind]}
            </div>
            <div className="text-sm font-medium text-zinc-100 truncate">
              {proposal.summary}
            </div>
          </div>
        </div>
        {statusBadge(actionStatus)}
      </div>

      {noteHtml !== null && (
        <div
          className="px-3 py-2.5 text-sm text-zinc-200 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5"
          dangerouslySetInnerHTML={{ __html: noteHtml }}
        />
      )}

      <div className="flex items-center justify-end gap-1.5 px-3 py-2 border-t border-zinc-800 bg-zinc-900/40">
        <Button
          size="sm"
          variant="ghost"
          onClick={cancel}
          disabled={disabled}
          className="text-zinc-400 hover:text-zinc-200"
        >
          {busy === "cancel" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5 mr-1.5" />
          )}
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={confirm}
          disabled={disabled}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy === "confirm" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1.5" />
          )}
          Confirm
        </Button>
      </div>
    </div>
  );
}
