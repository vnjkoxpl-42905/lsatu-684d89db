/**
 * AbsoluteStatementsWalk — guided demo of unqualified language at full force.
 *
 * Walks the student through N scenarios. Each scenario shows the original
 * full-force claim, then on tap reveals the Invalidation Test (one
 * counter-example breaks the claim), then on second tap shows the Softened
 * Contrast (the same claim with a hedging word that opens the door).
 *
 * Used in Lesson 1.13 demo. No scoring. Pure exploration. Completion is
 * implicit — the student walks all scenarios to see the pattern.
 *
 * Source: P-B Module 08 (arguments-main prototype). Voice tightened to
 * match PRODUCT.md (no em-dashes in computed copy, no LSAT-industry vocab).
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Target, ShieldAlert } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export interface AbsoluteScenario {
  id: string;
  /** The unqualified statement as the author wrote it. */
  statement: string;
  /** Why this is full-force language. */
  explanation: string;
  /** What single counter-example would do. */
  invalidation: string;
  /** Same claim with a hedge word inserted. */
  softened: string;
  /** The hedge word that opens the door. */
  softWord: string;
  /** Why that hedge changes the analysis. */
  softReason: string;
}

interface Props {
  scenarios: AbsoluteScenario[];
  /** Optional caption above the walker. */
  caption?: string;
}

type Step = 0 | 1 | 2; // 0 = statement only; 1 = invalidation revealed; 2 = softened contrast revealed

export function AbsoluteStatementsWalk({ scenarios, caption }: Props): JSX.Element {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>(0);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const reducedMotion = useReducedMotion();

  const scenario = scenarios[index]!;
  const isLast = index === scenarios.length - 1;
  const allSeen = seen.size === scenarios.length;

  function advance() {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      // Mark this scenario complete once both reveals are visible.
      setSeen((prev) => new Set(prev).add(index));
      return;
    }
    // step === 2: move to next scenario or stop.
    if (!isLast) {
      setIndex(index + 1);
      setStep(0);
    }
  }

  return (
    <div className="space-y-4">
      {caption ? (
        <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{caption}</p>
      ) : null}

      <div
        className={cn(
          'rounded-3 p-5 desktop:p-6',
          'bg-[image:var(--grad-surface-soft)]',
          'border border-[rgb(var(--border)/0.10)]',
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">
            Scenario {index + 1} of {scenarios.length}
          </div>
          <div className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--warn))]">
            100% full force
          </div>
        </div>

        <p className="mt-3 font-mc-serif text-h3 text-ink leading-snug">
          &quot;{scenario.statement}&quot;
        </p>
        <p className="mt-3 font-mc-serif text-body-prose text-ink-soft leading-relaxed">
          {scenario.explanation}
        </p>

        {step >= 1 ? (
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'mt-5 rounded-3 px-4 py-3',
              'bg-[rgb(var(--warn)/0.08)] border border-[rgb(var(--warn)/0.32)]',
            )}
            aria-label="Invalidation test"
          >
            <div className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--warn))] inline-flex items-center gap-2">
              <Target className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              Invalidation test
            </div>
            <p className="mt-2 font-mc-serif text-body-prose text-ink leading-relaxed">
              {scenario.invalidation}
            </p>
          </motion.section>
        ) : null}

        {step >= 2 ? (
          <motion.section
            initial={reducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'mt-3 rounded-3 px-4 py-3',
              'bg-[rgb(var(--success)/0.08)] border border-[rgb(var(--success)/0.32)]',
            )}
            aria-label="Softened contrast"
          >
            <div className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--success))] inline-flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
              Softened contrast
            </div>
            <p className="mt-2 font-mc-serif text-h3 text-ink leading-snug">
              &quot;{scenario.softened}&quot;
            </p>
            <p className="mt-2 font-mc-serif text-body-prose text-ink-soft leading-relaxed">
              <span className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--success))] mr-2">
                {scenario.softWord}
              </span>
              {scenario.softReason}
            </p>
          </motion.section>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="font-mc-mono text-mono text-ink-faint" role="status" aria-live="polite">
          {seen.size} of {scenarios.length} walked
        </p>
        {step < 2 ? (
          <Button
            onClick={advance}
            leftIcon={
              step === 0 ? (
                <Target className="h-3.5 w-3.5" strokeWidth={2.2} />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.2} />
              )
            }
          >
            {step === 0 ? 'Apply invalidation test' : 'Show softened contrast'}
          </Button>
        ) : !isLast ? (
          <Button
            onClick={advance}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}
          >
            Next scenario
          </Button>
        ) : (
          <span className="font-mc-mono text-mono text-[rgb(var(--success))] uppercase tracking-wider">
            {allSeen ? 'all four walked' : 'walk every scenario to continue'}
          </span>
        )}
      </div>
    </div>
  );
}
