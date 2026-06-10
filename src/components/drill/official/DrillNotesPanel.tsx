import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveDrillQid,
  subscribeActiveDrillQid,
} from "@/lib/drillNotepadBus";
import { readDrillNotes, writeDrillNotes } from "@/lib/drillNotesStorage";

interface Props {
  onClose?: () => void;
}

/**
 * Docked, premium per-question notes editor for the Smart Drill runner.
 * Slides in from the right (the frame handles the push/width animation).
 * Notes auto-save to localStorage per question, keyed by the active qid via
 * the drillNotepad bus — the same store the floating DrillNotepad uses.
 */
export default function DrillNotesPanel({ onClose }: Props) {
  const [qid, setQid] = React.useState<string | null>(() => getActiveDrillQid());
  const [value, setValue] = React.useState("");
  const [saved, setSaved] = React.useState(true);

  // Follow the active question.
  React.useEffect(() => subscribeActiveDrillQid(setQid), []);

  // Load this question's notes when the qid changes.
  React.useEffect(() => {
    setValue(readDrillNotes(qid));
    setSaved(true);
  }, [qid]);

  const handleChange = (next: string) => {
    setValue(next);
    setSaved(false);
  };

  // Persist (debounced) after typing settles, then flip the status to "Saved".
  React.useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      writeDrillNotes(qid, value);
      setSaved(true);
    }, 400);
    return () => clearTimeout(t);
  }, [value, qid, saved]);

  return (
    <div
      role="dialog"
      aria-label="Notes"
      className="h-full w-[380px] max-w-[100vw] bg-white border-l border-slate-200 shadow-[-8px_0_24px_rgba(15,23,42,0.06)] flex flex-col"
      style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-0 flex items-start justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">Notes</h2>
          <span aria-hidden className="mt-1.5 block h-[3px] w-7 rounded-full bg-amber-400" />
        </div>
        <button
          type="button"
          aria-label="Close notes"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 transition-colors -mr-1"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Helper copy */}
      <p className="px-5 pt-3 pb-3 text-[13px] leading-relaxed text-slate-500 italic">
        Use this space to jot down any thoughts for this question. Your notes will be
        saved and visible the next time you review this question.
      </p>

      {/* Editor */}
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Notes for this question…"
        className={cn(
          "flex-1 w-full resize-none px-5 py-3 border-t border-slate-100",
          "text-slate-900 placeholder:text-slate-400 bg-white leading-relaxed",
          "focus:outline-none",
        )}
        style={{ fontSize: "15px" }}
      />

      {/* Auto-save status */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[12px] text-slate-400">
          {saved ? "Saved" : "Saving…"}
        </span>
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 rounded-full transition-colors",
            saved ? "bg-emerald-400" : "bg-amber-400",
          )}
        />
      </div>
    </div>
  );
}
