import * as React from "react";
import { Eye, Flag } from "lucide-react";
import { HighlightedText } from "@/components/drill/HighlightedText";
import type { Highlight } from "@/lib/highlightUtils";
import { cn } from "@/lib/utils";

interface Question {
  qid: string;
  qnum?: number | string;
  stimulus: string;
  questionStem: string;
  answerChoices: Record<string, string>;
}

interface Props {
  question: Question;
  displayNumber: number;
  selectedAnswer: string;
  eliminatedAnswers: Set<string>;
  isFlagged: boolean;
  /** When true, reveal correct/incorrect styling on answer choices. */
  answerRevealed?: boolean;
  /** Correct answer key (e.g. "B"). Required when answerRevealed=true. */
  correctAnswer?: string;
  highlights: Highlight[];
  highlightMode: "none" | "yellow" | "pink" | "orange" | "underline" | "erase";
  /** Find Text term — overlaid as a search highlight (does not mutate user highlights). */
  searchTerm?: string;
  /** Font scale multiplier (1.0 = default). Applies to stimulus, stem, and answer text only. */
  fontScale?: number;
  onAnswerSelect: (key: string) => void;
  onEliminate: (key: string) => void;
  onToggleFlag: () => void;
  onTextSelection: (e: React.MouseEvent<HTMLDivElement>, section: "stimulus" | "stem") => void;
  onHighlightClick: (highlightId: string) => void;
}

export default function OfficialQuestionPane({
  question,
  displayNumber,
  selectedAnswer,
  eliminatedAnswers,
  isFlagged,
  answerRevealed = false,
  correctAnswer,
  highlights,
  highlightMode,
  searchTerm,
  fontScale = 1,
  onAnswerSelect,
  onEliminate,
  onToggleFlag,
  onTextSelection,
  onHighlightClick,
}: Props) {
  const stimulusHighlights = highlights.filter((h) => h.section === "stimulus");
  const stemHighlights = highlights.filter((h) => h.section === "stem");
  const answerEntries = Object.entries(question.answerChoices);

  const baseSize = 17 * fontScale;
  const answerSize = 16 * fontScale;
  // Reading-optimized leading scales with Aa so size + line-height move together.
  const stimLeading =
    fontScale <= 0.95 ? 1.6 : fontScale <= 1.05 ? 1.75 : fontScale <= 1.2 ? 1.85 : 1.9;
  const stimStyle: React.CSSProperties = { fontSize: `${baseSize}px`, lineHeight: stimLeading };
  const stemStyle: React.CSSProperties = { fontSize: `${baseSize}px`, lineHeight: 1.65 };
  const answerTextStyle: React.CSSProperties = { fontSize: `${answerSize}px`, lineHeight: 1.55 };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.14fr_0.96fr] flex-1">
      {/* Stimulus column */}
      <div
        className={cn(
          "px-9 pt-5 pb-8 lg:border-r border-slate-200 text-black whitespace-pre-wrap",
          // Reading-optimized typography for every question.
          "antialiased",
          "selection:bg-transparent selection:text-foreground",
          // HighlightedText already splits on \n\n and emits <p data-para-start=…>
          // so selection capture and highlight offsets stay paragraph-aware.
          // Add paragraph spacing here; defeat the legacy inline lineHeight on
          // those <p> elements so the container's scaling leading wins.
          "[&_p]:mb-4 [&_p:last-child]:mb-0",
          "[&_p]:!leading-[inherit]",
        )}
        style={stimStyle}
        onMouseUp={(e) => onTextSelection(e, "stimulus")}
      >
        <HighlightedText
          text={question.stimulus}
          highlights={stimulusHighlights}
          onHighlightClick={onHighlightClick}
          eraserMode={highlightMode === "erase"}
          searchTerm={searchTerm}
        />
      </div>

      {/* Question column */}
      <div className="px-9 pt-5 pb-8 text-black" style={stemStyle}>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div
            className="flex-1 flex items-start gap-2"
            onMouseUp={(e) => onTextSelection(e, "stem")}
          >
            <span className="font-bold tabular-nums shrink-0 min-w-[20px]">
              {displayNumber}.
            </span>
            <div className="flex-1">
              <HighlightedText
                text={question.questionStem}
                highlights={stemHighlights}
                onHighlightClick={onHighlightClick}
                eraserMode={highlightMode === "erase"}
                searchTerm={searchTerm}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleFlag}
            aria-pressed={isFlagged}
            aria-label={isFlagged ? "Remove flag" : "Flag question"}
            title={isFlagged ? "Remove flag" : "Flag question"}
            className={cn(
              "shrink-0 p-1.5 rounded transition-colors",
              isFlagged ? "bg-blue-100" : "hover:bg-slate-100",
            )}
          >
            <Flag
              className={cn(
                "w-[24px] h-[24px] transition-colors text-[#1d4ed8]",
                isFlagged && "fill-[#1d4ed8]",
              )}
              strokeWidth={2}
            />
          </button>
        </div>

        <ul className="space-y-4 mt-4">
          {answerEntries.map(([key, text]) => {
            const isSelected = selectedAnswer === key;
            const isEliminated = eliminatedAnswers.has(key);
            const isCorrect = answerRevealed && correctAnswer === key;
            const isWrongSelected = answerRevealed && isSelected && correctAnswer !== key;
            return (
              <li
                key={key}
                className={cn(
                  "flex items-start gap-3 group rounded-md transition-colors",
                  // Reserve consistent padding so revealing answers (which adds a
                  // ring) does not shift the row position.
                  "px-1 py-1 ring-2 ring-transparent",
                  isEliminated && !answerRevealed && "opacity-50",
                  isCorrect && "bg-green-50 ring-green-500",
                  isWrongSelected && "ring-red-500",
                )}
              >
                <button
                  type="button"
                  onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                  disabled={isEliminated || answerRevealed}
                  aria-pressed={isSelected}
                  aria-label={`Choice ${key}`}
                  className={cn(
                    "shrink-0 mt-0.5 rounded-full border-[2px] flex items-center justify-center text-[14px] font-semibold transition-colors",
                    "w-[34px] h-[34px] text-[13px]",
                    isCorrect
                      ? "border-green-700 bg-green-600 text-white"
                      : isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-800 bg-white text-slate-900 hover:border-slate-900",
                    isEliminated && !answerRevealed && "cursor-not-allowed",
                  )}
                >
                  {key}
                </button>
                <button
                  type="button"
                  onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                  disabled={isEliminated || answerRevealed}
                  className={cn(
                    "flex-1 text-left pt-0.5",
                    isEliminated && !answerRevealed && "line-through cursor-not-allowed",
                    isCorrect && "font-semibold text-green-900",
                  )}
                  style={answerTextStyle}
                >
                  {text}
                </button>
                <button
                  type="button"
                  onClick={() => !answerRevealed && onEliminate(key)}
                  disabled={answerRevealed}
                  aria-pressed={isEliminated}
                  aria-label={isEliminated ? `Restore choice ${key}` : `Eliminate choice ${key}`}
                  title={isEliminated ? `Restore choice ${key}` : `Eliminate choice ${key}`}
                  className="shrink-0 p-1 mt-0.5 text-neutral-500 hover:text-neutral-700 rounded transition-colors disabled:opacity-50"
                >
                  <Eye className="w-[20px] h-[20px]" strokeWidth={2.25} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
