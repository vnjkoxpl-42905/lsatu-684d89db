import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GmailContact } from "../api";

interface GmailRecipientInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  contacts: GmailContact[];
  inputClassName?: string;
}

const MAX_RESULTS = 8;

// Rank: prefix matches on name OR email rank above midstring matches.
function rankContacts(query: string, contacts: GmailContact[]): GmailContact[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ c: GmailContact; score: number }> = [];
  for (const c of contacts) {
    const email = c.email.toLowerCase();
    const name = (c.name ?? "").toLowerCase();
    const emailIdx = email.indexOf(q);
    const nameIdx = name.indexOf(q);
    if (emailIdx === -1 && nameIdx === -1) continue;
    let score = 0;
    if (emailIdx === 0 || nameIdx === 0) score += 1000;
    else score += 100;
    score += Math.max(0, 100 - Math.min(emailIdx === -1 ? 999 : emailIdx, nameIdx === -1 ? 999 : nameIdx));
    scored.push({ c, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((s) => s.c);
}

export function GmailRecipientInput({
  value,
  onChange,
  placeholder,
  contacts,
  inputClassName,
}: GmailRecipientInputProps) {
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => rankContacts(value, contacts), [value, contacts]);
  const open = focused && value.trim().length > 0 && suggestions.length > 0;

  // Reset highlight when suggestion set changes.
  useEffect(() => {
    setHighlightIndex(0);
  }, [value, contacts]);

  function applySelection(contact: GmailContact) {
    onChange(contact.email);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      const pick = suggestions[highlightIndex];
      if (pick) {
        e.preventDefault();
        applySelection(pick);
        setFocused(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setFocused(false);
    }
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay so click on a suggestion still registers.
          setTimeout(() => setFocused(false), 120);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("border-0 focus-visible:ring-0 h-8 text-sm shadow-none", inputClassName)}
        autoComplete="off"
      />
      {open ? (
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
                // Prevent input blur before click handler fires.
                e.preventDefault();
                applySelection(c);
                setFocused(false);
              }}
              onMouseEnter={() => setHighlightIndex(idx)}
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
      ) : null}
    </div>
  );
}
