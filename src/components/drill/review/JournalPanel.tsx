import * as React from "react";
import { Check, ExternalLink, Loader2, NotebookText, PenLine, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { questionBank } from "@/lib/questionLoader";
import { noteHasContent, type NoteFields, type StudyMarks } from "@/hooks/useQuestionStudyMarks";

/**
 * The Journal side panel for one question, 7Sage's shape: "This question" to
 * write, "All notes" to read back. Notes save on their own as you type.
 */

const TEMPLATE: Array<{ field: keyof NoteFields; label: string; placeholder: string }> = [
  { field: "question_summary", label: "Question summary", placeholder: "What is the question asking you to do?" },
  { field: "wrong_reasoning", label: "Why I picked my answer", placeholder: "What made the wrong answer look right?" },
  { field: "correct_reasoning", label: "Why the right answer is right", placeholder: "What does the correct answer actually do?" },
  { field: "trap_pattern", label: "The trap", placeholder: "Name the pattern that caught you." },
  { field: "lesson", label: "Next time", placeholder: "What will you do differently?" },
  { field: "other_notes", label: "Other notes", placeholder: "Anything else worth remembering." },
];

function label(qid: string) {
  const q = questionBank.getQuestion(qid);
  return q ? `PT${q.pt}.S${q.section}.Q${q.qnum}` : qid;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function JournalPanel({ qid, marks, onClose, onOpenQuestion, onOpenFullEntry }: {
  qid: string;
  marks: StudyMarks;
  onClose: () => void;
  /** Jump to another question from All notes. */
  onOpenQuestion?: (qid: string) => void;
  /** Open this question's full Wrong Answer Journal entry, where it can be drawn on. */
  onOpenFullEntry?: (qid: string) => void;
}) {
  const [tab, setTab] = React.useState<"this" | "all">("this");
  const saved = marks.note(qid);
  const [draft, setDraft] = React.useState<Partial<NoteFields>>({});
  const [showTemplate, setShowTemplate] = React.useState(false);
  const [state, setState] = React.useState<SaveState>("idle");
  const timer = React.useRef<number>();
  // Which question the draft was loaded for, and whether the student has typed
  // since. Once they type, a save coming back (or the note arriving late) must
  // never overwrite what is in the box.
  const loadedFor = React.useRef<string | null>(null);
  const dirty = React.useRef(false);

  // Load the saved note when the question changes, or when it arrives before
  // the student has typed anything.
  React.useEffect(() => {
    if (loadedFor.current === qid && dirty.current) return;
    loadedFor.current = qid;
    dirty.current = false;
    const n = marks.note(qid);
    setDraft({
      student_note: n?.student_note ?? "",
      question_summary: n?.question_summary ?? "",
      other_notes: n?.other_notes ?? "",
      wrong_reasoning: n?.wrong_reasoning ?? "",
      correct_reasoning: n?.correct_reasoning ?? "",
      trap_pattern: n?.trap_pattern ?? "",
      lesson: n?.lesson ?? "",
    });
    setShowTemplate(TEMPLATE.some((t) => (n?.[t.field] ?? "").trim()));
    setState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid, saved?.id]);

  const update = (field: keyof NoteFields, value: string) => {
    const next = { ...draft, [field]: value };
    dirty.current = true;
    setDraft(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setState("saving");
      try { await marks.saveNote(qid, next); setState("saved"); } catch { setState("error"); }
    }, 600);
  };
  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  const allNotes = [...marks.notes.values()].filter((n) => noteHasContent(n)).sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <aside role="dialog" aria-label="Journal" className="fixed inset-y-0 right-0 z-[210] flex w-full max-w-[420px] flex-col border-l border-slate-200 bg-[#fcfcfd] shadow-2xl animate-in slide-in-from-right duration-200">
      <header className="flex items-center justify-between px-6 pb-2 pt-5">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">Journal</h2>
        <button type="button" onClick={onClose} aria-label="Close journal" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><X className="h-5 w-5" /></button>
      </header>
      <div role="tablist" className="mx-6 flex gap-6 border-b border-slate-200">
        {(["this", "all"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("-mb-px border-b-2 pb-2 pt-1 text-[15px] font-medium transition-colors", tab === t ? "border-[#1f6f8b] text-[#1f6f8b]" : "border-transparent text-slate-600 hover:text-slate-900")}>
            {t === "this" ? "This question" : "All notes"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {tab === "this" ? (
          <>
            <p className="mb-3 text-[15px] font-medium text-slate-400">{noteHasContent(saved) ? "Your note on this question" : "Add a note to this question"}</p>
            <div className="rounded-[20px] border-2 border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {noteHasContent(saved) ? "Note" : "New note"}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case tracking-normal text-slate-700">{label(qid)}</span>
                <span className="ml-auto flex items-center gap-1 normal-case tracking-normal font-normal text-slate-400" aria-live="polite">
                  {state === "saving" && <><Loader2 className="h-3 w-3 animate-spin" />Saving</>}
                  {state === "saved" && <><Check className="h-3 w-3" />Saved</>}
                  {state === "error" && <span className="text-red-600">Not saved, try again</span>}
                </span>
              </div>
              <textarea
                aria-label="Note"
                value={draft.student_note ?? ""}
                onChange={(e) => update("student_note", e.target.value)}
                placeholder="Start typing…"
                rows={4}
                className="w-full resize-y border-0 bg-transparent p-0 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
              {showTemplate ? (
                <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                  {TEMPLATE.map((t) => (
                    <label key={t.field} className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.label}</span>
                      <textarea value={draft[t.field] ?? ""} onChange={(e) => update(t.field, e.target.value)} placeholder={t.placeholder} rows={2}
                        className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-[14px] leading-relaxed focus:border-slate-400 focus:outline-none" />
                    </label>
                  ))}
                </div>
              ) : (
                <button type="button" onClick={() => setShowTemplate(true)} className="mt-4 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50">
                  Use wrong answer journal template
                </button>
              )}
            </div>
            {onOpenFullEntry && (
              <button type="button" onClick={() => onOpenFullEntry(qid)}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-slate-400">
                <PenLine className="h-5 w-5 shrink-0 text-slate-700" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-900">Open full journal entry</span>
                  <span className="block text-xs text-slate-500">{marks.hasDrawing(qid) ? "Your drawings on this question are there." : "Draw on the question and work through every field."}</span>
                </span>
                <ExternalLink className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </>
        ) : allNotes.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center text-slate-500"><NotebookText className="mb-3 h-8 w-8" />No notes yet. Notes you write on any question show up here.</div>
        ) : (
          <ul className="space-y-3">
            {allNotes.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => { setTab("this"); onOpenQuestion?.(n.qid); }}
                  className={cn("w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-slate-400", n.qid === qid ? "border-[#1f6f8b]" : "border-slate-200")}>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{label(n.qid)}</span>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-700">{n.student_note || n.lesson || n.wrong_reasoning || n.correct_reasoning || n.trap_pattern}</p>
                  <p className="mt-2 text-xs text-slate-400">{new Date(n.updated_at).toLocaleDateString()}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
