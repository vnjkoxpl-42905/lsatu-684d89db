/**
 * Module 6: Diagnostics hub.
 * Honest empty state — until the M1 capstone is taken, the dashboard has no data
 * to render, so the hub leads with "take the calibration" instead of a 7-card grid.
 * Once seeded, secondary surfaces become reachable.
 */

import { Link } from 'react-router-dom';
import {
  BookHeart,
  Gauge,
  Wand2,
  Mic,
  ScatterChart,
  AlertTriangle,
  RefreshCcw,
  ArrowRight,
  ArrowUpRight,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { calibrationSeed } from '@/bootcamps/main-conclusion/lib/diagnostics';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface Section {
  id: string;
  title: string;
  route: string;
  blurb: string;
  Icon: LucideIcon;
}

export const DIAG_SECTIONS: Section[] = [
  {
    id: 'MC-DIA-6.1',
    title: 'Philosophy',
    route: '/diagnostics/philosophy',
    blurb: 'How this app diagnoses, and what it refuses to do.',
    Icon: BookHeart,
  },
  {
    id: 'MC-DIA-6.2',
    title: 'Dashboard',
    route: '/diagnostics/dashboard',
    blurb: 'Module rings · trait heatmap · mastery badges.',
    Icon: Gauge,
  },
  {
    id: 'MC-DIA-6.3',
    title: 'Recommendations',
    route: '/diagnostics/recommendations',
    blurb: 'Targeted drills + spaced-repetition items, surfaced from your trait performance.',
    Icon: Wand2,
  },
  {
    id: 'MC-DIA-6.4',
    title: 'R&R Review',
    route: '/diagnostics/rr-review',
    blurb: 'Recordings, transcripts, review prompts.',
    Icon: Mic,
  },
  {
    id: 'MC-DIA-6.5',
    title: 'Trait Diagnostic',
    route: '/diagnostics/trait-profile',
    blurb: 'Per-trait accuracy + which traps you fall for most.',
    Icon: ScatterChart,
  },
  {
    id: 'MC-DIA-6.6',
    title: 'Mistake Profile',
    route: '/diagnostics/mistake-profile',
    blurb: 'The patterns under your wrong answers.',
    Icon: AlertTriangle,
  },
  {
    id: 'MC-DIA-6.7',
    title: 'SRS Queue',
    route: '/diagnostics/srs',
    blurb: 'Spaced repetition over missed questions.',
    Icon: RefreshCcw,
  },
];

export function DiagnosticsIndex() {
  const d = useDiagnostics();
  const seed = d.loading ? null : calibrationSeed(d.calibrationAttempts);
  const hasData = !!seed?.attempted;

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-4xl mx-auto space-y-8">
      <header className="relative isolate">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.20), transparent 70%)' }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
            />
            Diagnostics
          </div>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
            Calibration after teaching
          </h1>
          <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
            We do not score you before we teach you. The dashboard activates the moment your first
            calibration is in.
          </p>
        </div>
      </header>

      {!hasData ? (
        <section
          className={cn(
            'relative isolate overflow-hidden rounded-5 p-6 desktop:p-7',
            'bg-[image:var(--grad-surface-elev)]',
            'border border-[color:var(--border-accent-soft)]',
            'shadow-[var(--shadow-3),var(--glow-accent-soft)]',
          )}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--border-accent-strong)] to-transparent"
          />
          <div className="relative flex flex-col desktop:flex-row desktop:items-center desktop:justify-between gap-5">
            <div className="min-w-0 flex-1">
              <Badge tone="warn" dot>
                awaiting first calibration
              </Badge>
              <h2 className="font-mc-serif text-h1 font-semibold mt-3 text-ink leading-tight">
                Take the Lesson 13 calibration
              </h2>
              <p className="font-mc-serif text-body-prose mt-3 text-ink-soft leading-relaxed">
                The dashboard, recommendations, and trait profile all populate from your calibration.
                Until then, this surface is honestly empty.
              </p>
              <div className="mt-4">
                <Link
                  to="/bootcamp/intro-to-lr/lessons/1.13"
                  className="rounded-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
                >
                  <Button
                    size="lg"
                    leftIcon={<Award className="h-4 w-4" strokeWidth={2.2} />}
                    rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
                  >
                    Start calibration
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section
          className={cn(
            'rounded-4 p-5',
            'bg-[image:var(--grad-surface-soft)]',
            'border border-[rgb(var(--border)/0.08)]',
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="success" dot>
              dashboard active
            </Badge>
            <span className="font-mc-mono text-mono text-ink-faint">
              {seed!.m1.attempts} M1 attempt{seed!.m1.attempts === 1 ? '' : 's'} · {seed!.m1.correct} correct
            </span>
            <Link
              to="/bootcamp/intro-to-lr/diagnostics/dashboard"
              className="ml-auto font-mc-mono text-mono text-mc-accent hover:underline underline-offset-4"
            >
              Open dashboard →
            </Link>
          </div>
        </section>
      )}

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint mb-4">
          Diagnostic surfaces
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {DIAG_SECTIONS.map((s) => {
            // The Philosophy page is always reachable. Everything else needs the seed
            // to show real data — but we don't lock the routes (preview mode is on);
            // we just signal honestly which surfaces have data behind them.
            const isAlwaysOn = s.id === 'MC-DIA-6.1';
            return (
              <li key={s.id}>
                <Link
                  to={s.route.startsWith('/bootcamp/intro-to-lr') ? s.route : `/bootcamp/intro-to-lr${s.route}`}
                  className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
                >
                  <Card variant="surface" interactive>
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-3',
                          'bg-[image:var(--grad-accent-soft)]',
                          'border border-[color:var(--border-accent-soft)]',
                          'text-mc-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
                        )}
                      >
                        <s.Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isAlwaysOn ? null : !hasData ? (
                            <Badge tone="neutral">no data yet</Badge>
                          ) : null}
                        </div>
                        <h3
                          className={cn(
                            'font-mc-serif text-h3 font-semibold leading-tight',
                            'transition-colors duration-150 ease-eased',
                            'text-ink group-hover:text-mc-accent',
                          )}
                        >
                          {s.title}
                        </h3>
                        <p className="font-mc-serif text-body-prose text-ink-soft mt-2 leading-relaxed">
                          {s.blurb}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="shrink-0 h-4 w-4 mt-0.5 text-ink-faint transition-all duration-220 ease-eased group-hover:text-mc-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </article>
  );
}
