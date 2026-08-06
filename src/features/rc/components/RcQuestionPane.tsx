import * as React from 'react';
import { RcMarkdown } from './RcMarkdown';
import { RcChoiceRow } from './RcChoiceRow';
import { RcChoiceDisclosure } from './RcChoiceDisclosure';
import { RcReviewLayer } from './RcReviewLayer';
import type { RcSessionItem } from '../lib/rcSession';
import type { RcLetter } from '../lib/rcTypes';

interface Props {
  item: RcSessionItem;
  selected: RcLetter | null;
  eliminations: RcLetter[];
  revealed: boolean;
  masking: boolean;
  /** State A of review: answer again before anything is shown. */
  reattemptMode: boolean;
  reattemptPick: RcLetter | null;
  onSelect: (letter: RcLetter) => void;
  onToggleElimination: (letter: RcLetter) => void;
  onSkipToAnswer: () => void;
}

export function RcQuestionPane({
  item,
  selected,
  eliminations,
  revealed,
  masking,
  reattemptMode,
  reattemptPick,
  onSelect,
  onToggleElimination,
  onSkipToAnswer,
}: Props) {
  const { question } = item;
  const [unmasked, setUnmasked] = React.useState<Set<string>>(() => new Set());
  const [openLetters, setOpenLetters] = React.useState<Set<string>>(() => new Set());

  // Masking resets per question, as does which disclosures are open.
  React.useEffect(() => {
    setUnmasked(new Set());
  }, [question.questionId, masking]);

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
    <div className="rc-pane rc-pane-question">
      {reattemptMode && (
        <div className="rc-reattempt-banner">
          <span>Answer again, then compare.</span>
          <button type="button" className="rc-skip-link" onClick={onSkipToAnswer}>
            Skip to answer
          </button>
        </div>
      )}

      {/* Unexplained questions carry no authored prompt. The number stands in
          rather than inventing a stem. */}
      <div className="rc-prompt">
        {question.prompt ? (
          <RcMarkdown>{question.prompt}</RcMarkdown>
        ) : (
          <p>Question {item.number}</p>
        )}
      </div>

      {showFeedback && (
        <RcReviewLayer
          question={question}
          firstPick={selected}
          secondPick={reattemptPick ?? undefined}
        />
      )}

      <div className="rc-choices">
        {question.choices.map((choice) => {
          const isPicked = (reattemptPick ?? selected) === choice.letter;
          return (
            <RcChoiceRow
              key={choice.letter}
              choice={choice}
              selected={isPicked}
              eliminated={eliminations.includes(choice.letter)}
              masked={masking && !unmasked.has(choice.letter)}
              revealed={showFeedback}
              disabled={showFeedback}
              onSelect={onSelect}
              onToggleElimination={onToggleElimination}
              onUnmask={(letter) =>
                setUnmasked((prev) => new Set(prev).add(letter))
              }
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
      </div>
    </div>
  );
}

export default RcQuestionPane;
