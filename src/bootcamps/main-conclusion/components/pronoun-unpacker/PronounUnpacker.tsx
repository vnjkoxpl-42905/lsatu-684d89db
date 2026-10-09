/**
 * PronounUnpacker — interactive pronoun-replacement demo.
 *
 * Renders a stimulus with pronoun spans marked. Click a span to expand
 * the pronoun in place to its antecedent; click again to collapse back.
 * Used in Lesson 1.10 demo to make the Pre-Phrase Goal physical: students
 * see pronouns swap to their referents, instead of just reading about it.
 *
 * No scoring, no submit. Pure exploration. Pairs with the named-tool-inline
 * visual vocabulary (gold-tinted clickable inline element).
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export interface PronounSpan {
  /** Stable id. */
  id: string;
  /** The pronoun phrase as it appears in the stimulus (e.g. "such laws"). */
  pronoun: string;
  /** What it expands to (e.g. "laws requiring background checks"). */
  antecedent: string;
}

export interface PronounUnpackerProps {
  /** Lead-in copy above the stimulus. */
  prompt?: string;
  /** Stimulus split into ordered segments — text or a clickable pronoun. */
  segments: Array<
    | { kind: 'text'; text: string }
    | { kind: 'pronoun'; spanId: string }
  >;
  spans: PronounSpan[];
  /** Optional caption shown below the stimulus. */
  caption?: string;
}

export function PronounUnpacker({ prompt, segments, spans, caption }: PronounUnpackerProps): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(spans.map((s) => [s.id, false])),
  );
  const reducedMotion = useReducedMotion();
  const expandedCount = Object.values(expanded).filter(Boolean).length;

  function toggle(id: string) {
    setExpanded((m) => ({ ...m, [id]: !m[id] }));
  }

  return (
    <div className="space-y-4">
      {prompt ? (
        <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{prompt}</p>
      ) : null}
      <div
        className={cn(
          'rounded-3 p-5',
          'bg-[image:var(--grad-surface-soft)]',
          'border border-[rgb(var(--border)/0.10)]',
        )}
      >
        <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
          {segments.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
            const span = spans.find((s) => s.id === seg.spanId);
            if (!span) return null;
            const isOpen = !!expanded[span.id];
            return (
              <PronounChip
                key={i}
                pronoun={span.pronoun}
                antecedent={span.antecedent}
                isOpen={isOpen}
                onToggle={() => toggle(span.id)}
                reducedMotion={!!reducedMotion}
              />
            );
          })}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mc-mono text-mono text-ink-faint">
          {caption ?? 'Tap each pronoun to replace it with its antecedent.'}
        </p>
        <p className="font-mc-mono text-mono text-ink-faint" role="status" aria-live="polite">
          {expandedCount} of {spans.length} unpacked
        </p>
      </div>
    </div>
  );
}

function PronounChip({
  pronoun,
  antecedent,
  isOpen,
  onToggle,
  reducedMotion,
}: {
  pronoun: string;
  antecedent: string;
  isOpen: boolean;
  onToggle: () => void;
  reducedMotion: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={isOpen}
      aria-label={isOpen ? `Collapse "${antecedent}" back to "${pronoun}"` : `Expand "${pronoun}" to its antecedent`}
      onClick={onToggle}
      className={cn(
        'mx-0.5 inline-flex items-baseline rounded-2 px-1.5 py-0 align-baseline',
        'font-mc-serif text-body-prose',
        'transition-colors duration-150 ease-eased motion-reduce:transition-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
        isOpen
          ? 'bg-[rgb(var(--accent)/0.18)] text-[rgb(var(--accent))] border border-[color:var(--border-accent-mid)]'
          : 'bg-[rgb(var(--accent)/0.08)] text-[rgb(var(--accent))] border border-[color:var(--border-accent-soft)] hover:bg-[rgb(var(--accent)/0.14)]',
      )}
    >
      <motion.span
        key={isOpen ? 'open' : 'closed'}
        initial={reducedMotion ? false : { opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="inline-block"
      >
        {isOpen ? antecedent : pronoun}
      </motion.span>
    </button>
  );
}
