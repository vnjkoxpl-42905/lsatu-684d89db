import { useRef, useState } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  StickyNote,
  CalendarClock,
  Loader2,
  X,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  useStudentContext,
  useUploadStudentContextFile,
  useAddStudentContextNote,
  useDeleteStudentContext,
  type StudentContextItem,
} from "@/hooks/useStudentContext";
import {
  useLogStudentSession,
  type SessionStatus,
} from "@/hooks/useStudentSessions";
import StudentNoteDialog from "@/components/hub/StudentNoteDialog";
import { track } from "@/lib/analytics";

const SESSION_STATUSES: { value: SessionStatus; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

function toLocalDatetimeInput(d: Date): string {
  // datetime-local expects YYYY-MM-DDTHH:mm in *local* time (no timezone).
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

interface Props {
  studentId: string;
  studentName?: string | null;
}

type TranscriptMode = "paste" | "file";

/**
 * Attachment toolbar for the TA chat. Four paths per the roadmap:
 *   1. Attach file       — PDF/.txt/.md uploaded to student-context bucket,
 *                          text extracted into content_text.
 *   2. Attach screenshot — image uploaded; text extraction is skipped
 *                          (pdfExtract is text-only; OCR is out of scope).
 *   3. Attach transcript — dialog with paste or file upload path.
 *   4. Add notes         — dialog with title + free-form body, no file.
 *
 * The bar also renders a lightweight count + chip row so the admin can see
 * (and revoke) what the TA currently has on this student.
 */
export default function AttachmentBar({ studentId, studentName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const screenshotRef = useRef<HTMLInputElement>(null);
  const transcriptFileRef = useRef<HTMLInputElement>(null);

  const [noteOpen, setNoteOpen] = useState(false);

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptMode, setTranscriptMode] = useState<TranscriptMode>("paste");
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptBody, setTranscriptBody] = useState("");

  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionWhen, setSessionWhen] = useState(() =>
    toLocalDatetimeInput(new Date())
  );
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("completed");
  const [sessionDuration, setSessionDuration] = useState("60");
  const [sessionNotes, setSessionNotes] = useState("");

  const { data: items = [] } = useStudentContext(studentId);
  const uploadFile = useUploadStudentContextFile();
  const addNote = useAddStudentContextNote();
  const remove = useDeleteStudentContext();
  const logSession = useLogStudentSession();

  const busy = uploadFile.isPending || addNote.isPending || logSession.isPending;
  const studentLabel = studentName?.trim() || "this student";

  const handleFilePick = async (
    file: File | null,
    contextType: "file" | "screenshot"
  ) => {
    if (!file) return;
    try {
      const { title } = await uploadFile.mutateAsync({
        studentId,
        file,
        contextType,
      });
      track("hub_upload_attached", {
        student_id: studentId,
        context_type: contextType,
        size: file.size,
      });
      toast.success(`Added ${title} to ${studentLabel}'s context`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      if (screenshotRef.current) screenshotRef.current.value = "";
    }
  };

  const handleTranscriptSubmit = async () => {
    const title = transcriptTitle.trim();
    if (!title) {
      toast.error("Transcript title is required");
      return;
    }
    try {
      if (transcriptMode === "paste") {
        if (!transcriptBody.trim()) {
          toast.error("Paste the transcript text or switch to file upload");
          return;
        }
        await addNote.mutateAsync({
          studentId,
          title,
          body: transcriptBody,
          contextType: "transcript",
          source: "paste",
        });
      } else {
        const file = transcriptFileRef.current?.files?.[0] ?? null;
        if (!file) {
          toast.error("Pick a transcript file or switch to paste");
          return;
        }
        await uploadFile.mutateAsync({
          studentId,
          file,
          contextType: "transcript",
          title,
          source: "upload",
        });
      }
      track("hub_upload_attached", {
        student_id: studentId,
        context_type: "transcript",
        mode: transcriptMode,
      });
      toast.success(`Added transcript to ${studentLabel}'s context`);
      setTranscriptOpen(false);
      setTranscriptTitle("");
      setTranscriptBody("");
      if (transcriptFileRef.current) transcriptFileRef.current.value = "";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const handleSessionSubmit = async () => {
    const whenRaw = sessionWhen.trim();
    if (!whenRaw) {
      toast.error("Session date is required");
      return;
    }
    const when = new Date(whenRaw);
    if (Number.isNaN(when.getTime())) {
      toast.error("Invalid session date");
      return;
    }
    const durationNum = sessionDuration.trim()
      ? Number(sessionDuration)
      : null;
    if (durationNum !== null && (!Number.isFinite(durationNum) || durationNum < 0)) {
      toast.error("Duration must be a positive number");
      return;
    }
    try {
      await logSession.mutateAsync({
        studentId,
        scheduledAt: when.toISOString(),
        status: sessionStatus,
        durationMinutes: durationNum,
        notes: sessionNotes.trim() || null,
      });
      track("hub_session_logged", {
        student_id: studentId,
        status: sessionStatus,
      });
      toast.success(`Logged session for ${studentLabel}`);
      setSessionOpen(false);
      setSessionNotes("");
      setSessionWhen(toLocalDatetimeInput(new Date()));
      setSessionStatus("completed");
      setSessionDuration("60");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const handleRemove = async (item: StudentContextItem) => {
    try {
      await remove.mutateAsync({
        id: item.id,
        student_id: item.student_id,
        file_path: item.file_path,
      });
      toast.success("Removed from context");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <AttachmentButton
          icon={Paperclip}
          label="Attach file"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        />
        <AttachmentButton
          icon={ImageIcon}
          label="Attach screenshot"
          onClick={() => screenshotRef.current?.click()}
          disabled={busy}
        />
        <AttachmentButton
          icon={FileText}
          label="Attach transcript"
          onClick={() => setTranscriptOpen(true)}
          disabled={busy}
        />
        <AttachmentButton
          icon={StickyNote}
          label="Add notes"
          onClick={() => setNoteOpen(true)}
          disabled={busy}
        />
        <AttachmentButton
          icon={CalendarClock}
          label="Log session"
          onClick={() => setSessionOpen(true)}
          disabled={busy}
        />
        {busy && (
          <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> saving
          </span>
        )}
        {items.length > 0 && (
          <span className="ml-auto text-[11px] text-zinc-500">
            {items.length} context {items.length === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {items.slice(0, 6).map((it) => (
            <ContextChip key={it.id} item={it} onRemove={handleRemove} />
          ))}
          {items.length > 6 && (
            <span className="text-[11px] text-zinc-500 self-center px-1">
              +{items.length - 6} more
            </span>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        className="hidden"
        onChange={(e) => handleFilePick(e.target.files?.[0] ?? null, "file")}
      />
      <input
        ref={screenshotRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFilePick(e.target.files?.[0] ?? null, "screenshot")}
      />

      <Dialog
        open={transcriptOpen}
        onOpenChange={(next) => {
          if (busy) return;
          setTranscriptOpen(next);
          if (!next) {
            setTranscriptTitle("");
            setTranscriptBody("");
            if (transcriptFileRef.current) transcriptFileRef.current.value = "";
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Attach transcript</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Title</label>
              <Input
                value={transcriptTitle}
                onChange={(e) => setTranscriptTitle(e.target.value)}
                placeholder="e.g. April 15 session"
              />
            </div>
            <div className="flex gap-1.5">
              <ModeTab
                label="Paste text"
                active={transcriptMode === "paste"}
                onClick={() => setTranscriptMode("paste")}
              />
              <ModeTab
                label="Upload file"
                active={transcriptMode === "file"}
                onClick={() => setTranscriptMode("file")}
              />
            </div>
            {transcriptMode === "paste" ? (
              <Textarea
                value={transcriptBody}
                onChange={(e) => setTranscriptBody(e.target.value)}
                rows={10}
                placeholder="Paste the full transcript here…"
              />
            ) : (
              <input
                ref={transcriptFileRef}
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTranscriptOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={handleTranscriptSubmit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sessionOpen}
        onOpenChange={(next) => {
          if (busy) return;
          setSessionOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Log session</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400">When</label>
                <Input
                  type="datetime-local"
                  value={sessionWhen}
                  onChange={(e) => setSessionWhen(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400">Status</label>
                <select
                  value={sessionStatus}
                  onChange={(e) =>
                    setSessionStatus(e.target.value as SessionStatus)
                  }
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
                >
                  {SESSION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Duration (minutes)</label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Notes (optional)</label>
              <Textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={5}
                placeholder="What was covered, what was assigned, follow-ups…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSessionOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={handleSessionSubmit} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudentNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        studentId={studentId}
        studentName={studentName}
      />
    </div>
  );
}

interface AttachmentButtonProps {
  icon: typeof Paperclip;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function AttachmentButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: AttachmentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900",
        "px-2 py-1 text-[11px] text-zinc-300",
        "hover:bg-zinc-800 hover:text-zinc-100 transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </button>
  );
}

function ModeTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-2.5 py-1 rounded-md text-[11px] transition-colors",
        active
          ? "bg-zinc-800 text-zinc-100"
          : "bg-transparent text-zinc-400 hover:bg-zinc-800/60"
      )}
    >
      {label}
    </button>
  );
}

function ContextChip({
  item,
  onRemove,
}: {
  item: StudentContextItem;
  onRemove: (item: StudentContextItem) => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300 max-w-[200px]"
      title={`${item.context_type} · ${new Date(item.created_at).toLocaleString()}`}
    >
      <span className="truncate">{item.title}</span>
      <button
        type="button"
        onClick={() => onRemove(item)}
        className="text-zinc-500 hover:text-zinc-200"
        aria-label={`Remove ${item.title}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
