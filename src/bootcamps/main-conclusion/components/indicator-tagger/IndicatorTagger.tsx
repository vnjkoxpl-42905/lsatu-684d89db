/**
 * IndicatorTagger — interactive tap-the-indicator task.
 *
 * The full sentence is rendered with target substrings as tappable pills.
 * Student selects a pill, then picks a category chip. Repeats for every target.
 * Submit to reveal: each pill paints with its category color, rationale appears.
 */

import { useMemo, useState } from 'react';
import { Check, X as XIcon, RefreshCcw } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { IndicatorCategory } from '@/bootcamps/main-conclusion/content/lessons-phased.source';

interface Target {
  id: string;
  word: string;
  correct: IndicatorCategory;
  rationale: string;
}

interface Props {
  sentence: string;
  targets: Target[];
  allowedCategories: IndicatorCategory[];
  onComplete?: (result: { correct: number; total: number }) => void;
}

const CATEGORY_LABEL: Record<IndicatorCategory, string> = {
  conclusion: 'Conclusion',
  premise: 'Premise',
  pivot: 'Pivot',
  opinion: 'Opinion',
  opposing: 'Opposing view',
  concession: 'Concession',
};

const CATEGORY_DOT: Record<IndicatorCategory, string> = {
  conclusion: 'bg-[rgb(var(--role-conclusion))]',
  premise: 'bg-[rgb(var(--role-premise))]',
  pivot: 'bg-[rgb(var(--role-pivot))]',
  opinion: 'bg-[rgb(var(--accent))]',
  opposing: 'bg-[rgb(var(--role-opposing))]',
  concession: 'bg-[rgb(var(--role-concession))]',
};

const CATEGORY_PILL_REVEAL: Record<IndicatorCategory, string> = {
  conclusion:
    'bg-[rgb(var(--role-conclusion)/0.18)] text-[rgb(var(--role-conclusion))] border-[rgb(var(--role-conclusion)/0.50)]',
  premise:
    'bg-[rgb(var(--role-premise)/0.16)] text-[rgb(var(--role-premise))] border-[rgb(var(--role-premise)/0.50)]',
  pivot:
    'bg-[rgb(var(--role-pivot)/0.16)] text-[rgb(var(--role-pivot))] border-[rgb(var(--role-pivot)/0.50)]',
  opinion:
    'bg-[rgb(var(--accent)/0.14)] text-mc-accent border-[color:var(--border-accent-mid)]',
  opposing:
    'bg-[rgb(var(--role-opposing)/0.16)] text-[rgb(var(--role-opposing))] border-[rgb(var(--role-opposing)/0.50)]',
  concession:
    'bg-[rgb(var(--role-concession)/0.16)] text-[rgb(var(--role-concession))] border-[rgb(var(--role-concession)/0.50)]',
};

interface Segment {
  kind: 'text' | 'target';
  text: string;
  /** Only for target segments. */
  targetId?: string;
}

/** Split the sentence into text + target pills, in declared target order. */
function splitSentence(sentence: string, targets: Target[]): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  for (const t of targets) {
    const idx = sentence.indexOf(t.word, cursor);
    if (idx === -1) {
      // Target not found — append remainder as text and bail.
      out.push({ kind: 'text', text: sentence.slice(cursor) });
      return out;
    }
    if (idx > cursor) out.push({ kind: 'text', text: sentence.slice(cursor, idx) });
    out.push({ kind: 'target', text: t.word, targetId: t.id });
    cursor = idx + t.word.length;
  }
  if (cursor < sentence.length) out.push({ kind: 'text', text: sentence.slice(cursor) });
  return out;
}

export function IndicatorTagger({ sentence, targets, allowedCategories, onComplete }: Props): JSX.Element {
  const segments = useMemo(() => splitSentence(sentence, targets), [sentence, targets]);
  const [selectedId, setSelectedId] = useState<string | null>(targets[0]?.id ?? null);
  const [picks, setPicks] = useState<Record<string, IndicatorCategory | null>>(
    () => Object.fromEntries(targets.map((t) => [t.id, null])),
  );
  const [submitted, setSubmitted] = useState(false);

  const allLabeled = targets.every((t) => picks[t.id] !== null);
  const correctCount = targets.filter((t) => picks[t.id] === t.correct).length;

  function pick(category: IndicatorCategory) {
    if (submitted || !selectedId) return;
    // Click-again-to-clear: same category twice clears that target.
    setPicks((p) => ({ ...p, [selectedId]: p[selectedId] === category ? null : category }));
    const next = picks[selectedId];
    if (next === category) return; // user just cleared; stay on this target
    // Auto-advance to next unlabeled target.
    const order = targets.map((t) => t.id);
    const ix = order.indexOf(selectedId);
    const nextUnlabeled =
      order.slice(ix + 1).find((id) => picks[id] === null) ??
      order.find((id) => id !== selectedId && picks[id] === null);
    if (nextUnlabeled) setSelectedId(nextUnlabeled);
  }

  function submit() {
    if (!allLabeled || submitted) return;
    setSubmitted(true);
    onComplete?.({ correct: correctCount, total: targets.length });
  }

  function reset() {
    setPicks(Object.fromEntries(targets.map((t) => [t.id, null])));
    setSelectedId(targets[0]?.id ?? null);
    setSubmitted(false);
  }

  return (
    <div className="space-y-5">
      <div
        className={cn(
          'rounded-3 p-5',
          'bg-[image:var(--grad-surface-soft)]',
          'border border-[rgb(var(--border)/0.10)]',
        )}
      >
        <p className="font-mc-serif text-h3 text-ink leading-[1.6]">
          {segments.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
            const t = targets.find((x) => x.id === seg.targetId)!;
            const picked = picks[t.id];
            const isSelected = selectedId === t.id;
            const correct = submitted && picked === t.correct;
            const wrong = submitted && picked !== null && picked !== t.correct;
            return (
              <button
                key={i}
                type="button"
                onClick={() => !submitted && setSelectedId(t.id)}
                aria-pressed={isSelected}
                disabled={submitted}
                className={cn(
                  'inline-flex items-center gap-1 rounded-2 px-1.5 py-0.5 mx-0.5',
                  'border-b-2 align-baseline',
                  'transition-[background,color,border-color] duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                  !submitted &&
                    !picked &&
                    'border-b-[rgb(var(--accent)/0.50)] hover:bg-[rgb(var(--accent)/0.08)]',
                  !submitted &&
                    picked &&
                    cn(CATEGORY_PILL_REVEAL[picked], 'border'),
                  !submitted &&
                    isSelected &&
                    'ring-2 ring-[color:var(--border-accent-strong)] ring-offset-2 ring-offset-[rgb(var(--surface))]',
                  submitted && correct && cn(CATEGORY_PILL_REVEAL[t.correct], 'border'),
                  submitted &&
                    wrong &&
                    'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.50)]',
                )}
              >
                <span>{seg.text}</span>
                {submitted && correct ? (
                  <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                ) : submitted && wrong ? (
                  <XIcon className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </p>
      </div>

      {!submitted ? (
        <div
          className={cn(
            'rounded-3 p-4',
            'bg-[image:var(--grad-surface-soft)]',
            'border border-[rgb(var(--border)/0.10)]',
          )}
          aria-label="Indicator categories"
        >
          <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-3">
            {selectedId
              ? `Pick a category for "${targets.find((t) => t.id === selectedId)?.word}"`
              : 'Tap a highlighted phrase above to label it'}
          </div>
          <div className="flex flex-wrap gap-2">
            {allowedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => pick(cat)}
                disabled={!selectedId}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5',
                  'font-mc-mono text-mono uppercase tracking-wider',
                  'bg-[rgb(var(--surface-elev))] text-ink-soft border-[rgb(var(--border)/0.10)]',
                  'transition-[background,color,border-color] duration-150 ease-eased',
                  'hover:text-ink hover:border-[color:var(--border-accent-soft)]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                  'disabled:opacity-40 disabled:pointer-events-none',
                )}
              >
                <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_DOT[cat])} />
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {submitted ? (
        <ol className="space-y-2">
          {targets.map((t) => {
            const picked = picks[t.id];
            const isRight = picked === t.correct;
            return (
              <li
                key={t.id}
                className={cn(
                  'rounded-3 p-4 border',
                  isRight
                    ? 'bg-[rgb(var(--success)/0.06)] border-[rgb(var(--success)/0.35)]'
                    : 'bg-[rgb(var(--error)/0.06)] border-[rgb(var(--error)/0.35)]',
                )}
              >
                <div className="flex items-center gap-2 font-mc-mono text-mono uppercase tracking-wider">
                  <span
                    aria-label={CATEGORY_LABEL[t.correct]}
                    className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_DOT[t.correct])}
                  />
                  <span className={cn(isRight ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--error))]')}>
                    {isRight ? 'Right' : 'Off'} · {CATEGORY_LABEL[t.correct]}
                  </span>
                  <span className="text-ink-faint normal-case tracking-normal">
                    "{t.word}"
                  </span>
                </div>
                <p className="mt-2 font-mc-serif text-body text-ink leading-relaxed">{t.rationale}</p>
              </li>
            );
          })}
        </ol>
      ) : null}

      {!submitted ? (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mc-mono text-mono text-ink-faint">
            {Object.values(picks).filter((v) => v !== null).length} of {targets.length} tagged
          </p>
          <Button onClick={submit} disabled={!allLabeled}>
            Reveal the indicators
          </Button>
        </div>
      ) : (
        <div
          role="status"
          className={cn(
            'rounded-3 px-4 py-3',
            'bg-[image:var(--grad-surface-soft)]',
            'border border-[color:var(--border-accent-soft)]',
            'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3',
          )}
        >
          <p className="font-mc-serif text-body-prose text-ink">
            <span className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent mr-2">
              You got {correctCount} of {targets.length}
            </span>
            {correctCount === targets.length
              ? 'Clean read across every indicator. Move on.'
              : correctCount === 0
                ? 'Every indicator slipped. Not a grade. A calibration. Read the notes above slowly.'
                : 'Read the per-indicator notes above before you continue.'}
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
