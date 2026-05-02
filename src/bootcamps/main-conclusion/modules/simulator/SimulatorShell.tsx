/**
 * Module 4: Simulator shell pages.
 * Question bank reads simulator.generated.json.
 */

import { Link } from 'react-router-dom';
import { Library, Bug, Flame, ArrowRight } from 'lucide-react';
import sim from '@/bootcamps/main-conclusion/data/simulator.generated.json';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { LucideIcon } from 'lucide-react';

interface SimQ {
  id: string;
  number: number;
  title: string;
  structure_family: 'First-sentence' | 'Rebuttal';
  stimulus?: string;
  main_conclusion?: string;
  why?: string;
  structure_map?: string;
  follow_up_answer?: string;
  source_anchor: { primary: string; secondary: string; tertiary: string; spec_ref: string };
  ocr_status: 'captured' | 'pending';
}

export function SimulatorOverview() {
  const overviewLinks: Array<{ to: string; title: string; desc: string; Icon: LucideIcon }> = [
    {
      to: '/bootcamp/intro-to-lr/simulator/bank',
      title: 'Question bank',
      desc: 'All 20 questions in canonical order.',
      Icon: Library,
    },
    {
      to: '/bootcamp/intro-to-lr/simulator/trap-master',
      title: 'Trap Master',
      desc: 'Seven trap traits with deep-dive pages.',
      Icon: Bug,
    },
    {
      to: '/bootcamp/intro-to-lr/simulator/hard-mode',
      title: 'Hard mode',
      desc: 'Five hardest questions per your performance.',
      Icon: Flame,
    },
  ];
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Module 4"
        title="Question Simulator"
        description="The canonical 20. Two structure families: First-sentence (9 Qs) and Rebuttal (11 Qs). Wrong answers tagged with one of the seven trap traits."
      />
      <ul className="grid gap-3 sm:grid-cols-3">
        {overviewLinks.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
            >
              <Card variant="surface" interactive>
                <div
                  className={cn(
                    'inline-flex h-9 w-9 items-center justify-center rounded-3 mb-3',
                    'bg-[image:var(--grad-accent-soft)]',
                    'border border-[color:var(--border-accent-soft)]',
                    'text-mc-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]',
                  )}
                >
                  <l.Icon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </div>
                <h2
                  className={cn(
                    'font-mc-serif text-h3 font-semibold leading-tight inline-flex items-center gap-1.5',
                    'transition-colors duration-150 ease-eased',
                    'text-ink group-hover:text-mc-accent',
                  )}
                >
                  {l.title}
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform duration-220 ease-eased group-hover:translate-x-0.5"
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                </h2>
                <p className="font-mc-serif text-body-prose text-ink-soft mt-2 leading-relaxed">{l.desc}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function QuestionBank() {
  const items = sim as SimQ[];
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <PageHeader
        eyebrow="Simulator"
        title="Question bank · 20"
        description="Stimuli + main conclusions populated. Distractors author at Phase D."
      />
      <ul className="space-y-3">
        {items.map((q) => (
          <li key={q.id}>
            <Card variant="surface" data-question-id={q.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  
                  <h3 className="font-mc-serif text-h3 font-semibold mt-1 text-ink leading-tight">
                    Q{q.number} · {q.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Chip tone={q.structure_family === 'Rebuttal' ? 'opposing' : 'conclusion'}>
                    {q.structure_family}
                  </Chip>
                  <Badge tone={q.ocr_status === 'captured' ? 'success' : 'warn'} dot>
                    {q.ocr_status}
                  </Badge>
                </div>
              </div>
              {q.stimulus ? (
                <p className="font-mc-serif text-body-prose text-ink mt-3 leading-relaxed">{q.stimulus}</p>
              ) : null}
              {q.main_conclusion ? (
                <p className="font-mc-serif text-body-prose mt-3 leading-relaxed">
                  <span className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">
                    Main conclusion ·{' '}
                  </span>
                  <span className="text-ink">{q.main_conclusion}</span>
                </p>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </article>
  );
}

interface Trait {
  id: string;
  name: string;
  what: string;
}

export function TrapMaster() {
  const items = traps as Trait[];
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <PageHeader eyebrow="Simulator" title="Trap Master · 7 traits" />
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              to={`/bootcamp/intro-to-lr/simulator/trap-master/${t.id}`}
              className="group block rounded-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
            >
              <Card variant="surface" interactive>
                
                <h3
                  className={cn(
                    'font-mc-serif text-h3 font-semibold mt-1 leading-tight transition-colors duration-150 ease-eased',
                    'text-ink group-hover:text-mc-accent',
                  )}
                >
                  {t.name}
                </h3>
                <p className="font-mc-serif text-body-prose text-ink-soft mt-2 leading-relaxed">{t.what}</p>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function HardMode() {
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <PageHeader eyebrow="Simulator" title="Hard mode" compact />
      <EmptyState
        title="Hard mode unlocks at Phase D"
        body="Five hardest questions will surface here once you've attempted the question bank and we have distractor data to score with."
        surfaceId="simulator/hard-mode"
        icon={<Flame className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />}
      />
    </article>
  );
}
