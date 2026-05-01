/**
 * Module 6: Diagnostics — index + 7 surfaces (Phase F).
 * Index links to philosophy, dashboard, recommendations, R&R review, trait, mistake, SRS.
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
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
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
    blurb: 'Targeted drills + SRS items, surfaced from your trait performance.',
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
    blurb: 'SM-2 spaced repetition over missed questions.',
    Icon: RefreshCcw,
  },
];

export function DiagnosticsIndex() {
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-4xl mx-auto">
      <header className="relative isolate mb-10">
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
            Module 6
          </div>
          <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
            Diagnostics
          </h1>
          <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
            Calibration after teaching, not gatekeeping before. The dashboard seeds the moment you finish
            your first capstone.
          </p>
        </div>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {DIAG_SECTIONS.map((s) => (
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
                    <div className="font-mc-mono text-mono text-ink-faint">{s.id}</div>
                    <h3
                      className={cn(
                        'font-mc-serif text-h3 font-semibold mt-1 leading-tight',
                        'transition-colors duration-150 ease-eased',
                        'text-ink group-hover:text-mc-accent',
                      )}
                    >
                      {s.title}
                    </h3>
                    <p className="font-mc-serif text-body-prose text-ink-soft mt-2 leading-relaxed">{s.blurb}</p>
                  </div>
                  <ArrowUpRight
                    className="shrink-0 h-4 w-4 mt-0.5 text-ink-faint transition-all duration-220 ease-eased group-hover:text-mc-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
