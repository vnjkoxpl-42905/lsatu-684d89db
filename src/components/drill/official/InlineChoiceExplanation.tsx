import * as React from "react";
import { BookOpen, CheckCircle2, ChevronDown, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import "./InlineChoiceExplanation.css";
import { NoteProse } from "./NoteProse";

/**
 * The Choice Note: the per-choice half of a Question Explanation, sitting
 * directly beneath an answer choice in `OfficialQuestionPane`.
 *
 * The prose is a dropdown, CLOSED by default, behind a chevron at the right
 * edge of the choice card (`ChoiceNoteToggle`, rendered by the pane in its
 * icon column). LSAT Lab's shape: pressing Explanation shows the expanders,
 * and the student opens the notes she wants one at a time rather than having
 * five explanations pop down at once. Before 2026-09-12 the prose was always
 * visible; that read well on a shared screen but buried the choices under
 * five paragraphs the moment Explanation went on.
 *
 * Two rules carried over from the retired `ExplanationPanel`, applied per
 * choice:
 *  - Never invent content. A missing tag, percentage, or note renders as
 *    absent. A choice with no note gets no chevron and no dropdown at all,
 *    not an empty one, not a placeholder. The header row (tag, percentage,
 *    "Your answer") still renders when any of those exists.
 *  - The source's nuance lives in the tag chip verbatim ("Too Weak", "Weakens,
 *    if anything"). The prose heading only says which way the choice went.
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
  /** Whether this letter is the correct answer: a fact, not a display state. */
  isCorrect: boolean;
  /** The student's own pick, marked so they can find it fast. */
  isSelected: boolean;
  content: InlineChoiceNote;
  /** The dropdown is open. Only meaningful when the note has prose. */
  open: boolean;
}

/** True when there is nothing real to render for this letter. */
export function isInlineChoiceEmpty(content: InlineChoiceNote | undefined, isSelected: boolean) {
  if (isSelected) return false;
  if (!content) return true;
  return !content.tag && content.studentPercent == null && !content.note;
}

/** True when the note has prose worth a chevron. Whitespace is not prose. */
export function hasChoiceNoteProse(content: InlineChoiceNote | undefined): boolean {
  return typeof content?.note === "string" && content.note.trim().length > 0;
}

/**
 * The expander at the right edge of the choice card. Lives in the pane's icon
 * column so it sits level with the choice text, exactly where LSAT Lab puts
 * it. Stops propagation: opening a note is never a pick.
 */
export function ChoiceNoteToggle({
  letter,
  open,
  onToggle,
  disabled,
  icon = "chevron",
}: {
  letter: string;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  icon?: "chevron" | "lightbulb";
}) {
  const label = open ? `Hide explanation for ${letter}` : `Show explanation for ${letter}`;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      disabled={disabled}
      aria-expanded={open}
      aria-label={label}
      title={label}
      className="choice-note-toggle"
    >
      {icon === "lightbulb" ? <Lightbulb size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
    </button>
  );
}

export default function InlineChoiceExplanation({
  letter,
  isCorrect,
  isSelected,
  content,
  open,
}: Props) {
  const { tag, studentPercent, note } = content;
  const hasNote = hasChoiceNoteProse(content);

  if (isInlineChoiceEmpty(content, isSelected)) return null;

  return (
    <div className="choice-note" data-choice-note={letter} data-correct={isCorrect}>
      {/* Tag, percentage, and the student's own pick. Any of these may be absent. */}
      <div className="choice-note__metadata">
        {tag && (
          <span
            className={cn(
              "choice-note__tag",
              isCorrect && "choice-note__tag--correct",
            )}
          >
            {tag}
          </span>
        )}
        {studentPercent != null && (
          <span className="choice-note__percent">{studentPercent}% of students</span>
        )}
        {isSelected && (
          <span className="choice-note__selection">
            Your answer
          </span>
        )}
      </div>

      {/* No note means nothing here. The absence is the honest render. */}
      {hasNote && open && (
        <div className="choice-note__panel">
          <p className="choice-note__heading">
            {isCorrect ? <CheckCircle2 size={17} aria-hidden="true" /> : <BookOpen size={17} aria-hidden="true" />}
            {isCorrect ? "Why this is correct" : "Why this is wrong"}
          </p>
          {/* Reading size, not caption size: this is the sentence the student
              is meant to actually read, and it carries the teaching. */}
          <NoteProse className="choice-note__prose" note={note ?? ""} />
        </div>
      )}
    </div>
  );
}
