import { useState } from "react";
import DOMPurify from "dompurify";
import { Check, X, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DraftPayload } from "@/hooks/useTAChat";

interface Props {
  interactionId: string;
  studentId: string;
  draft: DraftPayload;
  draftStatus: "pending" | "approved" | "rejected" | null;
  onRevise: (instructions: string) => Promise<void>;
}

export default function DraftCard({
  interactionId,
  studentId,
  draft,
  draftStatus,
  onRevise,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<"approve" | "reject" | "revise" | null>(null);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseText, setReviseText] = useState("");

  const disabled = draftStatus !== "pending" || busy !== null;

  const sanitized = DOMPurify.sanitize(draft.content_html || "");

  const approve = async () => {
    if (!user) return;
    setBusy("approve");
    try {
      const { error: insertErr } = await (supabase as any)
        .from("ta_assignments")
        .insert({
          student_id: studentId,
          interaction_id: interactionId,
          title: draft.title,
          content_html: draft.content_html,
          asset_ids: draft.asset_ids ?? [],
          assigned_by: user.id,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      const { error: updErr } = await (supabase as any)
        .from("ta_interactions")
        .update({ draft_status: "approved" })
        .eq("id", interactionId);
      if (updErr) throw updErr;

      toast.success("Assignment created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy("reject");
    try {
      const { error } = await (supabase as any)
        .from("ta_interactions")
        .update({ draft_status: "rejected" })
        .eq("id", interactionId);
      if (error) throw error;
      toast.success("Draft rejected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  };

  const submitRevise = async () => {
    const text = reviseText.trim();
    if (!text) return;
    setBusy("revise");
    try {
      await onRevise(text);
      setReviseText("");
      setReviseOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revise failed");
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = () => {
    if (draftStatus === "approved") {
      return (
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
          Approved
        </span>
      );
    }
    if (draftStatus === "rejected") {
      return (
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/15 text-red-300">
          Rejected
        </span>
      );
    }
    return (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
        Pending
      </span>
    );
  };

  return (
    <div className="mt-2 border border-zinc-800 rounded-lg bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">
            Draft assignment
          </div>
          <div className="text-sm font-medium text-zinc-100 truncate">
            {draft.title || "Untitled"}
          </div>
        </div>
        {statusBadge()}
      </div>

      <div
        className="px-3 py-2.5 text-sm text-zinc-200 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />

      {draft.asset_ids?.length > 0 && (
        <div className="px-3 pb-2 text-[11px] text-zinc-500">
          Sources: {draft.asset_ids.length} asset
          {draft.asset_ids.length === 1 ? "" : "s"}
        </div>
      )}

      {reviseOpen && (
        <div className="px-3 py-2 border-t border-zinc-800 space-y-2">
          <Textarea
            value={reviseText}
            onChange={(e) => setReviseText(e.target.value)}
            placeholder="What should change?"
            rows={2}
            className="text-sm"
            disabled={busy === "revise"}
          />
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReviseOpen(false);
                setReviseText("");
              }}
              disabled={busy === "revise"}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submitRevise}
              disabled={busy === "revise" || !reviseText.trim()}
            >
              {busy === "revise" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending
                </>
              ) : (
                "Send revision"
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5 px-3 py-2 border-t border-zinc-800 bg-zinc-900/40">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setReviseOpen((v) => !v)}
          disabled={disabled}
          className="text-zinc-300"
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Revise
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={reject}
          disabled={disabled}
          className="text-red-400 hover:text-red-300"
        >
          {busy === "reject" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5 mr-1.5" />
          )}
          Reject
        </Button>
        <Button
          size="sm"
          onClick={approve}
          disabled={disabled}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {busy === "approve" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 mr-1.5" />
          )}
          Approve
        </Button>
      </div>
    </div>
  );
}
