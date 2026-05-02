/**
 * MC-DIA-6.2 · Dashboard.
 * Module rings + trait heatmap + mastery + calibration seed signal.
 */

import { Link } from 'react-router-dom';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import {
  aggregateTraitStats,
  moduleViews,
  calibrationSeed,
  TRAITS,
  type TraitStats,
} from '@/bootcamps/main-conclusion/lib/diagnostics';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

export function Dashboard() {
  const d = useDiagnostics();
  if (d.loading) {
    return (
      <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }
  const seed = calibrationSeed(d.calibrationAttempts);
  const traits = aggregateTraitStats(d.trapsTags);
  const modules = moduleViews(d.progress);

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow="Diagnostics" title="Dashboard" compact />

      {!seed.attempted ? (
        <Card variant="elev" className="border-l-4 border-l-[rgb(var(--accent)/0.50)]">
          <Badge tone="warn">awaiting seed</Badge>
          <h2 className="font-mc-serif text-h2 font-semibold mt-2">No data yet</h2>
          <p className="font-mc-serif text-body-prose text-ink mt-2">
            The dashboard activates after your first M1.13 calibration attempt.{' '}
            <Link to="/bootcamp/intro-to-lr/lessons/1.13" className="text-mc-accent hover:underline">
              Take the calibration →
            </Link>
          </p>
        </Card>
      ) : null}

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Module progress</h2>
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modules.map((m) => (
            <li key={m.module}>
              <Card variant="surface" className="text-center">
                <ProgressRing pct={m.pct} />
                <div className="font-mc-mono text-mono text-ink-faint mt-2">{m.module}</div>
                <div className="font-mc-serif text-body font-semibold">{m.label}</div>
                {m.total > 0 ? (
                  <div className="font-mc-mono text-mono text-ink-soft mt-1">
                    {m.completed} / {m.total}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Trait heatmap</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-7 grid-cols-4">
          {traits.map((t) => (
            <li key={t.trait}>
              <TraitCell stat={t} />
            </li>
          ))}
        </ul>
        <p className="font-mc-mono text-mono text-ink-faint mt-2">
          Lower bars = lower accuracy on that trait. Hover a tile for stats.
        </p>
      </section>

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Calibration seed</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card variant="surface">
            <div className="font-mc-mono text-mono text-ink-faint">M1.13</div>
            <p className="font-mc-serif text-body-prose text-ink mt-1">
              {seed.m1.attempts} attempt{seed.m1.attempts === 1 ? '' : 's'} · {seed.m1.correct} correct
            </p>
          </Card>
          <Card variant="surface">
            <div className="font-mc-mono text-mono text-ink-faint">M5.8</div>
            <p className="font-mc-serif text-body-prose text-ink mt-1">
              {seed.m5.attempts} attempt{seed.m5.attempts === 1 ? '' : 's'} · {seed.m5.correct} correct
            </p>
          </Card>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link to="/bootcamp/intro-to-lr/diagnostics/recommendations">
          <Chip tone="accent">Recommendations →</Chip>
        </Link>
        <Link to="/bootcamp/intro-to-lr/diagnostics/srs">
          <Chip tone="accent">SRS queue →</Chip>
        </Link>
        <Link to="/bootcamp/intro-to-lr/diagnostics/trait-profile">
          <Chip tone="accent">Trait profile →</Chip>
        </Link>
      </section>
    </article>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const off = c * (1 - clamped);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="mx-auto" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--border) / 0.18)" strokeWidth="6" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="rgb(var(--accent) / 0.85)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 32 32)"
      />
      <text x="32" y="36" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="11" fill="currentColor">
        {Math.round(clamped * 100)}%
      </text>
    </svg>
  );
}

function TraitCell({ stat }: { stat: TraitStats }) {
  const accClass =
    stat.attempts === 0
      ? 'bg-[rgb(var(--surface-elev))] text-ink-faint'
      : stat.accuracy >= 0.8
        ? 'bg-[rgb(var(--success)/0.18)] text-[rgb(var(--success))]'
        : stat.accuracy >= 0.5
          ? 'bg-[rgb(var(--warn)/0.16)] text-[rgb(var(--warn))]'
          : 'bg-[rgb(var(--error)/0.16)] text-[rgb(var(--error))]';
  const title =
    stat.attempts === 0
      ? `${stat.trait}: no attempts yet`
      : `${stat.trait}: ${Math.round(stat.accuracy * 100)}% (${stat.correct}/${stat.attempts}); picked-when-wrong ${stat.picked_when_wrong}`;
  return (
    <div className={`rounded-3 px-2 py-3 text-center font-mc-mono text-mono ${accClass}`} title={title}>
      <div className="font-semibold">{stat.trait}</div>
      <div className="opacity-70">{stat.attempts === 0 ? '—' : `${Math.round(stat.accuracy * 100)}%`}</div>
    </div>
  );
}

// Re-export TRAITS as a side-effect so consumers don't need a second import path.
export { TRAITS };
