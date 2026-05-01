import { Link } from 'react-router-dom';
import {
  BookOpen,
  Library,
  Dumbbell,
  Target,
  ScanText,
  LineChart,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const BC = '/bootcamp/intro-to-lr';

interface ModuleRow {
  id: string;
  name: string;
  to: string;
  desc: string;
  Icon: LucideIcon;
  highlight?: boolean;
}

const modules: ModuleRow[] = [
  {
    id: 'M1',
    name: 'Lessons',
    to: `${BC}/lessons`,
    desc: '12 voice-led lessons + capstone calibration. Voice register 2 (whimsical) for prose; register 1 (decisive) for callouts.',
    Icon: BookOpen,
    highlight: true,
  },
  {
    id: 'M2',
    name: 'Reference + Indicator Vault',
    to: `${BC}/reference`,
    desc: 'Glanceable companion. The Indicator Vault, FABS, the 2-Part Conclusion Check. Always accessible.',
    Icon: Library,
  },
  {
    id: 'M3',
    name: 'Drills',
    to: `${BC}/drills`,
    desc: '9 drills, stratified by mechanic. Each drill is its own Stage-Gate.',
    Icon: Dumbbell,
  },
  {
    id: 'M4',
    name: 'Question Simulator + Trap Master',
    to: `${BC}/simulator`,
    desc: 'Real LSAT-format questions with full 5-choice answer set + 7-trait diagnostic. Unlocks after Drill 3.4.',
    Icon: Target,
  },
  {
    id: 'M5',
    name: 'Reading Hard Sentences',
    to: `${BC}/hard-sentences`,
    desc: 'Decompose monsters called cluster sentences.',
    Icon: ScanText,
  },
  {
    id: 'M6',
    name: 'Diagnostics + AI Tutor + Progress',
    to: `${BC}/diagnostics`,
    desc: 'Calibration after teaching, not gatekeeping before. Populates after Lesson 1.13 capstone.',
    Icon: LineChart,
  },
];

export function ModuleIndex(): JSX.Element {
  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[1100px] mx-auto">
      <Hero />

      <ul className="mt-12 grid desktop:grid-cols-2 gap-4">
        {modules.map((m) => (
          <li key={m.id}>
            <Link
              to={m.to}
              className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
            >
              <Card variant="surface" interactive accent={m.highlight}>
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-3',
                      'bg-[image:var(--grad-accent-soft)]',
                      'border border-[color:var(--border-accent-soft)]',
                      'text-mc-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
                    )}
                  >
                    <m.Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">
                        {m.id}
                      </span>
                      {m.highlight ? <Badge tone="accent" dot>start here</Badge> : null}
                    </div>
                    <h3 className="font-mc-serif text-h2 font-semibold mt-1.5 text-ink leading-tight">
                      {m.name}
                    </h3>
                    <p className="text-body text-ink-soft mt-2 leading-relaxed">{m.desc}</p>
                  </div>
                  <ArrowRight
                    className="shrink-0 h-4 w-4 text-ink-faint mt-1 transition-transform duration-220 ease-eased group-hover:translate-x-0.5 group-hover:text-mc-accent"
                    aria-hidden="true"
                  />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 font-mc-mono text-mono text-ink-faint flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
        />
        Six modules, gate-driven, calibration after teaching.
      </p>
    </div>
  );
}

function Hero(): JSX.Element {
  return (
    <header className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-72 w-[640px] max-w-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.22), transparent 70%)' }}
      />
      <div className="relative">
        <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
          />
          Intro to LR · Logical Reasoning Bootcamp
        </div>
        <h1 className="font-mc-serif text-display font-semibold mt-3 leading-[1.05] text-ink">
          The most salvageable
          <br />
          question type ever.
        </h1>
        <p className="font-mc-serif text-body-prose mt-5 text-ink-soft max-w-[64ch] leading-relaxed">
          A premium private-academy bootcamp for Main Conclusion and Argument Structure. Six modules,
          gate-driven, calibration after teaching. Start with Lesson 1.1.
        </p>
      </div>
    </header>
  );
}
