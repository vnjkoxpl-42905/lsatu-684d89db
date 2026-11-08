import * as React from "react";
import { Bookmark, ChevronRight, NotebookText, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The "…" panel on a results row: everything about one question in one place,
 * with Notes and Bookmark live, and a way into the question itself.
 */
export function QuestionInfoPanel({ label, result, difficulty, timing, tags, hasNote, bookmarked, onReview, onNotes, onBookmark, onClose }: {
  label: string;
  result: React.ReactNode;
  difficulty: React.ReactNode;
  timing: React.ReactNode;
  tags: string[];
  hasNote: boolean;
  bookmarked: boolean;
  onReview: () => void;
  onNotes: () => void;
  onBookmark: () => void;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const row = (name: string, value: React.ReactNode) => (
    <>
      <dt className="self-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{name}</dt>
      <dd className="w-fit">{value}</dd>
    </>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/25 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <section role="dialog" aria-label={`${label} details`} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-t-2xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl">
        <header className="relative border-b-2 border-border p-5">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
          <p className="text-lg font-semibold">{label}</p>
          <button type="button" onClick={onReview} className="mt-1 inline-flex items-center font-semibold text-primary hover:underline">Review<ChevronRight className="h-4 w-4" /></button>
        </header>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 p-5">
          {row("Result", result)}
          {row("Difficulty", difficulty)}
          {row("Timing", timing)}
          {row("Tag", tags.length ? <div className="flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{t}</span>)}</div> : "–")}
          {row("Notes", (
            <button type="button" onClick={onNotes} aria-label={hasNote ? "Open your note" : "Add a note"} className="relative rounded-xl p-2 hover:bg-accent">
              <NotebookText className="h-5 w-5" />
              {hasNote && <span aria-hidden className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-500" />}
            </button>
          ))}
          {row("Bookmark", (
            <button type="button" onClick={onBookmark} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"} className="rounded-xl p-2 hover:bg-accent">
              <Bookmark className={cn("h-5 w-5", bookmarked && "fill-primary text-primary")} />
            </button>
          ))}
        </dl>
      </section>
    </div>
  );
}
