import { useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";
import { TERMS } from "../../data/terms";

// Map term name (lower-cased) to a record with the LSAT-specific definition
// and an example sentence. Built once at module load.
//
// Multi-word entries (e.g. "general principle") match before single-word
// entries when both are present in the same span.
interface TermRecord {
  term: string;
  meaning: string;
  example: string;
}

const TERM_LIST: TermRecord[] = TERMS.map((t) => ({
  term: t.term,
  meaning: t.options[t.correctOption] ?? t.definition,
  example: t.explanation,
}));

const TERM_INDEX: Record<string, TermRecord> = TERM_LIST.reduce(
  (acc, t) => {
    acc[t.term.toLowerCase()] = t;
    return acc;
  },
  {} as Record<string, TermRecord>,
);

// Regex matches whole terms case-insensitively, longest first so
// "general principle" wins over "principle". Word boundaries on both sides.
const TERM_REGEX = new RegExp(
  "\\b(" +
    TERM_LIST
      .map((t) => t.term)
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|") +
    ")\\b",
  "i",
);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// LSATTermCard: inline hover/focus card. Underlines the trigger word, opens
// a brutalist popup with term, plain-English meaning, and one example.
export function LSATTermCard({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  const popupId = useId();
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const record = TERM_INDEX[term.toLowerCase()];
  if (!record) return <>{children}</>;

  return (
    <span className="relative inline-block">
      <button
        type="button"
        aria-describedby={open ? popupId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            (e.currentTarget as HTMLButtonElement).blur();
          }
        }}
        className="underline decoration-2 decoration-brutal-ink-soft underline-offset-2 font-black hover:bg-brutal-yellow focus:bg-brutal-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-brutal-yellow focus-visible:outline-offset-2"
      >
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={popupId}
            role="tooltip"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute bottom-full left-0 mb-2 w-72 z-50 pointer-events-none",
              "bg-brutal-paper border-4 border-brutal-ink brutal-shadow p-3 text-left",
            )}
          >
            <span className="block text-[10px] font-black uppercase tracking-widest text-brutal-ink-soft mb-1">
              LSAT term
            </span>
            <span className="block text-base font-black uppercase tracking-tight mb-1">
              {record.term}
            </span>
            <span className="block text-sm font-bold mb-2">{record.meaning}</span>
            <span className="block text-xs italic font-bold text-brutal-ink-soft">
              {record.example}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

// TermText: wraps the FIRST occurrence of any LSAT term in a string with
// an LSATTermCard. Renders the rest as plain text. Designed for short
// paragraphs (one or two sentences); pass per-paragraph in lists.
export function TermText({ children }: { children: string }) {
  const text = children;
  const match = text.match(TERM_REGEX);
  if (!match || match.index === undefined) return <>{text}</>;
  const before = text.slice(0, match.index);
  const hit = match[0];
  const after = text.slice(match.index + hit.length);
  return (
    <>
      {before}
      <LSATTermCard term={hit}>{hit}</LSATTermCard>
      {after}
    </>
  );
}
