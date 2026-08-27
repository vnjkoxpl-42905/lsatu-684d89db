import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcMarkdown } from './RcMarkdown';
import type { RcChoice, RcLetter } from '../lib/rcTypes';

/**
 * One answer choice, using the LR player's row markup and state ladder so the
 * two drills are indistinguishable at the choice level.
 *
 * Two deliberate departures from LR, both taken from the official RC interface:
 * the letter badge is a circle with a visible outline rather than a rounded
 * square with a transparent border, and the eliminate control is always visible
 * rather than appearing on row hover.
 *
 * Like LR, a revealed question greens the credited answer and leaves the
 * student's pick in the selected slate — there is no red row. The verdict line
 * and the "Your answer" chip carry that.
 */

interface Props {
  choice: RcChoice;
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
}

export function RcChoiceRow({
  choice,
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
}: Props) {
  const isCorrect = revealed && choice.correct;
  const noCrossOut = disabled || eliminationDisabled;
  const pick = () => {
    if (!disabled && !eliminated) onSelect(choice.letter);
  };

  return (
    <li
      className={cn(
        // rc-choice is a hook for the accessibility schemes, which need to
        // neutralise these fills. It carries no styling of its own.
        'rc-choice group relative rounded-lg border transition-all duration-200',
        'grid grid-cols-[auto_1fr_auto] items-start gap-3 p-3',
        isCorrect
          ? 'border-green-500 bg-green-50'
          : selected
            ? 'border-slate-500 bg-slate-100 shadow-sm'
            : eliminated
              ? 'border-transparent opacity-55 grayscale-[0.5]'
              : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
      )}
    >
      <button
        type="button"
        onClick={pick}
        disabled={disabled || eliminated}
        aria-label={`Choice ${choice.letter}`}
        className={cn(
          'rc-choice-badge mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-semibold transition-all',
          isCorrect
            ? 'border-green-600 bg-green-500 text-white'
            : selected
              ? 'rc-choice-badge-selected border-slate-900 bg-slate-900 text-white'
              : 'border-slate-300 group-hover:border-slate-400',
        )}
        style={badgeStyle}
      >
        {choice.letter}
      </button>

      <button
        type="button"
        onClick={pick}
        disabled={disabled || eliminated}
        className={cn(
          'rc-choice-text relative text-left leading-relaxed transition-colors',
          eliminated && 'line-through',
          isCorrect && 'text-green-900',
        )}
        style={textStyle}
      >
        <RcMarkdown>{choice.text}</RcMarkdown>
      </button>

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
          eliminated ? `Restore choice ${choice.letter}` : `Cross out choice ${choice.letter}`
        }
        title={eliminated ? 'Restore' : 'Cross out'}
        className={cn(
          'mt-0.5 p-1 transition-opacity',
          eliminated
            ? 'text-slate-700'
            : 'text-slate-400 opacity-0 hover:text-slate-800 focus-visible:opacity-100 group-hover:opacity-100',
        )}
      >
        {eliminated ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>

      {children && <div className="col-start-2 col-end-4">{children}</div>}
    </li>
  );
}

export default RcChoiceRow;
