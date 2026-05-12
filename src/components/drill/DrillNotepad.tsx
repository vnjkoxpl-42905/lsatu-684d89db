import * as React from "react";
import { NotebookPen, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "drill-notepad:global";

/**
 * Mini notepad pinned to the bottom-left of the drill page.
 * - Collapsed: small notebook launcher button.
 * - Expanded: ~320×360 panel with textarea, Clear, and close.
 * - Persists locally to localStorage.
 * - On mobile, expands as a bottom sheet.
 */
export default function DrillNotepad() {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v) setValue(v);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, [value, hydrated]);

  const hasNotes = value.trim().length > 0;

  return (
    <div
      className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {open && (
        <div
          role="dialog"
          aria-label="Notepad"
          className={cn(
            "bg-white border border-slate-300 rounded-lg shadow-xl",
            "flex flex-col overflow-hidden",
            // Desktop: fixed-size panel. Mobile: bottom-sheet width.
            "w-[min(320px,calc(100vw-2rem))] h-[360px]",
            "sm:w-[320px] sm:h-[360px]",
          )}
          style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
              <NotebookPen className="h-4 w-4" />
              Notepad
            </div>
            <div className="flex items-center gap-2">
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
            placeholder="Jot down notes for this question…"
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
        className={cn(
          "relative h-11 w-11 rounded-full bg-white border border-slate-300",
          "shadow-md flex items-center justify-center",
          "text-slate-800 hover:bg-slate-50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700",
        )}
      >
        <NotebookPen className="h-5 w-5" />
        {hasNotes && !open && (
          <span
            aria-hidden
            className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
          />
        )}
      </button>
    </div>
  );
}
