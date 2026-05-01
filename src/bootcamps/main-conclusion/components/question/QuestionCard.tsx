/**
 * QuestionCard — single multiple-choice question with stimulus + 5 choices.
 * Used by M3.4 Stage-Gate (canonical 20 reuse), M4 Simulator, M1.13 Capstone.
 */

import { useState, type ReactNode } from 'react';
import { Check, X as XIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

export interface AnswerChoice {
  letter: Letter;
  text: string;
  is_correct: boolean;
  trait_id?: string;
  audit_voice?: string;
}

interface Props {
  questionId: string;
  stem?: string;
  stimulus?: string;
  stimulusSlot?: ReactNode;
  choices: AnswerChoice[];
  onAnswer?: (picked: Letter, correct: boolean) => void;
  disabled?: boolean;
  revealCoachNote?: ReactNode;
}

export function QuestionCard({
  questionId,
  stem = 'Which one of the following most accurately expresses the conclusion drawn in the argument?',
  stimulus,
  stimulusSlot,
  choices,
  onAnswer,
  disabled,
  revealCoachNote,
}: Props) {
  const [picked, setPicked] = useState<Letter | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function submit() {
    if (!picked) return;
    const c = choices.find((x) => x.letter === picked);
    if (!c) return;
    setSubmitted(true);
    onAnswer?.(picked, c.is_correct);
  }

  return (
    <Card variant="surface" data-question-id={questionId} className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
        />
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">{questionId}</div>
      </div>
      {stimulusSlot ?? (stimulus ? (
        <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{stimulus}</p>
      ) : null)}
      <p className="font-mc-serif text-body-prose text-ink-soft italic leading-relaxed">{stem}</p>
      <ol className="space-y-2.5">
        {choices.map((c) => {
          const isPicked = picked === c.letter;
          const showVerdict = submitted && isPicked;
          const showCorrectHint = submitted && c.is_correct;
          return (
            <li key={c.letter}>
              <button
                onClick={() => !submitted && setPicked(c.letter)}
                disabled={disabled || submitted}
                aria-pressed={isPicked}
                className={cn(
                  'group/choice relative w-full text-left rounded-3 border px-3.5 py-3',
                  'transition-[transform,border-color,background,box-shadow] duration-180 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                  'disabled:cursor-default',
                  // Default
                  !submitted && !isPicked &&
                    'border-[rgb(var(--border)/0.10)] bg-[image:var(--grad-surface-soft)] hover:-translate-y-[1px] hover:border-[color:var(--border-accent-soft)] hover:shadow-[var(--shadow-2)]',
                  // Picked, not yet submitted
                  !submitted && isPicked &&
                    'border-[color:var(--border-accent-strong)] bg-[image:var(--grad-accent-soft)] shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.06)]',
                  // After submit — picked + correct
                  submitted && isPicked && c.is_correct &&
                    'border-[rgb(var(--success)/0.50)] bg-[rgb(var(--success)/0.10)]',
                  // After submit — picked + wrong
                  submitted && isPicked && !c.is_correct &&
                    'border-[rgb(var(--error)/0.50)] bg-[rgb(var(--error)/0.08)]',
                  // After submit — correct (not picked)
                  submitted && !isPicked && c.is_correct &&
                    'border-[rgb(var(--success)/0.40)] bg-[rgb(var(--success)/0.06)]',
                  // After submit — eliminator (not correct, not picked)
                  submitted && !isPicked && !c.is_correct &&
                    'opacity-50 line-through decoration-[rgb(var(--ink-faint)/0.5)]',
                )}
              >
                <div className="flex items-start gap-3">
                  <LetterChip letter={c.letter} state={
                    submitted && isPicked && c.is_correct ? 'correct'
                    : submitted && isPicked && !c.is_correct ? 'wrong'
                    : submitted && c.is_correct ? 'reveal'
                    : isPicked ? 'picked'
                    : 'idle'
                  } />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <span className="font-mc-serif text-body-prose text-ink leading-relaxed">{c.text}</span>
                    {submitted && c.audit_voice ? (
                      <span className="block mt-1.5 font-mc-mono text-mono text-ink-faint">— {c.audit_voice}</span>
                    ) : null}
                  </div>
                  {showVerdict ? (
                    c.is_correct ? (
                      <Check className="shrink-0 h-4 w-4 text-[rgb(var(--success))] mt-1" strokeWidth={2.4} aria-label="Correct" />
                    ) : (
                      <XIcon className="shrink-0 h-4 w-4 text-[rgb(var(--error))] mt-1" strokeWidth={2.4} aria-label="Incorrect" />
                    )
                  ) : showCorrectHint ? (
                    <Check className="shrink-0 h-4 w-4 text-[rgb(var(--success))] mt-1" strokeWidth={2.4} aria-label="Correct answer" />
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      {!submitted ? (
        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={!picked}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}
          >
            Submit
          </Button>
        </div>
      ) : (
        revealCoachNote
      )}
    </Card>
  );
}

type ChipState = 'idle' | 'picked' | 'correct' | 'wrong' | 'reveal';

function LetterChip({ letter, state }: { letter: Letter; state: ChipState }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full',
        'font-mc-mono text-mono font-semibold uppercase',
        'transition-[background,color,border-color,box-shadow] duration-180 ease-eased',
        state === 'idle' &&
          'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.12)] group-hover/choice:border-[color:var(--border-accent-soft)] group-hover/choice:text-ink',
        state === 'picked' &&
          'bg-[image:var(--grad-accent-strong)] text-mc-accent border border-[color:var(--border-accent-strong)] shadow-[inset_0_1px_0_rgb(255_255_255/0.10),var(--glow-accent-soft)]',
        state === 'correct' &&
          'bg-[rgb(var(--success)/0.18)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.50)]',
        state === 'wrong' &&
          'bg-[rgb(var(--error)/0.18)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.50)]',
        state === 'reveal' &&
          'bg-[rgb(var(--success)/0.10)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.40)]',
      )}
    >
      {letter}
    </span>
  );
}
