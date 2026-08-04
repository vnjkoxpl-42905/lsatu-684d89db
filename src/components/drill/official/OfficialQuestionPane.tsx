import * as React from "react";
import { Eye, EyeOff, Flag } from "lucide-react";
import { HighlightedText } from "@/components/drill/HighlightedText";
import InlineChoiceExplanation, {
  type InlineChoiceNotes,
} from "@/components/drill/official/InlineChoiceExplanation";
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
  /**
   * Per-choice explanation content, rendered inline beneath each choice once
   * the answer is revealed. Omit it entirely (section mode, or before reveal)
   * and no inline layer renders at all.
   */
  inlineNotes?: InlineChoiceNotes | null;
  /** Letters whose disclosure is currently open. See `useInlineDisclosures`. */
  openInlineLetters?: Set<string>;
  onToggleInlineLetter?: (letter: string) => void;
  highlights: Highlight[];
  highlightMode: "none" | "yellow" | "pink" | "orange" | "underline" | "erase";
  searchTerm?: string;
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
  inlineNotes,
  openInlineLetters,
  onToggleInlineLetter,
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

  const baseSize = 16 * fontScale;
  const officialContentTextStyle: React.CSSProperties = {
    color: "#111827",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: `${baseSize}px`,
    fontWeight: 400,
    lineHeight: 1.6,
  };
  const stimStyle: React.CSSProperties = {
    ...officialContentTextStyle,
    fontFamily: "Fraunces, ui-serif, Georgia, serif",
    fontSize: `${17 * fontScale}px`,
    lineHeight: 1.7,
    // Fraunces is a variable font with an optical-size axis. Left on `auto` the
    // browser picks the cut from the rendered px size, which drifts as the
    // student changes fontScale. Pin it to the text-optimised end so hairlines
    // stay the same weight at every scale.
    fontOpticalSizing: "none",
    fontVariationSettings: '"opsz" 14',
  };
  const stemStyle: React.CSSProperties = officialContentTextStyle;
  // The answer-choice text and letter badges used Tailwind's `text-sm`/`text-xs`,
  // which are hard px values and silently overrode the inherited scaled size —
  // so fontScale grew the stimulus and stem while the answers stayed at 14px.
  const choiceTextStyle: React.CSSProperties = { fontSize: `${baseSize}px` };
  const choiceBadgeStyle: React.CSSProperties = { fontSize: `${baseSize * 0.78}px` };

  return (
    <div className="relative flex flex-col h-full bg-white text-slate-950">
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(0,53fr)_minmax(0,47fr)] overflow-hidden">
        {/* Stimulus column */}
        <div
          className={cn(
            "min-w-0 px-6 pt-6 pb-7 sm:pl-9 sm:pr-8 lg:border-r border-slate-200 whitespace-pre-wrap overflow-y-auto",
            // Cap the reading measure. The frame is max-w-[1400px] and this column
            // takes 53fr of it, which ran ~100 characters per line — well past the
            // 45-75 readable band. `ch` is the width of "0", which is narrow in
            // Fraunces, so 52ch measures out to ~68 real characters.
            "[&>*]:max-w-[52ch]",
            // Fraunces is high-contrast; grayscale smoothing thins its hairlines.
            "subpixel-antialiased",
            "selection:bg-blue-100 selection:text-slate-950",
            "[&_p]:mb-4 [&_p:last-child]:mb-0",
            "bg-white",
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
        <div className="min-w-0 px-6 py-7 sm:pl-10 sm:pr-8 bg-white overflow-y-auto" style={stemStyle}>
          <div className="flex items-start justify-between gap-3">
            <div
              className="flex-1 flex items-start gap-2"
              onMouseUp={(e) => onTextSelection(e, "stem")}
            >
              <span className="font-bold tabular-nums shrink-0 min-w-[20px] text-slate-950">
                {displayNumber}.
              </span>
              <div className="flex-1 text-slate-950">
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
                isFlagged ? "bg-amber-100" : "hover:bg-slate-100",
              )}
            >
              <Flag
                className={cn(
                  "w-[24px] h-[24px] transition-colors text-slate-950",
                  isFlagged && "fill-amber-400",
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
              // The inline layer only ever appears once the answer is revealed.
              const inline =
                answerRevealed && inlineNotes ? inlineNotes[key] ?? {} : undefined;

              return (
                <li
                  key={key}
                  className={cn(
                    "group relative rounded-lg border transition-all duration-200",
                    "grid grid-cols-[auto_1fr_auto] items-start gap-3 p-3",
                    isCorrect
                      ? "border-green-500 bg-green-50"
                      : isSelected
                      ? "border-slate-500 bg-slate-100 shadow-sm"
                      : isEliminated
                      ? "border-transparent bg-white opacity-55 grayscale-[0.5]"
                      : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                    disabled={isEliminated || answerRevealed}
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border font-semibold transition-all",
                      isCorrect
                        ? "border-green-600 bg-green-500 text-white"
                        : isSelected
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-transparent text-slate-950 group-hover:border-slate-300",
                    )}
                    style={choiceBadgeStyle}
                  >
                    {key}
                  </button>
                  <button
                    type="button"
                    onClick={() => !isEliminated && !answerRevealed && onAnswerSelect(key)}
                    disabled={isEliminated || answerRevealed}
                    className={cn(
                      "text-left leading-relaxed transition-colors",
                      isCorrect
                        ? "text-green-900"
                        : isSelected
                        ? "text-slate-950"
                        : "text-slate-950 group-hover:text-slate-950",
                    )}
                    style={choiceTextStyle}
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
                      isEliminated ? "text-slate-700" : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-slate-800",
                    )}
                  >
                    {isEliminated ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {inline && (
                    <div className="col-start-2 col-end-4">
                      <InlineChoiceExplanation
                        letter={key}
                        isCorrect={isCorrect}
                        isSelected={isSelected}
                        content={inline}
                        open={!!openInlineLetters?.has(key)}
                        onToggle={(letter) => onToggleInlineLetter?.(letter)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
