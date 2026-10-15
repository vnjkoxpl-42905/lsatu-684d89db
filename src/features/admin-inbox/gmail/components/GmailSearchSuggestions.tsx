import { cn } from "@/lib/utils";
import type { GmailContact } from "../api";

interface GmailSearchSuggestionsProps {
  suggestions: GmailContact[];
  open: boolean;
  highlightIndex: number;
  onHighlightChange: (idx: number) => void;
  onSelect: (email: string) => void;
}

export function GmailSearchSuggestions({
  suggestions,
  open,
  highlightIndex,
  onHighlightChange,
  onSelect,
}: GmailSearchSuggestionsProps) {
  if (!open) return null;
  if (suggestions.length === 0) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden"
      role="listbox"
    >
      {suggestions.map((c, idx) => (
        <button
          key={c.email}
          type="button"
          role="option"
          aria-selected={idx === highlightIndex}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(c.email);
          }}
          onMouseEnter={() => onHighlightChange(idx)}
          className={cn(
            "w-full text-left px-3 py-1.5 text-sm flex items-baseline gap-2 truncate",
            idx === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          )}
        >
          {c.name ? (
            <>
              <span className="truncate">{c.name}</span>
              <span className="text-xs text-muted-foreground truncate">{c.email}</span>
            </>
          ) : (
            <span className="truncate">{c.email}</span>
          )}
        </button>
      ))}
    </div>
  );
}
