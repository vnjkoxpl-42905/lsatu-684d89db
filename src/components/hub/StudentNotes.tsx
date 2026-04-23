import { useMemo, useState } from "react";
import {
  StickyNote,
  Plus,
  Loader2,
  Trash2,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useStudentContext,
  useDeleteStudentContext,
  type StudentContextItem,
  type StudentContextType,
} from "@/hooks/useStudentContext";
import StudentNoteDialog from "@/components/hub/StudentNoteDialog";

interface Props {
  studentId: string | null;
  studentName?: string | null;
}

const UPLOAD_TYPE_ORDER: StudentContextType[] = [
  "file",
  "screenshot",
  "transcript",
  "external_score",
];

const UPLOAD_TYPE_LABEL: Record<StudentContextType, string> = {
  file: "Files",
  screenshot: "Screenshots",
  transcript: "Transcripts",
  note: "Notes",
  external_score: "External scores",
};

function uploadIcon(type: StudentContextType) {
  if (type === "screenshot") return ImageIcon;
  if (type === "transcript") return FileText;
  if (type === "external_score") return Award;
  return Paperclip;
}

export default function StudentNotes({ studentId, studentName }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: items = [], isLoading } = useStudentContext(studentId ?? "");
  const remove = useDeleteStudentContext();

  const { notes, uploadsByType } = useMemo(() => {
    const notes: StudentContextItem[] = [];
    const buckets = new Map<StudentContextType, StudentContextItem[]>();
    for (const it of items) {
      if (it.context_type === "note") {
        notes.push(it);
      } else {
        const arr = buckets.get(it.context_type) ?? [];
        arr.push(it);
        buckets.set(it.context_type, arr);
      }
    }
    return { notes, uploadsByType: buckets };
  }, [items]);

  const handleDelete = async (item: StudentContextItem) => {
    try {
      await remove.mutateAsync({
        id: item.id,
        student_id: item.student_id,
        file_path: item.file_path,
      });
      toast.success("Removed from context");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (!studentId) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div className="max-w-xs space-y-2">
          <StickyNote className="h-8 w-8 text-zinc-600 mx-auto" />
          <div className="text-sm text-zinc-500">
            Select a student to manage their notes.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/30">
      <div className="p-4 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Notes
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs border-zinc-800"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Create note
        </Button>
      </div>

      <section className="px-4 py-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : notes.length === 0 ? (
          <div className="text-[12px] text-zinc-500">
            No notes yet. Use "Create note" above or the chat attachment bar.
          </div>
        ) : (
          <ul className="space-y-2">
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                item={n}
                onDelete={() => handleDelete(n)}
                deleting={remove.isPending}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          Uploads
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-[12px] text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        ) : uploadsByType.size === 0 ? (
          <div className="text-[12px] text-zinc-500">
            No uploads yet. Use the attachment bar in the chat to add files,
            screenshots, or transcripts.
          </div>
        ) : (
          UPLOAD_TYPE_ORDER.filter((t) => uploadsByType.has(t)).map((t) => (
            <UploadGroup
              key={t}
              type={t}
              items={uploadsByType.get(t) ?? []}
              onDelete={handleDelete}
              deleting={remove.isPending}
            />
          ))
        )}
      </section>

      <StudentNoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studentId={studentId}
        studentName={studentName}
      />
    </div>
  );
}

function NoteCard({
  item,
  onDelete,
  deleting,
}: {
  item: StudentContextItem;
  onDelete: () => void;
  deleting: boolean;
}) {
  const preview =
    item.content_text?.split("\n").slice(0, 2).join(" ").trim() ?? "";
  return (
    <li className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2.5 group">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-zinc-100 truncate">
            {item.title}
          </div>
          {preview && (
            <div className="mt-1 text-[12px] text-zinc-400 line-clamp-2">
              {preview}
            </div>
          )}
          <div className="mt-1 text-[10px] text-zinc-500">
            {new Date(item.created_at).toLocaleString()}
          </div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className={cn(
            "shrink-0 rounded-md p-1 text-zinc-500",
            "hover:text-red-300 hover:bg-red-500/10",
            "disabled:opacity-50"
          )}
          aria-label={`Delete note ${item.title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function UploadGroup({
  type,
  items,
  onDelete,
  deleting,
}: {
  type: StudentContextType;
  items: StudentContextItem[];
  onDelete: (item: StudentContextItem) => void;
  deleting: boolean;
}) {
  const Icon = uploadIcon(type);
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] text-zinc-500">
        {UPLOAD_TYPE_LABEL[type]} · {items.length}
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li
            key={it.id}
            className="rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1.5 flex items-center gap-2"
          >
            <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] text-zinc-200 truncate">
                {it.title}
              </div>
              <div className="text-[10px] text-zinc-500">
                {new Date(it.created_at).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDelete(it)}
              disabled={deleting}
              className="shrink-0 text-zinc-500 hover:text-red-300"
              aria-label={`Delete ${it.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
