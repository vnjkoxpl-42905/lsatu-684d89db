import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The per-choice explanation layer that sits directly beneath an answer choice
 * in `OfficialQuestionPane`. Replaces the old dark `ExplanationPanel` sheet.
 *
 * Two rules carried over from that panel, and tightened to apply per choice
 * rather than per question:
 *  - Never invent content. A missing tag, percentage, or note renders as
 *    absent. A choice with no note gets no disclosure row at all — not an
 *    empty one, not a placeholder.
 *  - The source's nuance lives in the tag chip verbatim ("Too Weak", "Weakens,
 *    if anything"). The disclosure label only says which way the choice went.
 */

export interface InlineChoiceNote {
  /** Wrong-answer type from the source, e.g. "Out of Scope". */
  tag?: string | null;
  /** Percent of students who picked this choice. */
  studentPercent?: number | null;
  /** The choice's explanation prose. Absent for letters the source skipped. */
  note?: string | null;
}

/** Per-letter inline content for one question. A letter may legitimately be absent. */
export type InlineChoiceNotes = Record<string, InlineChoiceNote>;

interface Props {
  letter: string;
  isCorrect: boolean;
  /** The student's own pick, marked so they can find it fast. */
  isSelected: boolean;
  content: InlineChoiceNote;
  open: boolean;
  onToggle: (letter: string) => void;
}

/**
 * Open/closed state for a question's disclosures.
 *
 * Disclosures are independent — any number open at once — so the correct
 * choice and the student's own pick can be read side by side. On reveal those
 * two start open and the rest start closed. State resets on question change.
 */
export function useInlineDisclosures({
  questionKey,
  revealed,
  correctLetter,
  selectedLetter,
}: {
  questionKey?: string | null;
  revealed: boolean;
  correctLetter?: string | null;
  selectedLetter?: string | null;
}) {
  const [openLetters, setOpenLetters] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    if (!revealed) {
      setOpenLetters(new Set());
      return;
    }
    const next = new Set<string>();
    if (correctLetter) next.add(correctLetter);
    if (selectedLetter) next.add(selectedLetter);
    setOpenLetters(next);
  }, [questionKey, revealed, correctLetter, selectedLetter]);

  const toggleLetter = React.useCallback((letter: string) => {
    setOpenLetters((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }, []);

  return { openLetters, toggleLetter };
}

/** True when there is nothing real to render for this letter. */
export function isInlineChoiceEmpty(content: InlineChoiceNote | undefined, isSelected: boolean) {
  if (isSelected) return false;
  if (!content) return true;
  return !content.tag && content.studentPercent == null && !content.note;
}

export default function InlineChoiceExplanation({
  letter,
  isCorrect,
  isSelected,
  content,
  open,
  onToggle,
}: Props) {
  const { tag, studentPercent, note } = content;
  const hasNote = typeof note === "string" && note.trim().length > 0;
  const panelId = `inline-explanation-${letter}`;

  if (isInlineChoiceEmpty(content, isSelected)) return null;

  return (
    <div className="mt-2 text-[13px] leading-relaxed">
      {/* Tag, percentage, and the student's own pick. Any of these may be absent. */}
      <div className="flex flex-wrap items-center gap-2">
        {tag && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              isCorrect ? "bg-green-600 text-white" : "bg-slate-200 text-slate-700",
            )}
          >
            {tag}
          </span>
        )}
        {studentPercent != null && (
          <span className="text-slate-500 tabular-nums">{studentPercent}% of students</span>
        )}
        {isSelected && (
          <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Your answer
          </span>
        )}
      </div>

      {/* No note means no disclosure. The absence is the honest render. */}
      {hasNote && (
        <>
          <button
            type="button"
            onClick={() => onToggle(letter)}
            aria-expanded={open}
            aria-controls={panelId}
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 rounded px-1 -ml-1 py-0.5 font-semibold transition-colors",
              isCorrect
                ? "text-green-800 hover:bg-green-100"
                : "text-slate-700 hover:bg-slate-100",
            )}
          >
            <ChevronRight
              aria-hidden
              className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-90")}
            />
            {isCorrect ? "Why this is correct" : "Why this is wrong"}
          </button>

          {open && (
            <p
              id={panelId}
              className="mt-1 whitespace-pre-line pl-[18px] text-slate-600"
            >
              {note}
            </p>
          )}
        </>
      )}
    </div>
  );
}
