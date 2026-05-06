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
  /** 1-based display index when qnum is missing (falls back to currentIndex+1). */
  displayNumber: number;
  selectedAnswer: string;
  eliminatedAnswers: Set<string>;
  isFlagged: boolean;
  highlights: Highlight[];
  highlightMode: "none" | "yellow" | "pink" | "orange" | "underline" | "erase";
  onAnswerSelect: (key: string) => void;
  onEliminate: (key: string) => void;
  onToggleFlag: () => void;
  onTextSelection: (e: React.MouseEvent<HTMLDivElement>, section: "stimulus" | "stem") => void;
  onHighlightClick: (highlightId: string) => void;
}

/**
 * Two-column body inside the official testing frame.
 * Left: stimulus. Right: question number + flag + stem + answer choices.
 *
 * Uses the existing <HighlightedText> so highlight rendering, text selection,
 * and click-to-erase all stay byte-identical to the default layout.
 */
export default function OfficialQuestionPane({
  question,
  displayNumber,
  selectedAnswer,
  eliminatedAnswers,
  isFlagged,
  highlights,
  highlightMode,
  onAnswerSelect,
  onEliminate,
  onToggleFlag,
  onTextSelection,
  onHighlightClick,
}: Props) {
  const stimulusHighlights = highlights.filter((h) => h.section === "stimulus");
  const stemHighlights = highlights.filter((h) => h.section === "stem");
  const answerEntries = Object.entries(question.answerChoices);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[420px]">
      {/* Stimulus column */}
      <div
        className="px-6 sm:px-8 py-6 lg:border-r border-slate-200 text-[15px] leading-[1.55] text-black whitespace-pre-wrap"
        onMouseUp={(e) => onTextSelection(e, "stimulus")}
      >
        <HighlightedText
          text={question.stimulus}
          highlights={stimulusHighlights}
          onHighlightClick={onHighlightClick}
          eraserMode={highlightMode === "erase"}
        />
      </div>

      {/* Question column */}
      <div className="px-6 sm:px-8 py-6 text-[15px] leading-[1.55] text-black">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div
            className="flex-1 flex items-start gap-2"
            onMouseUp={(e) => onTextSelection(e, "stem")}
          >
            <span className="font-bold tabular-nums shrink-0 min-w-[18px]">
              {displayNumber}.
            </span>
            <div className="flex-1">
              <HighlightedText
                text={question.questionStem}
                highlights={stemHighlights}
                onHighlightClick={onHighlightClick}
                eraserMode={highlightMode === "erase"}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleFlag}
            aria-pressed={isFlagged}
            aria-label={isFlagged ? "Remove flag" : "Flag question"}
            title={isFlagged ? "Remove flag" : "Flag question"}
            className="shrink-0 p-1 rounded hover:bg-slate-100 transition-colors"
          >
            <Flag
              className={cn(
                "w-5 h-5 transition-colors",
                isFlagged ? "text-blue-600 fill-blue-600" : "text-blue-600",
              )}
            />
          </button>
        </div>

        <ul className="space-y-5 mt-5">
          {answerEntries.map(([key, text]) => {
            const isSelected = selectedAnswer === key;
            const isEliminated = eliminatedAnswers.has(key);
            return (
              <li
                key={key}
                className={cn(
                  "flex items-start gap-4 group",
                  isEliminated && "opacity-50",
                )}
              >
                <button
                  type="button"
                  onClick={() => !isEliminated && onAnswerSelect(key)}
                  disabled={isEliminated}
                  aria-pressed={isSelected}
                  aria-label={`Choice ${key}`}
                  className={cn(
                    "shrink-0 w-7 h-7 mt-0.5 rounded-full border flex items-center justify-center text-[13px] font-medium transition-colors",
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-400 bg-white text-slate-700 hover:border-slate-700",
                    isEliminated && "cursor-not-allowed",
                  )}
                >
                  {key}
                </button>
                <button
                  type="button"
                  onClick={() => !isEliminated && onAnswerSelect(key)}
                  disabled={isEliminated}
                  className={cn(
                    "flex-1 text-left text-[15px] leading-[1.6] pt-0.5",
                    isEliminated && "line-through cursor-not-allowed",
                  )}
                >
                  {text}
                </button>
                <button
                  type="button"
                  onClick={() => onEliminate(key)}
                  aria-pressed={isEliminated}
                  aria-label={isEliminated ? `Restore choice ${key}` : `Eliminate choice ${key}`}
                  title={isEliminated ? `Restore choice ${key}` : `Eliminate choice ${key}`}
                  className="shrink-0 p-1 mt-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
