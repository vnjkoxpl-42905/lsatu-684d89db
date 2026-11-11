import * as React from "react";
import { Bookmark, ChevronDown, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface StudyAidsBookmarkRow {
  key: string;
  label: string;
  /** Null when there is no route that can open this question. */
  href: string | null;
  isCurrent: boolean;
}

interface Props {
  bookmarked: boolean;
  onToggleBookmark: () => void;
  bookmarks: StudyAidsBookmarkRow[];
  onRemoveBookmark: (key: string) => void;
  /** Clears cross-outs and highlights on this question only. Omit to hide. */
  onClearMarks?: () => void;
  clearMarksLabel?: string;
  bookmarkNavigationNotice?: string;
  hasMarks: boolean;
  /** False when this device could not save; marks then last for this page only. */
  deviceSaved: boolean;
  /** Plain explanation when saving is degraded (unreadable, newer-version, or failed store). */
  notice?: string | null;
}

/**
 * Bookmark toggle plus a small list of saved questions. Lives in the toolbar's
 * right cluster. Bookmarks open in a new tab, so following one never abandons
 * the question on screen.
 */
export default function StudyAidsControls({
  bookmarked,
  onToggleBookmark,
  bookmarks,
  onRemoveBookmark,
  onClearMarks,
  clearMarksLabel = "Clear cross-outs and highlights on this question",
  bookmarkNavigationNotice,
  hasMarks,
  deviceSaved,
  notice = null,
}: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={onToggleBookmark}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? "Remove bookmark" : "Bookmark question"}
        title={bookmarked ? "Remove bookmark" : "Bookmark question"}
        className={cn(
          "p-1.5 rounded-sm transition-colors flex items-center justify-center",
          bookmarked
            ? "bg-sky-100 text-sky-800 border border-sky-300"
            : "border border-transparent text-slate-800 hover:bg-slate-200",
        )}
      >
        <Bookmark className={cn("w-5 h-5", bookmarked && "fill-current")} />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Bookmarks and study marks"
            title="Bookmarks and study marks"
            className={cn(
              "p-1 rounded-sm transition-colors flex items-center justify-center text-slate-800",
              open
                ? "bg-white border border-slate-700"
                : "border border-transparent hover:bg-slate-200",
            )}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-72 p-3 bg-white text-slate-900 border border-slate-200 shadow-lg rounded-md max-h-[70vh] overflow-y-auto"
        >
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate-600">Bookmarks</h2>
          {bookmarks.length === 0 ? (
            <p className="mt-2 text-[14px] text-slate-600">
              No bookmarks yet. Use the bookmark button to save this question.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {bookmarks.map((b) => (
                <li key={b.key} className="flex items-center gap-1">
                  {b.href && !b.isCurrent ? (
                    <a
                      href={b.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[14px] text-sky-800 underline-offset-2 hover:underline hover:bg-slate-50"
                    >
                      <span className="truncate">{b.label}</span>
                      <ExternalLink aria-hidden className="w-3.5 h-3.5 shrink-0" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="flex-1 min-w-0 truncate px-2 py-1 text-[14px] text-slate-700">
                      {b.label}
                      {b.isCurrent ? " (this question)" : ""}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveBookmark(b.key)}
                    aria-label={`Remove bookmark ${b.label}`}
                    title="Remove bookmark"
                    className="p-1 rounded-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {bookmarkNavigationNotice && <p className="mt-2 text-[12px] text-slate-500">{bookmarkNavigationNotice}</p>}
          {onClearMarks && (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={onClearMarks}
                disabled={!hasMarks}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {clearMarksLabel}
              </button>
            </div>
          )}
          <p className="mt-3 text-[12px] text-slate-500">
            {notice ??
              (deviceSaved
                ? "Bookmarks and marks are saved in this browser only. They do not sync to other devices. Storage is limited; remove unused bookmarks and clear marks when needed."
                : "This browser could not save them. They stay on this page until you leave it.")}
          </p>
        </PopoverContent>
      </Popover>
      {(!deviceSaved || notice) && (
        <span role="status" title={notice ?? undefined} className="px-1 text-[12px] text-amber-800 whitespace-nowrap">
          {deviceSaved ? "Some saved marks set aside" : "Marks not saved"}
        </span>
      )}
    </div>
  );
}
