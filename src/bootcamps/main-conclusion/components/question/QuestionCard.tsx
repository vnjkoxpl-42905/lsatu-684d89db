/**
 * QuestionCard — single multiple-choice question with stimulus + 5 choices.
 * Used by M3.4 Stage-Gate (canonical 20 reuse), M4 Simulator, M1.13 Capstone.
 */

import { useState, type ReactNode } from 'react';
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
      <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{questionId}</div>
      {stimulusSlot ?? (stimulus ? <p className="font-mc-serif text-body-prose text-ink leading-relaxed">{stimulus}</p> : null)}
      <p className="font-mc-serif text-body-prose text-ink-soft italic">{stem}</p>
      <ol className="space-y-2">
        {choices.map((c) => {
          const isPicked = picked === c.letter;
          const showVerdict = submitted && isPicked;
          return (
            <li key={c.letter}>
              <button
                onClick={() => !submitted && setPicked(c.letter)}
                disabled={disabled || submitted}
                aria-pressed={isPicked}
                className={cn(
                  'w-full text-left rounded-3 border px-3 py-2.5 transition-colors duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                  isPicked
                    ? 'border-[rgb(var(--accent)/0.50)] bg-[rgb(var(--accent)/0.08)]'
                    : 'border-[rgb(var(--border)/0.10)] hover:border-[rgb(var(--accent)/0.25)]',
                  submitted && c.is_correct && 'border-[rgb(var(--success)/0.40)] bg-[rgb(var(--success)/0.08)]',
                  showVerdict && !c.is_correct && 'border-[rgb(var(--error)/0.40)] bg-[rgb(var(--error)/0.08)]',
                )}
              >
                <span className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint mr-3">{c.letter}</span>
                <span className="font-mc-serif text-body-prose text-ink">{c.text}</span>
                {submitted && c.audit_voice ? (
                  <span className="block mt-1 ml-7 font-mc-mono text-mono text-ink-faint">— {c.audit_voice}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      {!submitted ? (
        <div className="flex justify-end">
          <Button onClick={submit} disabled={!picked}>
            Submit
          </Button>
        </div>
      ) : (
        revealCoachNote
      )}
    </Card>
  );
}
