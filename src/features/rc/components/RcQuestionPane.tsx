import * as React from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RcMarkdown } from './RcMarkdown';
import { RcChoiceRow } from './RcChoiceRow';
import { RcChoiceDisclosure } from './RcChoiceDisclosure';
import { RcReviewLayer } from './RcReviewLayer';
import type { RcTypeStyles } from './RcExamPane';
import type { RcSessionItem } from '../lib/rcSession';
import type { RcLetter } from '../lib/rcTypes';

interface Props {
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
  onToggleElimination: (letter: RcLetter) => void;
  onSkipToAnswer: () => void;
  type: RcTypeStyles;
}

export function RcQuestionPane({
  item,
  selected,
  eliminations,
  revealed,
  reattemptMode,
  reattemptPick,
  flagged,
  onToggleFlag,
  onSelect,
  onToggleElimination,
  onSkipToAnswer,
  type,
}: Props) {
  const { question } = item;
  const [openLetters, setOpenLetters] = React.useState<Set<string>>(() => new Set());

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
      className="rc-exam-col min-w-0 overflow-y-auto px-6 py-7 sm:pl-10 sm:pr-8"
      style={type.question}
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
          <span className="min-w-[20px] shrink-0 font-bold tabular-nums">{item.number}.</span>
          {/* Unexplained questions carry no authored prompt. The number stands
              in rather than inventing a stem. */}
          <div className="flex-1 [&_p]:m-0">
            {question.prompt ? <RcMarkdown>{question.prompt}</RcMarkdown> : <p>&nbsp;</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleFlag}
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

      {showFeedback && (
        <RcReviewLayer
          question={question}
          firstPick={selected}
          secondPick={reattemptPick ?? undefined}
        />
      )}

      <ul className="mt-4 space-y-3.5">
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
              key={choice.letter}
              choice={choice}
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
              disabled={showFeedback}
              eliminationDisabled={reattemptMode}
              onSelect={onSelect}
              onToggleElimination={onToggleElimination}
              textStyle={type.choiceText}
              badgeStyle={type.choiceBadge}
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
    </div>
  );
}

export default RcQuestionPane;
