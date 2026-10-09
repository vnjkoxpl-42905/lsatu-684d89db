/**
 * ConclusionTypePicker — classify-the-conclusion-type task.
 *
 * Shows a short stimulus with its conclusion isolated, then asks the student to
 * name the conclusion's TYPE from the five canonical options. On reveal the
 * correct type paints, a wrong pick is marked, and the explanation (with the
 * type's predictable weakness) appears. Reports correctness up via onResolved.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, X as XIcon, RefreshCcw } from 'lucide-react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import {
  CONCLUSION_TYPE_META,
  conclusionTypeMeta,
  type ConclusionType,
  type ConclusionTypeQuestion,
} from '@/bootcamps/main-conclusion/data/reference-drills/conclusionTypeQuestions';

interface Props {
  question: ConclusionTypeQuestion;
  onResolved?: (result: { correct: boolean }) => void;
}

export function ConclusionTypePicker({ question, onResolved }: Props): JSX.Element {
  const [picked, setPicked] = useState<ConclusionType | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (submitted && statusRef.current) statusRef.current.focus();
  }, [submitted]);

  const isCorrect = submitted && picked === question.answer;

  function submit() {
    if (!picked || submitted) return;
    setSubmitted(true);
    onResolved?.({ correct: picked === question.answer });
  }

  function togglePick(value: ConclusionType) {
    if (submitted) return;
    setPicked((current) => (current === value ? null : value));
  }

  function reset() {
    setPicked(null);
    setSubmitted(false);
  }

  return (
    <div className="space-y-5">
      <Card variant="surface">
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Read first</div>
        <p className="mt-2 font-mc-serif text-body-prose text-ink leading-relaxed">{question.stimulus}</p>
        <div className="mt-4 rounded-3 border border-[rgb(var(--role-conclusion)/0.35)] bg-[rgb(var(--role-conclusion)/0.08)] px-4 py-3">
          <div className="font-mc-mono text-mono uppercase tracking-[0.16em] text-[rgb(var(--role-conclusion))]">
            The conclusion
          </div>
          <p className="mt-1.5 font-mc-serif text-body-prose text-ink leading-relaxed">{question.conclusion}</p>
        </div>
      </Card>

      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Conclusion type">
        {CONCLUSION_TYPE_META.map((meta) => {
          const isPicked = picked === meta.value;
          const showCorrect = submitted && meta.value === question.answer;
          const showWrongPick = submitted && isPicked && meta.value !== question.answer;
          return (
            <button
              key={meta.value}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={submitted}
              onClick={() => togglePick(meta.value)}
              className={cn(
                'group/type w-full text-left rounded-3 border px-4 py-3',
                'transition-[border-color,background,box-shadow,transform] duration-180 ease-eased',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                'disabled:cursor-default',
                !submitted &&
                  !isPicked &&
                  'bg-[image:var(--grad-surface-soft)] border-[rgb(var(--border)/0.10)] hover:-translate-y-[1px] hover:border-[color:var(--border-accent-soft)]',
                !submitted &&
                  isPicked &&
                  'bg-[image:var(--grad-accent-soft)] border-[color:var(--border-accent-strong)] shadow-[var(--glow-accent-soft)]',
                showCorrect && 'bg-[rgb(var(--success)/0.08)] border-[rgb(var(--success)/0.45)]',
                showWrongPick && 'bg-[rgb(var(--error)/0.06)] border-[rgb(var(--error)/0.40)]',
                submitted && !showCorrect && !showWrongPick && 'border-[rgb(var(--border)/0.06)] opacity-70',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-mc-serif text-body-prose font-semibold text-ink leading-tight">
                    {meta.label}
                  </span>
                  <span className="mt-0.5 block font-mc-serif text-body text-ink-soft leading-snug">{meta.blurb}</span>
                </span>
                {showCorrect ? (
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--success))]" strokeWidth={2.4} aria-label="Correct type" />
                ) : showWrongPick ? (
                  <XIcon className="mt-1 h-4 w-4 shrink-0 text-[rgb(var(--error))]" strokeWidth={2.4} aria-label="Not the type" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {!submitted ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mc-mono text-mono text-ink-faint">
            {picked ? 'Reveal when ready.' : 'What kind of claim is the author making?'}
          </p>
          <Button onClick={submit} disabled={!picked}>
            Reveal the type
          </Button>
        </div>
      ) : (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className={cn(
            'rounded-3 border px-4 py-3 space-y-1.5',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
            isCorrect
              ? 'bg-[rgb(var(--success)/0.06)] border-[rgb(var(--success)/0.40)]'
              : 'bg-[rgb(var(--warn)/0.06)] border-[rgb(var(--warn)/0.40)]',
          )}
        >
          <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
            <span
              className={cn(
                'font-mc-mono text-mono uppercase tracking-wider mr-2',
                isCorrect ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--warn))]',
              )}
            >
              {isCorrect ? 'Named it' : `It is a ${conclusionTypeMeta(question.answer).label}`}
            </span>
            {question.explanation}
          </p>
          <div className="flex justify-end pt-1">
            <Button
              variant="subtle"
              size="sm"
              onClick={reset}
              leftIcon={<RefreshCcw className="h-3.5 w-3.5" strokeWidth={2.2} />}
            >
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
