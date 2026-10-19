import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcMarkdown } from './RcMarkdown';
import type { RcSelectionAnchor } from './RcSelectionPopover';
import { useRcMarkSurface, type RcMarkSurfaceHandle } from '../hooks/useRcMarkSurface';
import { paintRcAnnotations, RC_HIGHLIGHT_ATTR } from '../lib/rcHighlightPaint';
import { useDeferredPick } from '@/hooks/useDeferredPick';
import {
  questionTarget,
  type RcAnnotationKind,
  type RcChoice,
  type RcHighlight,
  type RcHighlightColor,
  type RcHighlightMode,
  type RcHighlightTarget,
  type RcLetter,
} from '../lib/rcTypes';

/**
 * One answer choice, using the LR player's row markup and state ladder so the
 * two drills are indistinguishable at the choice level.
 *
 * Two deliberate departures from LR, both taken from the official RC interface:
 * the letter badge is a circle with a visible outline rather than a rounded
 * square with a transparent border, and the eliminate control stays visible
 * on touch screens while desktop users can reveal it by hover or focus.
 *
 * Like LR, a revealed question greens the credited answer and leaves the
 * student's pick in the selected slate — there is no red row. The verdict line
 * and the "Your answer" chip carry that.
 *
 * The credited answer's colours come from `.rc-choice-correct` in rc.css rather
 * than Tailwind utilities. They used to be green-500/green-50 here while the
 * verdict banner directly above used the design system's drill-correct #2f9e64
 * on #eaf6ef — two greens for one verdict, on one screen. Both read the same
 * token now, and it is the documented one.
 *
 * The choice text is a markable surface, like the passage: the student can
 * highlight and underline inside it with the same tools. That is why the text
 * is not a button. Chromium will not start a drag-selection inside one, and a
 * disabled button swallows the mouse entirely, which would make a revealed or
 * crossed-out choice impossible to mark. A plain click on the text still
 * answers; the letter badge stays the keyboard and screen-reader control.
 */

interface Props {
  annotationsDisabled?: boolean;
  choice: RcChoice;
  /** Scopes this choice's marks: highlights are stored per passage. */
  questionId: number;
  selected: boolean;
  eliminated: boolean;
  /** Set once feedback is showing, so the row can carry the verdict colors. */
  revealed: boolean;
  onSelect: (letter: RcLetter) => void;
  onToggleElimination: (letter: RcLetter) => void;
  disabled?: boolean;
  /**
   * Disables the cross-out control ALONE, leaving the choice selectable.
   *
   * Kept separate from `disabled` on purpose. A blind re-attempt has to hide
   * the student's original cross-outs while they answer again, and it also has
   * to let them answer — so the row cannot simply be disabled. Before this
   * existed, the eye stayed live while its effect was suppressed: the click
   * reached the reducer, the row never changed, and the label never flipped to
   * "Restore". A control that does nothing is worse than one that is off.
   */
  eliminationDisabled?: boolean;
  textStyle?: React.CSSProperties;
  badgeStyle?: React.CSSProperties;
  /** The per-choice disclosure, rendered under the text in review. */
  children?: React.ReactNode;
  /** This passage's marks. The row paints only the ones on its own text. */
  highlights: RcHighlight[];
  color: RcHighlightColor;
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
  /** The pane owns the one popover; the row reports where it should sit. */
  onAnchor: (anchor: RcSelectionAnchor | null, surface: RcMarkSurfaceHandle) => void;
  paneRef: React.RefObject<HTMLElement | null>;
}

export function RcChoiceRow({
  choice,
  questionId,
  selected,
  eliminated,
  revealed,
  onSelect,
  onToggleElimination,
  disabled,
  eliminationDisabled,
  textStyle,
  badgeStyle,
  children,
  highlights,
  color,
  annotationsDisabled = false,
  highlightMode,
  onAddHighlight,
  onRemoveHighlight,
  onRemoveRange,
  onAnchor,
  paneRef,
}: Props) {
  const isCorrect = revealed && choice.correct;
  const effectiveEliminated = eliminated && !selected;
  const noCrossOut = disabled || eliminationDisabled || selected;
  const pickable = !disabled && !effectiveEliminated;
  const pick = () => {
    if (pickable) onSelect(choice.letter);
  };

  const textRef = React.useRef<HTMLDivElement>(null);
  const textId = React.useId();
  const target = questionTarget(questionId, choice.letter);
  const choiceHighlights = React.useMemo(
    () => highlights.filter((h) => h.target === target),
    [highlights, target],
  );

  React.useLayoutEffect(() => {
    const el = textRef.current;
    if (el) paintRcAnnotations(el, choiceHighlights);
  }, [choice.letter, choice.text, choiceHighlights]);

  const surface = useRcMarkSurface({
    disabled: annotationsDisabled,    textRef,
    paneRef,
    highlightMode,
    color,
    onAdd: (start, end, chosen, kind) => onAddHighlight(target, start, end, chosen, kind),
    onRemove: (offset) => onRemoveHighlight(target, offset),
    onRemoveRange: (start, end) => onRemoveRange(target, start, end),
    onAnchor,
  });

  /**
   * A click on the text answers, a drag across it marks. The two are told
   * apart by what the mouse-up just did: a marking release (a mark applied,
   * erased or offered for removal) is never a pick, and a drag with no tool
   * active leaves a selection behind. Under a marker tool the pick waits a
   * beat, so a double-click on a word (marking, not answering) can call it
   * off before it lands.
   */
  const deferredPick = useDeferredPick();
  const clickText = (event: React.MouseEvent<HTMLElement>) => {
    if (surface.consumedLastMouseUp()) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;
    // A click on an existing mark is aimed at the mark (it opens the Remove
    // popover), not at the answer.
    if (!annotationsDisabled && (event.target as HTMLElement).closest?.(`[${RC_HIGHLIGHT_ATTR}]`)) return;
    if (annotationsDisabled || highlightMode === 'none' || highlightMode === 'erase') {
      pick();
      return;
    }
    deferredPick.schedule(() => {
      if (surface.consumedLastMouseUp()) return;
      pick();
    });
  };

  return (
    <li
      className={cn(
        // rc-choice is a hook for the accessibility schemes, which need to
        // neutralise these fills. It carries no styling of its own.
        'rc-choice group relative rounded-lg border transition-all duration-200',
        'grid grid-cols-[auto_1fr_auto] items-start gap-3 px-3 py-1.5',
        isCorrect
          ? 'rc-choice-correct'
          : selected
            ? 'border-slate-500 bg-slate-100 shadow-sm'
            : effectiveEliminated
              ? 'border-transparent opacity-55 grayscale-[0.5]'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
      )}
    >
      <button
        type="button"
        onClick={pick}
        disabled={disabled || effectiveEliminated}
        aria-label={`Choice ${choice.letter}`}
        aria-describedby={textId}
        className={cn(
          'rc-choice-badge mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-semibold transition-all',
          isCorrect
            ? ''
            : selected
              ? 'rc-choice-badge-selected border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 group-hover:border-slate-400',
        )}
        style={badgeStyle}
      >
        {choice.letter}
      </button>

      {/* Keyed on the question so a new question mounts fresh text nodes.
          Painting splits the nodes React rendered, and React would patch the
          first fragment in place and leave the rest behind. */}
      <div
        key={questionId}
        id={textId}
        ref={textRef}
        data-rc-mark-surface
        onClick={clickText}
        onDoubleClick={() => deferredPick.cancel()}
        className={cn(
          'rc-choice-text relative text-left leading-relaxed transition-colors',
          pickable ? 'cursor-pointer' : 'cursor-text',
          effectiveEliminated && 'line-through',
        )}
        style={textStyle}
      >
        <RcMarkdown>{choice.text}</RcMarkdown>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          // Guarded here as well as on the element: a disabled attribute alone
          // still leaves the handler reachable by a synthetic event.
          if (!noCrossOut) onToggleElimination(choice.letter);
        }}
        disabled={noCrossOut}
        aria-label={
          selected ? `Choice ${choice.letter} is your answer and cannot be crossed out` : effectiveEliminated ? `Restore choice ${choice.letter}` : `Cross out choice ${choice.letter}`
        }
        title={selected ? 'Your answer' : effectiveEliminated ? 'Restore' : 'Cross out'}
        className={cn(
          'mt-0.5 p-1 transition-opacity',
          effectiveEliminated
            ? 'text-slate-700'
            : 'text-slate-400 opacity-0 [@media(hover:none)]:opacity-100 hover:text-slate-800 focus-visible:opacity-100 group-hover:opacity-100',
        )}
      >
        {effectiveEliminated ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>

      {children && <div className="col-start-2 col-end-4">{children}</div>}
    </li>
  );
}

export default RcChoiceRow;
