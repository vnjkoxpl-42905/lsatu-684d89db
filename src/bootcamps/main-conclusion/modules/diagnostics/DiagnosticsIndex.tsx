/**
 * Module 6: Diagnostics — index + 7 surfaces (Phase F).
 * Index links to philosophy, dashboard, recommendations, R&R review, trait, mistake, SRS.
 */

import { Link } from 'react-router-dom';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';

interface Section {
  id: string;
  title: string;
  route: string;
  blurb: string;
}

export const DIAG_SECTIONS: Section[] = [
  {
    id: 'MC-DIA-6.1',
    title: 'Philosophy',
    route: '/diagnostics/philosophy',
    blurb: 'How this app diagnoses, and what it refuses to do.',
  },
  {
    id: 'MC-DIA-6.2',
    title: 'Dashboard',
    route: '/diagnostics/dashboard',
    blurb: 'Module rings · trait heatmap · mastery badges.',
  },
  {
    id: 'MC-DIA-6.3',
    title: 'Recommendations',
    route: '/diagnostics/recommendations',
    blurb: 'Targeted drills + SRS items, surfaced from your trait performance.',
  },
  {
    id: 'MC-DIA-6.4',
    title: 'R&R Review',
    route: '/diagnostics/rr-review',
    blurb: 'Recordings, transcripts, review prompts.',
  },
  {
    id: 'MC-DIA-6.5',
    title: 'Trait Diagnostic',
    route: '/diagnostics/trait-profile',
    blurb: 'Per-trait accuracy + which traps you fall for most.',
  },
  {
    id: 'MC-DIA-6.6',
    title: 'Mistake Profile',
    route: '/diagnostics/mistake-profile',
    blurb: 'The patterns under your wrong answers.',
  },
  {
    id: 'MC-DIA-6.7',
    title: 'SRS Queue',
    route: '/diagnostics/srs',
    blurb: 'SM-2 spaced repetition over missed questions.',
  },
];

export function DiagnosticsIndex() {
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <header className="mb-6">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Module 6</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Diagnostics</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-3">
          Calibration after teaching, not gatekeeping before. The dashboard seeds the moment you finish
          your first capstone.
        </p>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2">
        {DIAG_SECTIONS.map((s) => (
          <li key={s.id}>
            <Link to={s.route.startsWith('/bootcamp/intro-to-lr') ? s.route : `/bootcamp/intro-to-lr${s.route}`} className="block">
              <Card variant="surface" className="hover:border-[rgb(var(--accent)/0.30)] transition-colors">
                <div className="font-mc-mono text-mono text-ink-faint">{s.id}</div>
                <h3 className="font-mc-serif text-h3 font-semibold mt-1">{s.title}</h3>
                <p className="font-mc-serif text-body-prose text-ink-soft mt-2">{s.blurb}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
