/**
 * DrillVerdict — shared end-of-drill verdict for Intro to LR runnable labs.
 *
 * Calibration framing (mirrors the Flaw bootcamp's VerdictScreen, rebuilt on
 * mc design tokens): score at/above threshold reads "Calibrated.", below reads
 * "Re-run open." Every drill ends with coach copy and a concrete next step, not
 * a bare number. The optional ItemReadout lists each item as OK / MISS.
 */

import { ArrowRight, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export interface DrillVerdictItem {
  id: string;
  ok: boolean;
  /** Short prompt or stimulus snippet shown in the item-by-item readout. */
  prompt: string;
}

export interface DrillVerdictProps {
  /** Eyebrow label, e.g. "Conclusion Type Lab". */
  label: string;
  correct: number;
  total: number;
  /** Pass-mark as a fraction (0–1). Defaults to 0.8. */
  calibrationThreshold?: number;
  /** Coach copy shown when the student calibrates. */
  calibratedLead: string;
  /** Coach copy shown when the student is below threshold. */
  repeatLead: string;
  /** Concrete pointer to the next move. */
  nextStep: string;
  /** Optional per-item OK / MISS breakdown. */
  items?: DrillVerdictItem[];
  onRerun: () => void;
  rerunLabel?: string;
  nextActionRoute?: string;
  nextActionLabel?: string;
  nextActionState?: unknown;
}

export function DrillVerdict({
  label,
  correct,
  total,
  calibrationThreshold = 0.8,
  calibratedLead,
  repeatLead,
  nextStep,
  items,
  onRerun,
  rerunLabel = 'Run it again',
  nextActionRoute,
  nextActionLabel,
  nextActionState,
}: DrillVerdictProps) {
  const score = total === 0 ? 0 : correct / total;
  const calibrated = score >= calibrationThreshold;

  return (
    <div className="mc-bootcamp mx-auto w-full max-w-[760px] space-y-6">
      <Card variant="elev" accent={calibrated} className="space-y-6 p-8">
        <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">{label}</p>

        <div className="space-y-2">
          <p
            className={cn(
              'font-mc-mono text-mono uppercase tracking-[0.18em]',
              calibrated ? 'text-mc-success' : 'text-ink-faint',
            )}
          >
            Verdict
          </p>
          <h2
            className={cn(
              'font-mc-serif text-display font-semibold leading-none',
              calibrated ? 'text-mc-success' : 'text-ink',
            )}
          >
            {calibrated ? 'Calibrated.' : 'Re-run open.'}
          </h2>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <div className="font-mc-serif text-[3.5rem] font-semibold leading-none text-ink">
            {correct}
            <span className="text-ink-faint">/{total}</span>
          </div>
          <p className="font-mc-mono text-mono uppercase tracking-[0.16em] text-ink-faint">
            {Math.round(score * 100)}% <span className="text-ink-faint/50">·</span> pass {Math.round(calibrationThreshold * 100)}%
          </p>
        </div>

        <p className="max-w-prose font-mc-serif text-body-prose leading-relaxed text-ink-soft">
          {calibrated ? calibratedLead : repeatLead}
        </p>

        <p className="max-w-prose font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
          {nextStep}
        </p>

        {items && items.length > 0 ? <ItemReadout items={items} /> : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button onClick={onRerun} leftIcon={<RefreshCcw className="h-4 w-4" strokeWidth={2.2} />}>
            {rerunLabel}
          </Button>
          {nextActionRoute ? (
            <Link
              to={nextActionRoute}
              state={nextActionState}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[rgb(var(--border)/0.22)] bg-[rgb(var(--surface))] px-4 font-mc-mono text-body uppercase tracking-[0.16em] text-ink transition-colors hover:bg-[rgb(var(--surface-elev))]"
            >
              {nextActionLabel ?? 'Continue'}
              <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function ItemReadout({ items }: { items: DrillVerdictItem[] }) {
  return (
    <details className="group border-t border-[rgb(var(--border)/0.10)] pt-5">
      <summary className="cursor-pointer select-none font-mc-mono text-mono uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-ink">
        Item-by-item readout
        <span className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
      </summary>
      <ol className="mt-4 space-y-3">
        {items.map((item, i) => (
          <li key={item.id} className="flex items-start gap-3 text-body">
            <span className="font-mc-mono text-mono tabular-nums text-ink-faint">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'shrink-0 font-mc-mono text-mono uppercase tracking-[0.12em]',
                item.ok ? 'text-mc-success' : 'text-mc-warn',
              )}
            >
              {item.ok ? 'OK' : 'MISS'}
            </span>
            <span className="flex-1 font-mc-serif leading-snug text-ink-soft">{item.prompt}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
