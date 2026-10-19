import type { BootcampDay } from '../../content/bootcamp/days';
import { useModuleStore, type DayId } from '../../lib/store';
import { cn } from '../../lib/utils';

export interface VerdictResult {
  id: string;
  ok: boolean;
  prompt: string;
}

/**
 * End-of-day verdict screen.
 * Calibration framing: above threshold = "calibrated"; below = "re-run open".
 */
export function VerdictScreen({
  day,
  correct,
  total,
  results,
  onSelectDay,
}: {
  day: BootcampDay;
  correct: number;
  total: number;
  results: VerdictResult[];
  onSelectDay?: (day: DayId) => void;
}) {
  const score = total === 0 ? 0 : correct / total;
  const calibrated = score >= day.verdict.calibrationThreshold;
  const resetDay = useModuleStore((s) => s.resetDay);
  const nextId = day.id < 6 ? ((day.id + 1) as DayId) : null;

  return (
    <section
      aria-label="Verdict"
      className={cn(
        'mx-auto max-w-3xl border-t px-6 py-14',
        calibrated ? 'border-verdigris' : 'border-rule',
      )}
    >
      <div className="protocol text-ink-mute">Verdict</div>
      <h2
        className={cn(
          'mt-2 display-title text-5xl leading-none md:text-6xl',
          calibrated ? 'text-verdigris-deep' : 'text-ink',
        )}
      >
        {calibrated ? 'Calibrated.' : 'Re-run open.'}
      </h2>

      <div className="mt-6 flex items-baseline gap-6">
        <div className="display-title text-7xl text-ink md:text-8xl">
          {correct}
          <span className="text-ink-mute">/{total}</span>
        </div>
        <div className="protocol text-ink-mute">
          {Math.round(score * 100)}% <span className="text-rule">·</span>{' '}
          threshold {Math.round(day.verdict.calibrationThreshold * 100)}%
        </div>
      </div>

      <p className="mt-8 max-w-prose font-display text-2xl italic leading-snug text-ink">
        {calibrated ? day.verdict.calibratedLead : day.verdict.repeatLead}
      </p>

      <p className="mt-6 max-w-prose protocol text-ink-mute">
        {day.verdict.nextStep}
      </p>

      <ItemReadout results={results} />

      <div className="mt-10 flex flex-wrap items-center gap-3">
        {nextId && (
          <button
            type="button"
            onClick={() => onSelectDay?.(nextId)}
            className={cn(
              'protocol inline-flex items-center border px-4 py-2 text-xs transition-colors',
              calibrated
                ? 'border-verdigris-deep bg-verdigris text-paper hover:bg-verdigris-deep'
                : 'border-ink bg-ink text-paper hover:bg-ink-soft',
            )}
          >
            Continue · Day {String(nextId).padStart(2, '0')} →
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            resetDay(day.id as DayId);
            window.location.reload();
          }}
          className="protocol inline-flex items-center border border-rule bg-paper px-4 py-2 text-xs text-ink transition-colors hover:border-ink hover:bg-paper-bright"
        >
          Re-run Day {String(day.id).padStart(2, '0')}
        </button>
        <span className="protocol inline-flex items-center border border-rule bg-paper px-4 py-2 text-xs text-ink">
          Open the catalog
        </span>
      </div>
    </section>
  );
}

function ItemReadout({ results }: { results: VerdictResult[] }) {
  return (
    <details className="mt-10 border-t border-rule-soft pt-5">
      <summary className="cursor-pointer protocol text-ink-mute hover:text-ink">
        Item-by-item readout ↓
      </summary>
      <ol className="mt-4 space-y-3">
        {results.map((r, i) => (
          <li key={r.id} className="flex items-start gap-3 text-sm">
            <span className="protocol text-ink-mute">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'protocol text-xs',
                r.ok ? 'text-verdigris-deep' : 'text-strike',
              )}
            >
              {r.ok ? 'OK' : 'MISS'}
            </span>
            <span className="flex-1 leading-snug text-ink-soft">
              {r.prompt}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
