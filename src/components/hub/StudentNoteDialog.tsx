import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAddStudentContextNote } from "@/hooks/useStudentContext";
import { track } from "@/lib/analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName?: string | null;
}

/**
 * Shared "Add notes" dialog used by both the TA chat AttachmentBar and the
 * Student Hub's Notes tab. Wraps `useAddStudentContextNote` so callers just
 * provide open-state + studentId. Resets its local form on close.
 */
export default function StudentNoteDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
}: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const addNote = useAddStudentContextNote();
  const busy = addNote.isPending;

  useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
    }
  }, [open]);

  const handleSubmit = async () => {
    try {
      await addNote.mutateAsync({
        studentId,
        title,
        body,
      });
      track("hub_note_created", { student_id: studentId });
      toast.success(
        `Added note to ${studentName?.trim() || "this student"}'s context`
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add notes</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Prep style, parents contacted"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Notes</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Anything the TA should know about this student…"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
