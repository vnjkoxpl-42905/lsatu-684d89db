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
  answerRevealed?: boolean;
  correctAnswer?: string;
  highlights: Highlight[];
  highlightMode: "none" | "yellow" | "pink" | "orange" | "underline" | "erase";
  searchTerm?: string;
  fontScale?: number;
  onAnswerSelect: (key: string) => void;
  onEliminate: (key: string) => void;
  onToggleFlag: () => void;
  onTextSelection: (e: React.MouseEvent<HTMLDivElement>, section: "stimulus" | "stem") => void;
  onHighlightClick: (highlightId: string) => void;
  onNext?: () => void;
  /** Hide the "STIMULUS" column heading (used by Main Conclusion Practice). */
  hideStimulusLabel?: boolean;
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
  onNext,
  hideStimulusLabel = false,
}: Props) {
  const stimulusHighlights = highlights.filter((h) => h.section === "stimulus");
  const stemHighlights = highlights.filter((h) => h.section === "stem");
  const stimulusText = stripDataArtifacts(question.stimulus);
  const stemText = stripDataArtifacts(question.questionStem);
  const answerEntries = Object.entries(question.answerChoices).map(([key, text]) => [
    key,
    cleanAnswerChoice(key, text),
  ] as const);

  const baseSize = 14 * fontScale;
  const officialContentTextStyle: React.CSSProperties = {
    color: "var(--ink-bright)",
    fontFamily: "Outfit, Inter, system-ui, sans-serif",
    fontSize: `${baseSize}px`,
    fontWeight: 400,
    lineHeight: 1.6,
  };
  const stimStyle: React.CSSProperties = {
    ...officialContentTextStyle,
    fontFamily: "Fraunces, ui-serif, Georgia, serif",
    fontSize: `${15 * fontScale}px`,
    lineHeight: 1.7,
  };
  const stemStyle: React.CSSProperties = officialContentTextStyle;

  return (
    <div className="flex flex-col h-full bg-bg-shadow">
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)] overflow-hidden">
        {/* Stimulus column */}
        <div
          className={cn(
            "min-w-0 px-6 py-7 sm:pl-9 sm:pr-8 lg:border-r border-white/5 whitespace-pre-wrap overflow-y-auto",
            "antialiased",
            "selection:bg-aspiring-gold selection:text-bg-shadow",
            "[&_p]:mb-4 [&_p:last-child]:mb-0",
            "bg-gradient-to-br from-white/[0.02] to-transparent",
          )}
          style={stimStyle}
          onMouseUp={(e) => onTextSelection(e, "stimulus")}
        >
          {!hideStimulusLabel && (
            <h2 className="text-xs font-bold tracking-widest text-ink-faint mb-4 uppercase">Stimulus</h2>
          )}
          <HighlightedText
            text={stimulusText}
            highlights={stimulusHighlights}
            onHighlightClick={onHighlightClick}
            eraserMode={highlightMode === "erase"}
            searchTerm={searchTerm}
          />
        </div>

        {/* Question column */}
        <div className="min-w-0 px-6 py-7 sm:pl-10 sm:pr-8 bg-bg-night overflow-y-auto" style={stemStyle}>
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex-1 flex items-start gap-2"
              onMouseUp={(e) => onTextSelection(e, "stem")}
            >
              <span className="font-bold tabular-nums shrink-0 min-w-[20px] text-aspiring-gold">
                {displayNumber}.
              </span>
              <div className="flex-1 text-ink-bright">
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
                isFlagged ? "bg-aspiring-gold/20" : "hover:bg-white/5",
              )}
            >
              <Flag
                className={cn(
                  "w-[24px] h-[24px] transition-colors text-aspiring-gold",
                  isFlagged && "fill-aspiring-gold",
                )}
                strokeWidth={2}
              />
            </button>
          </div>

          <ul className="mt-4 space-y-3.5">
            {answerEntries.map(([key, text]) => {
              const isSelected = selectedAnswer === key;
              const isEliminated = eliminatedAnswers.has(key);
              const isCorrect = answerRevealed && correctAnswer === key;

              return (
                <li
                  key={key}
                  className={cn(
                    "group relative rounded-lg border transition-all duration-200",
                    "grid grid-cols-[auto_1fr_auto] items-start gap-3 p-3",
                    isCorrect
                      ? "border-green-500/50 bg-green-500/10"
                      : isSelected
                      ? "border-aspiring-gold bg-surface-elev shadow-lg"
                      : isEliminated
                      ? "border-white/5 bg-surface/50 opacity-60 grayscale-[0.5]"
                      : "border-white/5 bg-surface hover:border-white/10 hover:shadow-md",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                    disabled={isEliminated || answerRevealed}
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-semibold transition-all",
                      isCorrect
                        ? "border-green-500 bg-green-500 text-bg-shadow"
                        : isSelected
                        ? "border-aspiring-gold bg-aspiring-gold text-bg-shadow"
                        : "border-white/20 text-ink-soft group-hover:border-white/40",
                    )}
                  >
                    {key}
                  </button>
                  <button
                    type="button"
                    onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                    disabled={isEliminated || answerRevealed}
                    className={cn(
                      "text-left text-sm leading-relaxed transition-colors",
                      isCorrect ? "text-green-50" : isSelected ? "text-ink-bright" : "text-ink-soft group-hover:text-ink-bright",
                    )}
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
                    className={cn(
                      "mt-0.5 p-1 transition-opacity",
                      isEliminated ? "text-ink-bright" : "text-ink-faint opacity-0 group-hover:opacity-100 hover:text-ink-bright",
                    )}
                  >
                    {isEliminated ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-6 py-4 bg-bg-night border-t border-white/5 shrink-0">
        <button
          onClick={onNext}
          className="w-full py-4 text-center font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
        >
          NEXT QUESTION &gt;&gt;
        </button>
      </div>

      {/* Feedback area */}
      {answerRevealed && (
        <div className="px-6 py-4 bg-bg-shadow border-t border-white/10 shrink-0">
          <div className="text-sm text-ink-bright">
            <p className="font-semibold">{'>'} ANALYSIS VALID.</p>
          </div>
        </div>
      )}
    </div>
  );
}
