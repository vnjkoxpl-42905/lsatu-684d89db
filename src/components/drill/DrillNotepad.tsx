import * as React from "react";
import { NotebookPen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveDrillQid,
  subscribeActiveDrillQid,
} from "@/lib/drillNotepadBus";
import { readDrillNotes, writeDrillNotes } from "@/lib/drillNotesStorage";

/**
 * Mini notepad in the exam header, top right. It used to float at the
 * bottom-left, where it sat on top of the question-number strip.
 * - Notes are stored per-question (keyed by active qid) and auto-load on
 *   question change. Falls back to a shared "global" pad outside questions.
 * - Persists to localStorage.
 */
export default function DrillNotepad() {
  const [open, setOpen] = React.useState(false);
  const [qid, setQid] = React.useState<string | null>(() => getActiveDrillQid());
  const [value, setValue] = React.useState("");

  // Track active question id from the drill page.
  React.useEffect(() => subscribeActiveDrillQid(setQid), []);

  // Load notes whenever the active qid changes.
  React.useEffect(() => {
    setValue(readDrillNotes(qid));
  }, [qid]);

  // Persist notes for the current qid.
  React.useEffect(() => {
    writeDrillNotes(qid, value);
  }, [value, qid]);

  const hasNotes = value.trim().length > 0;

  return (
    <div className="relative flex items-center">
      {open && (
        <div
          role="dialog"
          aria-label="Notepad"
          className={cn(
            "absolute right-0 top-full z-50 mt-2",
            "bg-white border border-slate-300 rounded-lg shadow-xl",
            "flex flex-col overflow-hidden",
            // Desktop: fixed-size panel. Mobile: bottom-sheet width.
            "w-[min(320px,calc(100vw-2rem))] h-[360px]",
            "sm:w-[320px] sm:h-[360px]",
          )}
          style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800 min-w-0">
              <NotebookPen className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Notepad
                {qid && (
                  <span className="ml-1.5 font-normal text-slate-500">
                    · this question
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setValue("")}
                className="text-[12px] text-slate-500 hover:text-slate-800 underline disabled:opacity-40 disabled:no-underline"
                disabled={!hasNotes}
              >
                Clear
              </button>
              <button
                type="button"
                aria-label="Close notepad"
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              qid
                ? "Notes for this question (auto-saved)…"
                : "Jot down notes (auto-saved)…"
            }
            className={cn(
              "flex-1 w-full resize-none px-3 py-2 text-[14px] leading-relaxed",
              "text-slate-900 placeholder:text-slate-400 bg-white",
              "focus:outline-none",
            )}
            style={{ fontSize: "16px" }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide notepad" : "Open notepad"}
        title="Notepad"
        aria-expanded={open}
        className={cn(
          "relative inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium",
          open ? "border-slate-800 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700",
        )}
      >
        <NotebookPen className="h-4 w-4" />
        <span className="hidden sm:inline">Notepad</span>
        {hasNotes && !open && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white"
          />
        )}
      </button>
    </div>
  );
}
