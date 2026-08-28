import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The per-choice explanation layer that sits directly beneath an answer choice
 * in `OfficialQuestionPane`. Replaces the old dark `ExplanationPanel` sheet.
 *
 * The explanation is ALWAYS VISIBLE. It used to sit behind a "Why this is
 * wrong" disclosure, which cost a click per choice and, on a shared screen
 * during teaching, hid the very thing being taught. Reading five choices meant
 * five clicks. The prose is the point of the review screen, so it is set at
 * reading size and shown outright.
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
}: Props) {
  const { tag, studentPercent, note } = content;
  const hasNote = typeof note === "string" && note.trim().length > 0;

  if (isInlineChoiceEmpty(content, isSelected)) return null;

  return (
    <div className="mt-2.5">
      {/* Tag, percentage, and the student's own pick. Any of these may be absent. */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
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

      {/* No note means nothing here. The absence is the honest render. */}
      {hasNote && (
        <div
          className={cn(
            // A left rule in the choice's own colour anchors the prose to the
            // choice it belongs to. Without it, five explanations down a page
            // read as one undifferentiated column of text.
            "mt-2 border-l-2 pl-3",
            isCorrect ? "border-green-600/50" : "border-slate-300",
          )}
        >
          <p
            className={cn(
              "text-[12px] font-semibold uppercase tracking-wide",
              isCorrect ? "text-green-800" : "text-slate-500",
            )}
          >
            {isCorrect ? "Why this is correct" : "Why this is wrong"}
          </p>
          {/* Reading size, not caption size: this is the sentence the student
              is meant to actually read, and it carries the teaching. */}
          <p className="mt-1 whitespace-pre-line text-[15px] leading-7 text-slate-800">
            {note}
          </p>
        </div>
      )}
    </div>
  );
}
