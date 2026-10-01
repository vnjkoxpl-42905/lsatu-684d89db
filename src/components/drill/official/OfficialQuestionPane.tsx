import * as React from "react";
import { DrillSplit } from '@/components/drill/DrillSplit';
import { Check, Eye, EyeOff, Flag, X } from "lucide-react";
import { HighlightedText } from "@/components/drill/HighlightedText";
import InlineChoiceExplanation, {
  ChoiceNoteToggle,
  hasChoiceNoteProse,
  type InlineChoiceNotes,
} from "@/components/drill/official/InlineChoiceExplanation";
import {
  choiceSection,
  type Highlight,
  type HighlightMode,
  type HighlightRegion,
} from "@/lib/highlightUtils";
import { cn } from "@/lib/utils";
import { useDeferredPick } from "@/hooks/useDeferredPick";
import { ScrollMoreCue } from "./ScrollMoreCue";

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
   * Per-choice explanation content (the Choice Notes), rendered inline beneath
   * each choice whenever it is present. Omit it entirely (section mode, or
   * while Explanation is off) and no inline layer renders at all. Independent
   * of `answerRevealed`: colour is the Answer pill's job, notes are
   * Explanation's.
   */
  inlineNotes?: InlineChoiceNotes | null;
  /**
   * Choice Notes as expanders (LSAT Lab's shape): every note starts closed
   * behind a chevron at the right edge of its card, and the student opens
   * them one at a time. Off (default), the prose shows outright, which is
   * what the review walk and the classroom modal still expect.
   */
  choiceNoteExpanders?: boolean;
  /**
   * Choices stay clickable after the answer is revealed. Off (default), a
   * reveal locks the choices, which is the legacy one-way behaviour.
   */
  choicesStayLive?: boolean;
  /**
   * Everything is disabled while the runner persists a pick and moves on, so
   * the committed pick can never differ from the one on screen.
   */
  interactionLocked?: boolean;
  /**
   * Reset Response: clears the pick. Rendered only when present, as a ghost
   * button under the choices, disabled with nothing picked.
   */
  onResetResponse?: () => void;
  /**
   * Rendered under the stimulus, in the same column. The Argument Breakdown
   * goes here while Explanation is on. The stimulus block itself keeps every
   * class and style it has; this slot is a sibling below it.
   */
  belowStimulus?: React.ReactNode;
  highlights: Highlight[];
  highlightMode: HighlightMode;
  searchTerm?: string;
  fontScale?: number;
  onAnswerSelect: (key: string) => void;
  onEliminate: (key: string) => void;
  onToggleFlag: () => void;
  /**
   * Called on every mouse-up in the pane with every highlightable block on
   * screen: the stimulus, the stem, and each answer choice. The handler
   * clips the live selection to each block, so one drag can mark several.
   * Returns true when it consumed the selection as a highlight.
   */
  onTextSelection: (regions: HighlightRegion[]) => boolean | void;
  onHighlightClick: (highlightId: string) => void;
  /**
   * Rendered between the stem and the choices. Blind review puts its Actual/BR
   * tabs here so it can run inside this exact pane rather than reimplementing
   * the exam screen a second time in a different visual language.
   */
  aboveChoices?: React.ReactNode;
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
  highlights,
  highlightMode,
  searchTerm,
  fontScale = 1,
  onAnswerSelect,
  onEliminate,
  onToggleFlag,
  onTextSelection,
  onHighlightClick,
  aboveChoices,
  choiceNoteExpanders = false,
  choicesStayLive = false,
  interactionLocked = false,
  onResetResponse,
  belowStimulus,
}: Props) {
  // Which Choice Notes are open. Empty whenever the notes arrive or the
  // question changes: pressing Explanation shows the chevrons, not the prose.
  const [openLetters, setOpenLetters] = React.useState<Set<string>>(() => new Set());
  const notesPresent = inlineNotes != null;
  React.useEffect(() => {
    setOpenLetters(new Set());
  }, [notesPresent, question.qid]);
  const toggleLetter = (key: string) =>
    setOpenLetters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const stimulusHighlights = highlights.filter((h) => h.section === "stimulus");
  const stemHighlights = highlights.filter((h) => h.section === "stem");
  const stimulusText = stripDataArtifacts(question.stimulus);
  const stemText = stripDataArtifacts(question.questionStem);
  const answerEntries = Object.entries(question.answerChoices).map(([key, text]) => [
    key,
    cleanAnswerChoice(key, text),
  ] as const);
  const highlightsForChoice = (key: string) =>
    highlights.filter((h) => h.section === choiceSection(key));

  const stimulusRef = React.useRef<HTMLDivElement | null>(null);
  const stemRef = React.useRef<HTMLDivElement | null>(null);
  // The two scrolling columns. The screen is pinned to the viewport, so a
  // question longer than its column scrolls inside it, and each column shows a
  // "More below" cue while anything is still out of sight.
  const stimulusColumnRef = React.useRef<HTMLDivElement | null>(null);
  const questionColumnRef = React.useRef<HTMLDivElement | null>(null);
  const choiceRefs = React.useRef(new Map<string, HTMLDivElement>());
  // Set on mouse-up when the drag was a marking gesture, read by the click
  // that follows it. A drag that ends on a choice must not also pick it.
  const markedRef = React.useRef(false);
  // Under a marker tool a pick waits a beat, so the first press of a
  // double-click on a word (which is marking, not answering) can be called
  // off by the second. With no tool active a click picks at once.
  const deferredPick = useDeferredPick();

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const dragged = !!selection && !selection.isCollapsed;
    const regions: HighlightRegion[] = [];
    if (stimulusRef.current) {
      regions.push({ section: "stimulus", container: stimulusRef.current, source: stimulusText });
    }
    if (stemRef.current) {
      regions.push({ section: "stem", container: stemRef.current, source: stemText });
    }
    for (const [key, text] of answerEntries) {
      const el = choiceRefs.current.get(key);
      if (el) regions.push({ section: choiceSection(key), container: el, source: text });
    }
    const marked = onTextSelection(regions);
    // With no tool active the selection is left alone; it still must not
    // read as a click on the choice it happened to end on.
    markedRef.current = dragged || !!marked;
    if (markedRef.current) deferredPick.cancel();
  };

  // 7Sage sets both the stimulus and the answer choices at 19px and the
  // student reads ours next to theirs, so the two match rather than land a
  // couple of pixels apart. The stimulus carries the extra weight of the serif
  // face; stem and choices stay on the sans stack at the same size.
  //
  // On a short screen 19px pushed choice D and E below the fold, so the size
  // steps down with viewport height and a full question fits without
  // scrolling or zooming. Tall screens still get the 7Sage 19px. The floor is
  // 16px: measured over all 3,965 LR questions, it took the ones that fit with
  // nothing hidden from 54% to 79% on a 1366x625 laptop (90% to 93% at
  // 1536x695). It depends on the window only, so every question on a given
  // screen reads at one size, and the student's own text size multiplies it.
  const baseSize = `calc(${fontScale} * clamp(16px, 2.2vh, 19px))`;
  const officialContentTextStyle: React.CSSProperties = {
    color: "#111827",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: baseSize,
    fontWeight: 400,
    lineHeight: 1.5,
  };
  const stimStyle: React.CSSProperties = {
    ...officialContentTextStyle,
    fontFamily: "Fraunces, ui-serif, Georgia, serif",
    fontSize: baseSize,
    lineHeight: 1.6,
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
  const choiceTextStyle: React.CSSProperties = { fontSize: baseSize };
  const choiceBadgeStyle: React.CSSProperties = { fontSize: `calc(${baseSize} * 0.78)` };

  return (
    <div
      className="relative flex flex-col flex-1 min-h-0 bg-white text-slate-950"
      onMouseUp={handleMouseUp}
    >
      <DrillSplit
        ratio="question-weighted"
        maxWidthClassName={null}
        left={
          // Stimulus column. The wrapper scrolls; the stimulus block keeps its
          // own padding, face and measure, and the Argument Breakdown sits
          // under it as a sibling rather than inside its serif/pre-wrap box.
          <div ref={stimulusColumnRef} className="flex min-h-0 flex-col overflow-y-auto lg:border-r border-slate-200">
          <div
            className={cn(
              "min-w-0 px-6 pt-3 pb-6 sm:pl-9 sm:pr-8 whitespace-pre-wrap",
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
            ref={stimulusRef}
          >
            <HighlightedText
              text={stimulusText}
              highlights={stimulusHighlights}
              onHighlightClick={onHighlightClick}
              eraserMode={highlightMode === "erase"}
              searchTerm={searchTerm}
            />
          </div>
          {belowStimulus && (
            <div className="mt-6 max-w-[60ch] whitespace-normal px-6 pb-7 font-sans sm:pl-9 sm:pr-8">
              {belowStimulus}
            </div>
          )}
          <ScrollMoreCue scrollRef={stimulusColumnRef} />
          </div>
        }
        right={
          // Question column
          <div ref={questionColumnRef} className="min-w-0 px-6 pt-3 pb-3 sm:pl-10 sm:pr-8 bg-white overflow-y-auto" style={stemStyle}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 flex items-start gap-2">
                <span className="font-bold tabular-nums shrink-0 min-w-[20px] text-slate-950">
                  {displayNumber}.
                </span>
                <div className="flex-1 text-slate-950" ref={stemRef}>
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

            {aboveChoices && <div className="mt-4">{aboveChoices}</div>}

            <ul className="mt-3 space-y-1">
              {answerEntries.map(([key, text]) => {
                const isSelected = selectedAnswer === key;
                const isEliminated = !isSelected && eliminatedAnswers.has(key);
                // Correctness is a fact; colouring is a state. The Choice Note
                // needs the fact (its tag chip goes green for the right letter
                // whether or not Answer is on); the card needs the state.
                const isCorrectFact = correctAnswer === key;
                const showCorrectColour = answerRevealed && isCorrectFact;
                // The choice they committed to, once it is known to be wrong.
                // Without this a wrong answer stayed the same neutral grey as an
                // unrevealed selection, so revealing said what was right without
                // ever saying what they did.
                const isWrongPick = answerRevealed && isSelected && !isCorrectFact;
                // The inline layer follows Explanation, not Answer.
                const inline = inlineNotes ? inlineNotes[key] ?? {} : undefined;
                const noteOpen = !choiceNoteExpanders || openLetters.has(key);
                const showNoteToggle = choiceNoteExpanders && !!inline && hasChoiceNoteProse(inline);
                const revealLocks = answerRevealed && !choicesStayLive;
                const locked = isEliminated || revealLocks || interactionLocked;
                const showVerdict = answerRevealed && (showCorrectColour || isWrongPick);
                // A verdict choice that is also crossed out still needs a way
                // back: Restore moves to the extra column as a real button.
                const showRestoreBeside = showVerdict && isEliminated && choicesStayLive;
                const choiceTextId = `choice-${question.qid}-${key}`;
                // Crossing out is a reading aid, never an answer change: the
                // chosen letter cannot be crossed out (and so hidden or
                // cleared) by it. A saved cross-out on the chosen letter is
                // ignored for display; other crossed-out choices can be restored.
                const crossOutBlocked = isSelected;

                return (
                  <li
                    key={key}
                    className={cn(
                      "group relative rounded-lg border transition-all duration-200",
                      "grid grid-cols-[auto_1fr_auto_auto] items-start gap-3 px-3 py-1.5",
                      showCorrectColour
                        ? "border-green-500 bg-green-50"
                        : isWrongPick
                        ? "border-red-500 bg-red-50"
                        : isSelected
                        ? "border-slate-500 bg-slate-100 shadow-sm"
                        : isEliminated
                        ? "border-transparent bg-white opacity-55 grayscale-[0.5]"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => !locked && onAnswerSelect(key)}
                      disabled={locked}
                      aria-describedby={choiceTextId}
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border font-semibold transition-all",
                        showCorrectColour
                          ? "border-green-600 bg-green-500 text-white"
                          : isWrongPick
                          ? "border-red-600 bg-red-500 text-white"
                          : isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-transparent text-slate-950 group-hover:border-slate-300",
                      )}
                      style={choiceBadgeStyle}
                    >
                      {key}
                    </button>
                    {/* The text is not a button: a browser will not start a
                        drag-selection inside one, which is what kept the
                        highlighter off the answer choices. A plain click here
                        still picks the choice; a drag that produced a
                        selection never does. The letter badge stays the
                        keyboard control and describes itself with this text. */}
                    <div
                      id={choiceTextId}
                      ref={(el) => {
                        if (el) choiceRefs.current.set(key, el);
                        else choiceRefs.current.delete(key);
                      }}
                      onClick={(event) => {
                        if (markedRef.current) {
                          markedRef.current = false;
                          return;
                        }
                        if (locked) return;
                        // A click on a highlight is aimed at the highlight
                        // (the eraser has just taken it), not at the answer.
                        const onHighlight = !!(event.target as HTMLElement).closest?.(
                          "[data-highlight-id]",
                        );
                        if (onHighlight && highlightMode === "erase") return;
                        if (highlightMode === "none" || highlightMode === "erase") {
                          onAnswerSelect(key);
                          return;
                        }
                        deferredPick.schedule(() => {
                          // The second press of a double-click marked a word
                          // in the meantime; that was never a pick.
                          if (markedRef.current) return;
                          onAnswerSelect(key);
                        });
                      }}
                      onDoubleClick={() => deferredPick.cancel()}
                      className={cn(
                        "text-left leading-normal transition-colors",
                        !locked && "cursor-pointer",
                        showCorrectColour
                          ? "text-green-900"
                          : isWrongPick
                          ? "text-red-900"
                          : isSelected
                          ? "text-slate-950"
                          : "text-slate-950 group-hover:text-slate-950",
                      )}
                      style={choiceTextStyle}
                    >
                      <HighlightedText
                        text={text}
                        highlights={highlightsForChoice(key)}
                        onHighlightClick={onHighlightClick}
                        eraserMode={highlightMode === "erase"}
                        searchTerm={searchTerm}
                        paragraphStyle={{ margin: 0, lineHeight: "inherit" }}
                      />
                    </div>
                    {showVerdict ? (
                      // Colour alone must never carry the verdict (ADR 0001), so
                      // the cross-out corner becomes the icon and the label.
                      <span
                        role="img"
                        aria-label={showCorrectColour ? "Correct answer" : "Your answer, incorrect"}
                        title={showCorrectColour ? "Correct answer" : "Your answer, incorrect"}
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center",
                          showCorrectColour ? "text-green-700" : "text-red-700",
                        )}
                      >
                        {showCorrectColour ? <Check size={18} /> : <X size={18} />}
                      </span>
                    ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!revealLocks && !interactionLocked && !crossOutBlocked) onEliminate(key);
                      }}
                      disabled={revealLocks || interactionLocked || crossOutBlocked}
                      // A screen reader announced this as an unlabelled button.
                      // RC's equivalent has carried both of these since it was
                      // written; this is LR catching up to it.
                      aria-label={
                        isEliminated
                          ? `Restore choice ${key}`
                          : crossOutBlocked
                          ? `Choice ${key} is your answer and cannot be crossed out`
                          : `Cross out choice ${key}`
                      }
                      title={isEliminated ? "Restore" : crossOutBlocked ? "Your answer" : "Cross out"}
                      className={cn(
                        "mt-0.5 p-1 transition-opacity",
                        isEliminated
                          ? "text-slate-700"
                          : "text-slate-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:text-slate-800 disabled:hover:text-slate-400",
                      )}
                    >
                      {isEliminated ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    )}
                    {/* Fourth column: the Choice Note expander and, when a
                        verdict choice is also crossed out, a real Restore. */}
                    {(showRestoreBeside || showNoteToggle) ? (
                      <div className="flex items-start gap-1">
                        {showRestoreBeside && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEliminate(key);
                            }}
                            disabled={interactionLocked}
                            aria-label={`Restore choice ${key}`}
                            title="Restore"
                            className="mt-0.5 p-1 text-slate-700 transition-opacity hover:text-slate-900 disabled:opacity-40"
                          >
                            <EyeOff size={16} />
                          </button>
                        )}
                        {showNoteToggle && (
                          <ChoiceNoteToggle
                            letter={key}
                            open={openLetters.has(key)}
                            onToggle={() => toggleLetter(key)}
                            disabled={interactionLocked}
                          />
                        )}
                      </div>
                    ) : (
                      <span aria-hidden className="w-0" />
                    )}
                    {inline && (
                      <div className="col-start-2 col-end-5">
                        <InlineChoiceExplanation
                          letter={key}
                          isCorrect={isCorrectFact}
                          isSelected={isSelected}
                          content={inline}
                          open={noteOpen}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {onResetResponse && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={onResetResponse}
                  disabled={!selectedAnswer || interactionLocked}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reset Response
                </button>
              </div>
            )}
            <ScrollMoreCue scrollRef={questionColumnRef} />
          </div>
        }
      />
    </div>
  );
}
