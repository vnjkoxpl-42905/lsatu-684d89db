import * as React from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcMarkdown } from './RcMarkdown';
import { RcChoiceRow } from './RcChoiceRow';
import { RcChoiceDisclosure } from './RcChoiceDisclosure';
import { RcReviewLayer } from './RcReviewLayer';
import { RcSelectionPopover, type RcSelectionAnchor } from './RcSelectionPopover';
import { ScrollMoreCue } from '@/components/drill/official/ScrollMoreCue';
import type { RcTypeStyles } from './RcExamPane';
import { useRcMarkSurface, type RcMarkSurfaceHandle } from '../hooks/useRcMarkSurface';
import { paintRcAnnotations } from '../lib/rcHighlightPaint';
import type { RcSessionItem } from '../lib/rcSession';
import {
  questionTarget,
  type RcAnnotationKind,
  type RcHighlight,
  type RcHighlightColor,
  type RcHighlightMode,
  type RcHighlightTarget,
  type RcLetter,
} from '../lib/rcTypes';

interface Props {
  actorId?: string | null;
  choicesHidden?: boolean;
  trainingControls?: React.ReactNode;
  annotationsDisabled?: boolean;
  item: RcSessionItem;
  selected: RcLetter | null;
  eliminations: RcLetter[];
  revealed: boolean;
  /** State A of review: answer again before anything is shown. */
  reattemptMode: boolean;
  reattemptPick: RcLetter | null;
  flagged: boolean;
  onToggleFlag: () => void;
  onSelect: (letter: RcLetter) => void;
  interactionDisabled?: boolean;
  onToggleElimination: (letter: RcLetter) => void;
  onSkipToAnswer: () => void;
  type: RcTypeStyles;
  /** This passage's marks; the stem and each choice paint their own. */
  highlights: RcHighlight[];
  color: RcHighlightColor;
  onColorChange: (c: RcHighlightColor) => void;
  /** Active toolbar tool. 'none' hands the interaction to the popover. */
  highlightMode: RcHighlightMode;
  onAddHighlight: (
    target: RcHighlightTarget,
    start: number,
    end: number,
    color: RcHighlightColor,
    kind: RcAnnotationKind,
  ) => void;
  onRemoveHighlight: (target: RcHighlightTarget, offset: number) => void;
  onRemoveRange: (target: RcHighlightTarget, start: number, end: number) => void;
}

interface Popover {
  anchor: RcSelectionAnchor;
  /**
   * The surfaces that opened it, so its buttons act on the right text. One
   * drag from the stem into a choice is two surfaces, and Highlight paints
   * both; Remove only ever concerns the one mark that was clicked.
   */
  surfaces: RcMarkSurfaceHandle[];
}

export function RcQuestionPane({
  actorId,
  choicesHidden = false,
  trainingControls,
  item,
  selected,
  eliminations,
  revealed,
  reattemptMode,
  reattemptPick,
  flagged,
  onToggleFlag,
  onSelect,
  interactionDisabled = false,
  onToggleElimination,
  onSkipToAnswer,
  type,
  highlights,
  color,
  onColorChange,
  annotationsDisabled = false,
  highlightMode,
  onAddHighlight,
  onRemoveHighlight,
  onRemoveRange,
}: Props) {
  const { question } = item;
  const [openLetters, setOpenLetters] = React.useState<Set<string>>(() => new Set());

  const paneRef = React.useRef<HTMLDivElement>(null);
  const stemRef = React.useRef<HTMLDivElement>(null);
  // One popover for the pane. Its state is this pane's own: the passage pane
  // keeps its own, so a selection here never moves a popover there.
  const [popover, setPopover] = React.useState<Popover | null>(null);
  // Every surface reports after each mouse-up: an anchor when the selection
  // touched it, null when it did not. Surfaces with a slice join the popover;
  // the rest drop out of it, so a release with no selection empties it.
  const onAnchor = React.useCallback(
    (anchor: RcSelectionAnchor | null, surface: RcMarkSurfaceHandle) =>
      setPopover((prev) => {
        const others = (prev?.surfaces ?? []).filter((s) => s !== surface);
        if (!anchor) return prev && others.length > 0 ? { ...prev, surfaces: others } : null;
        return {
          anchor,
          surfaces: anchor.mode === 'apply' ? [...others, surface] : [surface],
        };
      }),
    [],
  );
  // A popover left open on the way out of a question would offer the old
  // offsets to the new question's text.
  React.useEffect(() => {
    setPopover(null);
  }, [question.questionId]);

  const stemTarget = questionTarget(question.questionId, 'stem');
  const stemHighlights = React.useMemo(
    () => highlights.filter((h) => h.target === stemTarget),
    [highlights, stemTarget],
  );
  React.useLayoutEffect(() => {
    const el = stemRef.current;
    if (el) paintRcAnnotations(el, stemHighlights);
  }, [question.questionId, question.prompt, stemHighlights]);

  useRcMarkSurface({
    disabled: annotationsDisabled,    textRef: stemRef,
    paneRef,
    highlightMode,
    color,
    onAdd: (start, end, chosen, kind) => onAddHighlight(stemTarget, start, end, chosen, kind),
    onRemove: (offset) => onRemoveHighlight(stemTarget, offset),
    onRemoveRange: (start, end) => onRemoveRange(stemTarget, start, end),
    onAnchor,
  });

  React.useEffect(() => {
    if (!revealed) {
      setOpenLetters(new Set());
      return;
    }
    // The credited answer and the student's own pick open themselves.
    const next = new Set<string>([question.correctAnswer]);
    if (selected) next.add(selected);
    if (reattemptPick) next.add(reattemptPick);
    setOpenLetters(next);
  }, [question.questionId, question.correctAnswer, revealed, selected, reattemptPick]);

  const showFeedback = revealed && !reattemptMode;

  return (
    <div
      className="rc-exam-col relative min-w-0 overflow-y-auto px-6 pt-4 pb-3 sm:pl-10 sm:pr-8"
      style={type.question}
      ref={paneRef}
    >
      {reattemptMode && (
        <div className="rc-reattempt-banner">
          <span>
            Your answer is hidden. Pick again, then see both.
          </span>
          <button type="button" className="rc-skip-link" onClick={onSkipToAnswer}>
            Show my answer
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 items-start gap-2">
          <span className="min-w-[20px] shrink-0 font-bold tabular-nums">{question.position}.</span>
          {/* Unexplained questions carry no authored prompt. The number stands
              in rather than inventing a stem. The mouse-up sits on this div,
              not the row: the flag button beside it is not markable text.
              Keyed on the question so a new stem mounts fresh text nodes;
              painting splits the ones React rendered, and React would patch
              the first fragment in place and leave the rest behind. */}
          <div
            key={question.questionId}
            className="flex-1 [&_p]:m-0"
            ref={stemRef}
            data-rc-mark-surface
          >
            {question.prompt ? <RcMarkdown>{question.prompt}</RcMarkdown> : <p>&nbsp;</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFlag}
          disabled={interactionDisabled}
          aria-pressed={flagged}
          aria-label={flagged ? 'Remove flag' : 'Flag question'}
          title={flagged ? 'Remove flag' : 'Flag question'}
          className={cn(
            'shrink-0 rounded p-1.5 transition-colors',
            flagged ? 'bg-amber-100' : 'hover:bg-slate-100',
          )}
        >
          <Flag
            className={cn('h-[24px] w-[24px] transition-colors', flagged && 'fill-amber-400')}
            strokeWidth={2}
          />
        </button>
      </div>

      {trainingControls}
      {choicesHidden && <p className="my-2 text-sm" role="status">Choices are hidden while you make a prediction. Open Training options to continue.</p>}
      {showFeedback && (
        <RcReviewLayer
          question={question}
          firstPick={selected}
          secondPick={reattemptPick ?? undefined}
          sourceLabel={`PrepTest ${item.passage.preptest} · Section ${item.passage.section} · Passage ${item.passage.setNumber} · Question ${question.position}`}
          actorId={actorId}
        />
      )}

      <ul hidden={choicesHidden} className="mt-3 space-y-1">
        {question.choices.map((choice) => {
          /* Blind means blind. `reattemptPick ?? selected` fell back to the
             original answer while the student was being asked to answer again,
             so the pane highlighted the very choice it was hiding — the
             re-attempt was answering itself. */
          const isPicked = reattemptMode
            ? reattemptPick === choice.letter
            : (reattemptPick ?? selected) === choice.letter;
          return (
            <RcChoiceRow
              // Keyed on the question too, so a new question gets fresh rows:
              // nothing a row captured on the last question carries over.
              key={`${question.questionId}:${choice.letter}`}
              choice={choice}
              questionId={question.questionId}
              selected={isPicked}
              eliminated={
                // Hidden outright while they answer again, and never drawn on
                // the choice they have just picked: a row that is selected AND
                // struck through reads as "you crossed out your own answer",
                // when what happened is that they landed on a choice they had
                // eliminated the first time round.
                !reattemptMode && !isPicked && eliminations.includes(choice.letter)
              }
              revealed={showFeedback}
              disabled={showFeedback || interactionDisabled || choicesHidden}
              eliminationDisabled={reattemptMode || interactionDisabled || choicesHidden}
              onSelect={onSelect}
              onToggleElimination={onToggleElimination}
              textStyle={type.choiceText}
              badgeStyle={type.choiceBadge}
              highlights={highlights}
              color={color}
              annotationsDisabled={annotationsDisabled || choicesHidden}
              highlightMode={highlightMode}
              onAddHighlight={onAddHighlight}
              onRemoveHighlight={onRemoveHighlight}
              onRemoveRange={onRemoveRange}
              onAnchor={onAnchor}
              paneRef={paneRef}
            >
              {showFeedback && (
                <RcChoiceDisclosure
                  choice={choice}
                  isPicked={isPicked}
                  open={openLetters.has(choice.letter)}
                  onToggle={() =>
                    setOpenLetters((prev) => {
                      const next = new Set(prev);
                      if (next.has(choice.letter)) next.delete(choice.letter);
                      else next.add(choice.letter);
                      return next;
                    })
                  }
                />
              )}
            </RcChoiceRow>
          );
        })}
      </ul>

      <RcSelectionPopover
        anchor={annotationsDisabled ? null : popover?.anchor ?? null}
        color={color}
        onColorChange={onColorChange}
        onApply={(chosen) => popover?.surfaces.forEach((s) => s.applyPending(chosen))}
        onRemove={() => popover?.surfaces.forEach((s) => s.removePending())}
        onDismiss={() => setPopover(null)}
      />
      {/* Last child on purpose: the cue is a zero-height sticky anchor. */}
      <ScrollMoreCue
        scrollRef={paneRef}
        fadeStyle={{
          background:
            "linear-gradient(to top, var(--rc-bg, #fff) 40%, transparent)",
        }}
      />
    </div>
  );
}

export default RcQuestionPane;
