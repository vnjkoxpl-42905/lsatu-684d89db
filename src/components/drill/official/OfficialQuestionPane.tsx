import * as React from "react";
import { Eye, EyeOff, Flag } from "lucide-react";
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

function stripDataArtifacts(text: string): string {
  return text
    .replace(/\s*\{#\d+\}\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function cleanAnswerChoice(key: string, text: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return stripDataArtifacts(text)
    .replace(new RegExp(`^\\s*[-–—]?\\s*\\[${escapedKey}\\]\\s*`, "i"), "")
    .replace(new RegExp(`^\\s*[-–—]?\\s*\\(${escapedKey}\\)\\s*`, "i"), "")
    .replace(new RegExp(`^\\s*[-–—]?\\s*${escapedKey}[.)]\\s*`, "i"), "")
    .trim();
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
  const stimulusText = stripDataArtifacts(question.stimulus);
  const stemText = stripDataArtifacts(question.questionStem);
  const answerEntries = Object.entries(question.answerChoices).map(([key, text]) => [
    key,
    cleanAnswerChoice(key, text),
  ] as const);

  const baseSize = 17 * fontScale;
  const answerSize = 16 * fontScale;
  // Reading-optimized leading scales with Aa so size + line-height move together.
  const stimLeading =
    fontScale <= 0.95 ? 1.5 : fontScale <= 1.05 ? 1.6 : fontScale <= 1.2 ? 1.7 : 1.8;
  const stimStyle: React.CSSProperties = { fontSize: `${baseSize}px`, lineHeight: stimLeading };
  const stemStyle: React.CSSProperties = { fontSize: `${baseSize}px`, lineHeight: 1.65 };
  const answerTextStyle: React.CSSProperties = { fontSize: `${answerSize}px`, lineHeight: 1.55 };

  return (
    <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,48fr)_minmax(0,52fr)]">
      {/* Stimulus column */}
      <div
        className={cn(
          "min-w-0 px-6 py-7 sm:pl-9 sm:pr-8 lg:border-r border-slate-200 text-black whitespace-pre-wrap",
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
          text={stimulusText}
          highlights={stimulusHighlights}
          onHighlightClick={onHighlightClick}
          eraserMode={highlightMode === "erase"}
          searchTerm={searchTerm}
        />
      </div>

      {/* Question column */}
      <div className="min-w-0 px-6 py-7 sm:pl-10 sm:pr-8 text-black" style={stemStyle}>
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex-1 flex items-start gap-2"
            onMouseUp={(e) => onTextSelection(e, "stem")}
          >
            <span className="font-bold tabular-nums shrink-0 min-w-[20px]">
              {displayNumber}.
            </span>
            <div className="flex-1">
              <HighlightedText
                text={stemText}
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

        <ul className="mt-6 space-y-3.5">
          {answerEntries.map(([key, text]) => {
            const isSelected = selectedAnswer === key;
            const isEliminated = eliminatedAnswers.has(key);
            const isCorrect = answerRevealed && correctAnswer === key;
            const isWrongSelected = answerRevealed && isSelected && correctAnswer !== key;
            return (
              <li
                key={key}
                className={cn(
                  "grid grid-cols-[34px_minmax(0,1fr)_28px] items-start gap-4 group rounded-md transition-colors",
                  // Reserve consistent padding so revealing answers (which adds a
                  // ring) does not shift the row position.
                  "px-1 py-1.5 ring-2 ring-transparent",
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
                    "relative shrink-0 mt-0.5 rounded-full border-[2px] flex items-center justify-center text-[14px] font-semibold transition-colors",
                    "w-[34px] h-[34px] text-[13px]",
                    isCorrect
                      ? "border-green-700 bg-green-600 text-white"
                      : isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : isEliminated && !answerRevealed
                      ? "border-slate-500 bg-white text-slate-500"
                      : "border-slate-800 bg-white text-slate-900 hover:border-slate-900",
                    isEliminated && !answerRevealed && "cursor-not-allowed",
                  )}
                >
                  {key}
                  {isEliminated && !answerRevealed && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-[42px] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] rounded-full bg-slate-500"
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                  disabled={isEliminated || answerRevealed}
                  className={cn(
                    "min-w-0 text-left pt-0.5 whitespace-normal transition-colors",
                    isEliminated && !answerRevealed && "cursor-not-allowed text-slate-400",
                    isCorrect && "font-semibold text-green-900",
                  )}
                  style={answerTextStyle}
                >
                  {text}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!answerRevealed) onEliminate(key);
                  }}
                  disabled={answerRevealed}
                  aria-pressed={isEliminated}
                  aria-label={isEliminated ? `Restore choice ${key}` : `Eliminate choice ${key}`}
                  title={isEliminated ? `Restore choice ${key}` : `Eliminate choice ${key}`}
                  className={cn(
                    "shrink-0 p-1 mt-0.5 rounded transition-colors disabled:opacity-50",
                    isEliminated && !answerRevealed
                      ? "text-slate-400 hover:text-slate-600"
                      : "text-neutral-500 hover:text-neutral-700",
                  )}
                >
                  {isEliminated && !answerRevealed ? (
                    <EyeOff className="w-[20px] h-[20px]" strokeWidth={2.25} />
                  ) : (
                    <Eye className="w-[20px] h-[20px]" strokeWidth={2.25} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
