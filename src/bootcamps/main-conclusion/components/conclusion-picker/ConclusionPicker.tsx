/**
 * ConclusionPicker — pick-the-main-conclusion task.
 *
 * Stimulus is shown as one block. Each candidate is one of the stimulus sentences;
 * student picks one and submits. Reveal: the correct sentence paints with the
 * conclusion color, every candidate gets per-rationale text, score line fires.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, X as XIcon, RefreshCcw } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Candidate {
  id: string;
  text: string;
  is_main: boolean;
  rationale: string;
}

interface Props {
  stimulus: string;
  candidates: Candidate[];
  onComplete?: (result: { correct: boolean }) => void;
}

export function ConclusionPicker({ stimulus, candidates, onComplete }: Props): JSX.Element {
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // After-submit focus moves to the score line so screen readers announce the
  // verdict and keyboard users land in readable content. PRODUCT.md a11y rule.
  const scoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (submitted && scoreRef.current) scoreRef.current.focus();
  }, [submitted]);

  const pickedC = candidates.find((c) => c.id === picked) ?? null;
  const correctC = candidates.find((c) => c.is_main) ?? null;

  function submit() {
    if (!picked || submitted) return;
    setSubmitted(true);
    onComplete?.({ correct: !!pickedC?.is_main });
  }

  function reset() {
    setPicked(null);
    setSubmitted(false);
  }

  function togglePick(id: string) {
    if (submitted) return;
    setPicked((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-5">
      <Card variant="surface">
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
          Read first
        </div>
        <p className="mt-2 font-mc-serif text-body-prose text-ink leading-relaxed">{stimulus}</p>
      </Card>

      <ol className="space-y-2" role="radiogroup" aria-label="Conclusion candidates">
        {candidates.map((c, i) => {
          const isPicked = picked === c.id;
          const showCorrect = submitted && c.is_main;
          const showWrongPick = submitted && isPicked && !c.is_main;
          return (
            <li key={c.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={submitted}
                onClick={() => togglePick(c.id)}
                title={isPicked && !submitted ? 'Click again to clear' : undefined}
                className={cn(
                  'group/cand w-full text-left rounded-3 border px-4 py-3',
                  'transition-[border-color,background,box-shadow,transform] duration-180 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                  'disabled:cursor-default',
                  !submitted &&
                    !isPicked &&
                    'bg-[image:var(--grad-surface-soft)] border-[rgb(var(--border)/0.10)] hover:-translate-y-[1px] hover:border-[color:var(--border-accent-soft)]',
                  !submitted &&
                    isPicked &&
                    'bg-[image:var(--grad-accent-soft)] border-[color:var(--border-accent-strong)] shadow-[var(--glow-accent-soft)]',
                  showCorrect &&
                    'bg-[rgb(var(--role-conclusion)/0.10)] border-[rgb(var(--role-conclusion)/0.50)]',
                  showWrongPick &&
                    'bg-[rgb(var(--error)/0.06)] border-[rgb(var(--error)/0.40)]',
                  submitted &&
                    !c.is_main &&
                    !isPicked &&
                    'border-[rgb(var(--border)/0.06)]',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-label={`Choice ${String.fromCharCode(65 + i)}`}
                    className={cn(
                      'shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full',
                      'font-mc-mono text-[10.5px] font-semibold uppercase',
                      showCorrect &&
                        'bg-[rgb(var(--role-conclusion)/0.18)] text-[rgb(var(--role-conclusion))] border border-[rgb(var(--role-conclusion)/0.50)]',
                      showWrongPick &&
                        'bg-[rgb(var(--error)/0.18)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.50)]',
                      !submitted &&
                        isPicked &&
                        'bg-[image:var(--grad-accent-strong)] text-mc-accent border border-[color:var(--border-accent-strong)]',
                      !submitted &&
                        !isPicked &&
                        'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)]',
                      submitted &&
                        !c.is_main &&
                        !isPicked &&
                        'bg-[rgb(var(--surface-elev))] text-ink-faint border border-[rgb(var(--border)/0.10)]',
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-mc-serif text-body-prose text-ink leading-relaxed flex-1">
                    {c.text}
                  </span>
                  {showCorrect ? (
                    <Check
                      className="shrink-0 h-4 w-4 text-[rgb(var(--role-conclusion))] mt-1"
                      strokeWidth={2.4}
                      aria-label="Main conclusion"
                    />
                  ) : showWrongPick ? (
                    <XIcon
                      className="shrink-0 h-4 w-4 text-[rgb(var(--error))] mt-1"
                      strokeWidth={2.4}
                      aria-label="Not the main conclusion"
                    />
                  ) : null}
                </div>
                {submitted ? (
                  <p className="mt-2 ml-9 font-mc-serif text-body text-ink-soft leading-relaxed">
                    {c.rationale}
                  </p>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mc-mono text-mono text-ink-faint">
            {picked ? 'Reveal when ready.' : 'Pick the sentence the rest is built to support.'}
          </p>
          <Button onClick={submit} disabled={!picked}>
            Reveal the conclusion
          </Button>
        </div>
      ) : (
        <div
          ref={scoreRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className={cn(
            'rounded-3 px-4 py-3 border',
            'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
            pickedC?.is_main
              ? 'bg-[rgb(var(--success)/0.06)] border-[rgb(var(--success)/0.40)]'
              : 'bg-[rgb(var(--warn)/0.06)] border-[rgb(var(--warn)/0.40)]',
          )}
        >
          <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
            <span
              className={cn(
                'font-mc-mono text-mono uppercase tracking-wider mr-2',
                pickedC?.is_main ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--warn))]',
              )}
            >
              {pickedC?.is_main ? 'You found it' : 'Off the conclusion'}
            </span>
            {pickedC?.is_main
              ? 'Read why each other candidate plays the role it plays before you continue.'
              : 'The conclusion is the candidate paint-revealed above. Read its rationale next.'}
          </p>
          <Button
            variant="subtle"
            size="sm"
            onClick={reset}
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" strokeWidth={2.2} />}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
