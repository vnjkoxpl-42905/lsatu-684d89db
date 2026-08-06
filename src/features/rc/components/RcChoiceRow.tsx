import * as React from 'react';
import { Ban } from 'lucide-react';
import { RcMarkdown } from './RcMarkdown';
import type { RcChoice, RcLetter } from '../lib/rcTypes';

interface Props {
  choice: RcChoice;
  selected: boolean;
  eliminated: boolean;
  masked: boolean;
  /** Set once feedback is showing, so the row can carry the verdict colors. */
  revealed: boolean;
  onSelect: (letter: RcLetter) => void;
  onToggleElimination: (letter: RcLetter) => void;
  onUnmask: (letter: RcLetter) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function RcChoiceRow({
  choice,
  selected,
  eliminated,
  masked,
  revealed,
  onSelect,
  onToggleElimination,
  onUnmask,
  disabled,
  children,
}: Props) {
  const classes = ['rc-choice'];
  if (selected) classes.push('rc-choice-selected');
  if (eliminated) classes.push('rc-choice-eliminated');
  if (masked) classes.push('rc-choice-masked');
  if (revealed && choice.correct) classes.push('rc-choice-correct');
  if (revealed && selected && !choice.correct) classes.push('rc-choice-wrong');

  return (
    <div>
      <div
        className={classes.join(' ')}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={() => !disabled && onSelect(choice.letter)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(choice.letter);
          }
        }}
      >
        <span className="rc-choice-bubble" aria-hidden>
          {choice.letter}
        </span>

        <div className="rc-choice-body">
          <RcMarkdown>{choice.text}</RcMarkdown>
          {masked && (
            <span
              className="rc-choice-mask"
              role="button"
              tabIndex={0}
              aria-label={`Reveal choice ${choice.letter}`}
              onClick={(e) => {
                e.stopPropagation();
                onUnmask(choice.letter);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onUnmask(choice.letter);
                }
              }}
            />
          )}
        </div>

        <button
          type="button"
          className="rc-choice-cross"
          aria-label={eliminated ? `Restore choice ${choice.letter}` : `Cross out choice ${choice.letter}`}
          title={eliminated ? 'Restore' : 'Cross out'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleElimination(choice.letter);
          }}
        >
          <Ban size={16} aria-hidden />
        </button>
      </div>
      {children}
    </div>
  );
}

export default RcChoiceRow;
