/**
 * Module 3 · Drill Lab hub — student-facing 5-step Intro to LR drill sequence.
 *
 * Replaces the old 3.1 / 3.2 / 3.3 / 3.4 / 3.7 surface with five integrated labs
 * sourced from the reference bootcamps (introconclusiondrill, structuredrill,
 * lrfoundational) and rebuilt in LSAT U's design system.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { DynamicDrillLab, type DrillLabCard } from '@/bootcamps/main-conclusion/components/interactive-drills/DynamicDrillLab';
import { Gauge } from '@/components/ui/gauge-1';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { nextDrillStep } from '@/bootcamps/main-conclusion/lib/runner';
import { INTRO_DRILLS } from './introDrills';

const GROUPS = [
  {
    title: 'Conclusion Spotting',
    description: 'Train the click before you train the dissection.',
    drillIds: ['MC-DRL-MCL'],
  },
  {
    title: 'Structure Read',
    description: 'Classify the family first, then map the whole argument.',
    drillIds: ['MC-DRL-CLS'],
  },
  {
    title: 'Conclusion Analysis',
    description: 'Name the type of claim so you can predict the weakness.',
    drillIds: ['MC-DRL-CT'],
  },
];

function gaugeColors(value: number) {
  // An untouched sequence is not a failure. At 0 the ring is a muted neutral,
  // never error-red, so a brand-new student is not greeted by three red dials.
  // Color earns in as real progress accrues: gold while underway, green once
  // the band reads as cleared. Error-red is reserved for genuine regression,
  // which this monotonic checklist never produces.
  const primary =
    value <= 0
      ? 'rgb(var(--ink) / 0.22)'
      : value >= 75
        ? 'rgb(var(--success))'
        : 'rgb(var(--accent))';
  return {
    '0': 'rgb(var(--ink) / 0.22)',
    '1': 'rgb(var(--accent))',
    '75': 'rgb(var(--success))',
    secondary: 'rgb(var(--border) / 0.18)',
    primary,
  };
}

export function DrillsIndex() {
  const { progress } = useModuleProgress();
  const completed = new Set(progress?.completed_drills ?? []);
  const ordered = INTRO_DRILLS.map((d) => ({
    id: d.id,
    number: d.number,
    slug: d.slug,
    title: d.title,
    gates_simulator: d.gatesSimulator,
  }));
  const next = nextDrillStep(
    progress
      ? { completed_lessons: progress.completed_lessons, completed_drills: progress.completed_drills }
      : null,
    ordered,
  );
  const doneCount = INTRO_DRILLS.filter((d) => completed.has(d.id)).length;
  const pct = Math.round((doneCount / INTRO_DRILLS.length) * 100);

  function toCard(drill: (typeof INTRO_DRILLS)[number]): DrillLabCard {
    const href = drill.route;
    return {
      id: drill.id,
      number: drill.number,
      title: drill.title,
      route: href,
      skill: drill.skill,
      interaction: drill.interaction,
      why: drill.why,
      completed: completed.has(drill.id),
      active: next.href === href,
      gatesSimulator: drill.gatesSimulator,
      progressLabel: drill.gatesSimulator && !completed.has(drill.id) ? 'gate' : 'available',
    };
  }

  const nextHref = next.href;
  const isGate = next.isGate;
  const completionPercent = Math.round((doneCount / Math.max(INTRO_DRILLS.length, 1)) * 100);
  const clearedBands = GROUPS.filter((group) => group.drillIds.every((id) => completed.has(id))).length;
  const groupedProgress = Math.round((clearedBands / GROUPS.length) * 100);

  return (
    <article className="mx-auto max-w-4xl space-y-6 px-6 py-12 pb-32 desktop:px-12 desktop:py-16">
      <header className="space-y-4">
        <div>
          <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Intro to LR · Drill Lab</p>
          <h1 className="mt-2 font-mc-serif text-h1 font-semibold leading-tight text-ink">
            {INTRO_DRILLS.length} drills, one clean path
          </h1>
          <p className="mt-3 max-w-2xl font-mc-serif text-body-prose leading-relaxed text-ink-soft">
            Focused, sequenced reps to run before you enter the Simulator.
          </p>
        </div>
        <Card variant="elev" accent>
          <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
            <div>
              <Badge tone={isGate ? 'accent' : 'neutral'} dot={isGate} pulse={isGate}>
                {doneCount}/{INTRO_DRILLS.length} cleared · {pct}%
              </Badge>
              <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">{next.title}</h2>
              <p className="mt-1 font-mc-serif text-body text-ink-soft">{next.subtitle}</p>
            </div>
            <Link
              to={nextHref}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-[4px] border border-[color:var(--border-accent-mid)] bg-[image:var(--grad-accent-strong)] px-4 h-9 font-mc-mono text-body uppercase tracking-[0.18em] text-[rgb(var(--bg))] shadow-[0_16px_34px_rgb(var(--bg)/0.4)] transition-[transform,box-shadow] duration-150 hover:-translate-y-[2px]"
            >
              {next.cta}
              <ArrowRight className="h-4 w-4" strokeWidth={2.2} />
            </Link>
          </div>
        </Card>
      </header>

      <Card variant="surface" className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-8">
        <StatItem
          label="Drill completion"
          detail={`${doneCount} of ${INTRO_DRILLS.length} drills cleared`}
          gauge={<Gauge value={completionPercent} size="medium" showValue colors={gaugeColors(completionPercent)} />}
        />
        <div className="hidden h-12 w-px shrink-0 bg-[rgb(var(--border)/0.25)] sm:block" />
        <StatItem
          label="Sequence coverage"
          detail={`${clearedBands} of ${GROUPS.length} drill bands cleared`}
          gauge={<Gauge value={groupedProgress} size="medium" showValue colors={gaugeColors(groupedProgress)} />}
        />
      </Card>

      <section className="space-y-5">
        {GROUPS.map((group) => (
          <DynamicDrillLab
            key={group.title}
            title={group.title}
            description={group.description}
            drills={group.drillIds.map((id) => toCard(INTRO_DRILLS.find((drill) => drill.id === id)!))}
          />
        ))}
      </section>
    </article>
  );
}

function StatItem({
  label,
  detail,
  gauge,
}: {
  label: string;
  detail: string;
  gauge: JSX.Element;
}) {
  return (
    <div className="flex flex-1 items-center gap-4">
      <div className="shrink-0">{gauge}</div>
      <div className="min-w-0">
        <div className="font-mc-mono text-label uppercase tracking-[0.14em] text-ink-faint">{label}</div>
        <p className="mt-1.5 font-mc-serif text-body text-ink-soft">{detail}</p>
      </div>
    </div>
  );
}
