/**
 * RoleLabeler — interactive stimulus role-tagging task.
 *
 * Student taps a sentence → picks a role → repeats for every sentence → submits.
 * After submit, role colors and per-segment rationale are revealed; the parent
 * is notified via onComplete so the lesson can advance to the reveal phase.
 *
 * Reuses the role-color tokens (--role-conclusion, --role-premise, etc.).
 */

import { useState } from 'react';
import { Check, X as XIcon, RefreshCcw } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { ChipPicker, type ChipOption } from '@/bootcamps/main-conclusion/components/chip-picker/ChipPicker';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export type Role = 'conclusion' | 'premise' | 'background';

export interface Segment {
  id: string;
  text: string;
  correct: Role;
}

interface Props {
  segments: Segment[];
  allowedRoles: Role[];
  rationale: Record<string, string>;
  onComplete?: (result: { correct: number; total: number }) => void;
}

const ROLE_LABEL: Record<Role, string> = {
  conclusion: 'Conclusion',
  premise: 'Premise',
  background: 'Background',
};

const ROLE_PICK_CLASS: Record<Role, string> = {
  conclusion:
    'border-[rgb(var(--role-conclusion)/0.50)] bg-[rgb(var(--role-conclusion)/0.10)] text-[rgb(var(--role-conclusion))]',
  premise:
    'border-[rgb(var(--role-premise)/0.50)] bg-[rgb(var(--role-premise)/0.10)] text-[rgb(var(--role-premise))]',
  background:
    'border-[rgb(var(--role-background)/0.40)] bg-[rgb(var(--role-background)/0.10)] text-[rgb(var(--role-background))]',
};

const ROLE_DOT_CLASS: Record<Role, string> = {
  conclusion: 'bg-[rgb(var(--role-conclusion))]',
  premise: 'bg-[rgb(var(--role-premise))]',
  background: 'bg-[rgb(var(--role-background))]',
};

const ROLE_REVEAL_CLASS: Record<Role, string> = {
  conclusion:
    'bg-[rgb(var(--role-conclusion)/0.16)] border border-[rgb(var(--role-conclusion)/0.35)] text-ink',
  premise:
    'bg-[rgb(var(--role-premise)/0.14)] border border-[rgb(var(--role-premise)/0.30)] text-ink',
  background:
    'bg-[rgb(var(--role-background)/0.10)] border border-[rgb(var(--role-background)/0.25)] text-ink-soft',
};

export function RoleLabeler({ segments, allowedRoles, rationale, onComplete }: Props): JSX.Element {
  const [picks, setPicks] = useState<Record<string, Role | null>>(() =>
    Object.fromEntries(segments.map((s) => [s.id, null])),
  );
  const [submitted, setSubmitted] = useState(false);

  function reset() {
    setPicks(Object.fromEntries(segments.map((s) => [s.id, null])));
    setSubmitted(false);
  }

  const allLabeled = segments.every((s) => picks[s.id] !== null);
  const correctCount = segments.filter((s) => picks[s.id] === s.correct).length;
  const cleanRead = correctCount === segments.length;

  function submit() {
    if (!allLabeled || submitted) return;
    setSubmitted(true);
    onComplete?.({ correct: correctCount, total: segments.length });
  }

  return (
    <div className="space-y-5">
      <ol className="space-y-3">
        {segments.map((seg, i) => {
          const picked = picks[seg.id];
          const isRight = submitted && picked === seg.correct;
          const isWrong = submitted && picked !== null && picked !== seg.correct;
          return (
            <li key={seg.id}>
              <div
                className={cn(
                  'rounded-3 border p-4 transition-colors duration-180 ease-eased',
                  submitted
                    ? ROLE_REVEAL_CLASS[seg.correct]
                    : cn(
                        'bg-[image:var(--grad-surface-soft)]',
                        picked ? 'border-[color:var(--border-accent-soft)]' : 'border-[rgb(var(--border)/0.10)]',
                      ),
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--surface-elev))] text-ink-faint border border-[rgb(var(--border)/0.10)] font-mc-mono text-[10.5px] font-semibold"
                  >
                    {i + 1}
                  </span>
                  <p className="font-mc-serif text-body-prose text-ink leading-relaxed flex-1">
                    {seg.text}
                  </p>
                  {submitted ? (
                    isRight ? (
                      <Check
                        className="shrink-0 h-4 w-4 text-[rgb(var(--success))]"
                        strokeWidth={2.4}
                        aria-label="Correct label"
                      />
                    ) : isWrong ? (
                      <XIcon
                        className="shrink-0 h-4 w-4 text-[rgb(var(--error))]"
                        strokeWidth={2.4}
                        aria-label="Incorrect label"
                      />
                    ) : null
                  ) : null}
                </div>

                <div className="mt-3">
                  <ChipPicker<Role>
                    ariaLabel={`Role for sentence ${i + 1}`}
                    disabled={submitted}
                    value={picked}
                    onChange={(next) =>
                      setPicks((p) => ({ ...p, [seg.id]: next }))
                    }
                    options={allowedRoles.map((role): ChipOption<Role> => ({
                      value: role,
                      label: ROLE_LABEL[role],
                      dotClass: ROLE_DOT_CLASS[role],
                      pickedClass: ROLE_PICK_CLASS[role],
                    }))}
                  />
                </div>

                {submitted ? (
                  <p className="mt-3 font-mc-serif text-body text-ink-soft leading-relaxed">
                    <span className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent mr-2">
                      {ROLE_LABEL[seg.correct]}
                      {isWrong && picked ? (
                        <span className="text-ink-faint normal-case tracking-normal">
                          {' '}
                          (you picked {ROLE_LABEL[picked]})
                        </span>
                      ) : null}
                    </span>
                    {rationale[seg.id] ?? ''}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {!submitted ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mc-mono text-mono text-ink-faint">
            {Object.values(picks).filter((v) => v !== null).length} of {segments.length} labeled
          </p>
          <Button onClick={submit} disabled={!allLabeled}>
            Reveal the structure
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'rounded-3 px-4 py-3',
            'bg-[image:var(--grad-surface-soft)]',
            'border border-[color:var(--border-accent-soft)]',
            'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
          )}
        >
          <p className="font-mc-serif text-body-prose text-ink">
            <span className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent mr-2">
              You got {correctCount} of {segments.length}
            </span>
            {cleanRead
              ? 'Clean read. The structure is in your hands now.'
              : correctCount === 0
                ? 'Every sentence slipped. Not a grade. A calibration. Read the notes above slowly.'
                : 'Not a grade. A calibration. Read the per-sentence notes above before you continue.'}
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
