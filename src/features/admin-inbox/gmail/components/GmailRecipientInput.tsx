import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GmailContact } from "../api";
import { rankContacts } from "../utils/rankContacts";

interface GmailRecipientInputProps {
  /** Comma-joined list of recipients ("Name <a@b.com>, c@d.com"). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  contacts: GmailContact[];
  inputClassName?: string;
}

const MAX_RESULTS = 8;
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Display chip plus the full RFC 5322 form we send back upstream. */
interface Chip {
  display: string;
  rfc: string;
  email: string;
}

function parseSeparated(s: string): Chip[] {
  if (!s) return [];
  return s
    .split(/[,;]+/)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((piece) => {
      const angle = piece.match(/^(.*?)<([^>]+)>\s*$/);
      if (angle) {
        const name = angle[1].trim().replace(/^"|"$/g, "").trim();
        const email = angle[2].trim();
        return {
          display: name || email,
          email,
          rfc: name ? `"${name.replace(/"/g, "\\\"")}" <${email}>` : email,
        };
      }
      return { display: piece, email: piece, rfc: piece };
    });
}

function chipsToValue(chips: Chip[]): string {
  return chips.map((c) => c.rfc).join(", ");
}

function chipFromContact(c: GmailContact): Chip {
  const display = c.name ? c.name : c.email;
  const rfc = c.name ? `"${c.name.replace(/"/g, "\\\"")}" <${c.email}>` : c.email;
  return { display, email: c.email, rfc };
}

function chipFromText(raw: string): Chip | null {
  const piece = raw.trim().replace(/[,;]+$/, "");
  if (!piece) return null;
  const angle = piece.match(/^(.*?)<([^>]+)>\s*$/);
  if (angle) {
    const name = angle[1].trim().replace(/^"|"$/g, "").trim();
    const email = angle[2].trim();
    if (!EMAIL_RE.test(email)) return null;
    return {
      display: name || email,
      email,
      rfc: name ? `"${name}" <${email}>` : email,
    };
  }
  if (!EMAIL_RE.test(piece)) return null;
  return { display: piece, email: piece, rfc: piece };
}

export function GmailRecipientInput({
  value,
  onChange,
  placeholder,
  contacts,
  inputClassName,
}: GmailRecipientInputProps) {
  // Chip state derived from value, but local typing is tracked separately.
  const [chips, setChips] = useState<Chip[]>(() => parseSeparated(value));
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync from external value when it changes from outside (reset, prefill, etc.).
  useEffect(() => {
    const incoming = chipsToValue(parseSeparated(value));
    if (incoming !== chipsToValue(chips)) {
      setChips(parseSeparated(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(next: Chip[]) {
    setChips(next);
    onChange(chipsToValue(next));
  }

  function addChip(c: Chip | null) {
    if (!c) return;
    if (chips.some((existing) => existing.email.toLowerCase() === c.email.toLowerCase())) {
      setDraft("");
      return;
    }
    commit([...chips, c]);
    setDraft("");
  }

  function removeChip(idx: number) {
    commit(chips.filter((_, i) => i !== idx));
  }

  const suggestions = useMemo(
    () => rankContacts(draft, contacts, MAX_RESULTS).filter(
      (c) => !chips.some((existing) => existing.email.toLowerCase() === c.email.toLowerCase()),
    ),
    [draft, contacts, chips],
  );
  const open = focused && draft.trim().length > 0 && suggestions.length > 0;

  useEffect(() => { setHighlightIndex(0); }, [draft, contacts]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setHighlightIndex((i) =>
        e.key === "ArrowDown"
          ? (i + 1) % suggestions.length
          : (i - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }
    if (e.key === "Enter" || e.key === "Tab" || e.key === "," || e.key === ";") {
      if (open) {
        const pick = suggestions[highlightIndex];
        if (pick) {
          e.preventDefault();
          addChip(chipFromContact(pick));
          return;
        }
      }
      const c = chipFromText(draft);
      if (c) {
        e.preventDefault();
        addChip(c);
      } else if (e.key === "Enter" || e.key === ",") {
        // Block invalid commit — keep typing.
        if (draft.trim()) e.preventDefault();
      }
    } else if (e.key === "Backspace" && draft === "" && chips.length > 0) {
      e.preventDefault();
      removeChip(chips.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setFocused(false);
    }
  }

  function handleBlur() {
    // Commit a typed-but-uncommitted email on blur, then close suggestions.
    const c = chipFromText(draft);
    if (c) addChip(c);
    setTimeout(() => setFocused(false), 120);
  }

  return (
    <div className="relative flex-1">
      <div
        className={cn(
          "flex flex-wrap items-center gap-1 py-1 min-h-8 cursor-text",
          inputClassName,
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((c, idx) => {
          const invalid = !EMAIL_RE.test(c.email);
          return (
            <span
              key={`${c.email}-${idx}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-xs border",
                invalid
                  ? "bg-destructive/10 border-destructive/40 text-destructive"
                  : "bg-muted border-border text-foreground",
              )}
              title={c.email}
            >
              <span className="truncate max-w-[220px]">{c.display}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeChip(idx); }}
                className="rounded-full hover:bg-foreground/10 p-0.5"
                aria-label={`Remove ${c.display}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData("text");
            if (pasted && /[,;\n]/.test(pasted)) {
              e.preventDefault();
              const pieces = parseSeparated(pasted);
              if (pieces.length) {
                const next = [...chips];
                for (const p of pieces) {
                  if (!next.some((x) => x.email.toLowerCase() === p.email.toLowerCase())) {
                    next.push(p);
                  }
                }
                commit(next);
                setDraft("");
              }
            }
          }}
          placeholder={chips.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm h-7 px-1"
          autoComplete="off"
        />
      </div>
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
                e.preventDefault();
                addChip(chipFromContact(c));
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
