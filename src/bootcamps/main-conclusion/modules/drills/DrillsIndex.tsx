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
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { nextDrillStep } from '@/bootcamps/main-conclusion/lib/runner';

interface DrillRow {
  id: string;
  number: string;
  slug: string;
  title: string;
  skill: string;
  interaction: string;
  why: string;
  gates_simulator?: boolean;
}

export const DRILLS: DrillRow[] = [
  {
    id: 'MC-DRL-MCL',
    number: '1',
    slug: 'main-conclusion-lab',
    title: 'Main Conclusion Lab',
    skill: 'Conclusion Spotting',
    interaction: 'click the conclusion · 20 reps',
    why: 'Tap the sentence the author is trying to prove. Wrong picks get a hint; right picks reveal the full role map.',
  },
  {
    id: 'MC-DRL-CLS',
    number: '2',
    slug: 'first-sentence-vs-rebuttal-lab',
    title: 'First-Sentence vs Rebuttal Lab',
    skill: 'Structure Classification',
    interaction: 'quick classification · structure reveal',
    why: 'Train the fast distinction between first-sentence conclusions and rebuttal conclusions before full dissection.',
  },
  {
    id: 'MC-DRL-ASL',
    number: '3',
    slug: 'argument-structure-lab',
    title: 'Argument Structure Lab',
    skill: 'Structure Dissection',
    interaction: '3-step flow · click MC → classify → click support',
    why: 'Decompose each argument: select the main conclusion, classify the shape, then locate either the supporting claim or the opposing view.',
  },
  {
    id: 'MC-DRL-XRY',
    number: '4',
    slug: 'structure-reveal-review',
    title: 'Structure Reveal Review Mode',
    skill: 'Review & Demo',
    interaction: 'x-ray demos · reveal mode',
    why: 'Toggle reveal modes on canonical arguments to inspect conclusion, support, opposing view, and the logical gap.',
  },
  {
    id: 'MC-DRL-MIX',
    number: '5',
    slug: 'final-mixed-structure-check',
    title: 'Final Mixed Structure Check',
    skill: 'Capstone',
    interaction: 'mixed first-sentence + rebuttal',
    why: 'Capstone reps that mix both structures. Clear this drill to unlock the Question Simulator.',
    gates_simulator: true,
  },
];

const GROUPS = [
  {
    title: 'Conclusion Spotting',
    description: 'Train the click before you train the dissection.',
    drillIds: ['MC-DRL-MCL'],
  },
  {
    title: 'Structure Read',
    description: 'Classify the family first, then map the whole argument.',
    drillIds: ['MC-DRL-CLS', 'MC-DRL-ASL'],
  },
  {
    title: 'Review & Capstone',
    description: 'Stress-test the read on mixed structures. The capstone gates the Simulator.',
    drillIds: ['MC-DRL-XRY', 'MC-DRL-MIX'],
  },
];

const BC = '/bootcamp/intro-to-lr';

export function DrillsIndex() {
  const { progress } = useModuleProgress();
  const completed = new Set(progress?.completed_drills ?? []);
  const ordered = DRILLS.map((d) => ({ id: d.id, number: d.number, title: d.title, gates_simulator: d.gates_simulator }));
  const next = nextDrillStep(
    progress
      ? { completed_lessons: progress.completed_lessons, completed_drills: progress.completed_drills }
      : null,
    ordered,
  );
  const doneCount = DRILLS.filter((d) => completed.has(d.id)).length;
  const pct = Math.round((doneCount / DRILLS.length) * 100);

  function toCard(drill: DrillRow): DrillLabCard {
    const href = `${BC}/drills/${drill.slug}`;
    return {
      id: drill.id,
      number: drill.number,
      title: drill.title,
      route: href,
      skill: drill.skill,
      interaction: drill.interaction,
      why: drill.why,
      completed: completed.has(drill.id),
              active: next.href === href || next.title.includes(drill.title),
      gatesSimulator: drill.gates_simulator,
      progressLabel: drill.gates_simulator && !completed.has(drill.id) ? 'gate' : 'available',
    };
  }

  // Map "next drill" href onto our slug-based routes (runner.ts speaks in numbers).
  const nextRow = DRILLS.find((d) => !completed.has(d.id)) ?? DRILLS[DRILLS.length - 1]!;
  const nextHref = `${BC}/drills/${nextRow.slug}`;
  const isGate = !!nextRow.gates_simulator && !completed.has(nextRow.id);

  return (
    <article className="mx-auto max-w-4xl space-y-8 px-6 py-12 pb-32 desktop:px-12 desktop:py-16">
      <header className="space-y-4">
        <div>
          <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Intro to LR · Drill Lab</p>
          <h1 className="mt-2 font-mc-serif text-h1 font-semibold leading-tight text-ink">
            Five drills, one clean path
          </h1>
          <p className="mt-3 max-w-2xl font-mc-serif text-body-prose leading-relaxed text-ink-soft">
            Spot the main conclusion, dissect the structure, classify the shape, review with X-Ray, then mixed-rep your way into the Simulator.
          </p>
        </div>
        <Card variant="elev" accent>
          <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
            <div>
              <Badge tone={isGate ? 'accent' : 'neutral'} dot={isGate} pulse={isGate}>
                {doneCount}/{DRILLS.length} cleared · {pct}%
              </Badge>
              <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">{nextRow.title}</h2>
              <p className="mt-1 font-mc-serif text-body text-ink-soft">{nextRow.why}</p>
            </div>
            <Link to={nextHref} className="shrink-0 rounded-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2">
              <Button rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}>
                {isGate ? 'Run the gate drill' : `Open ${nextRow.title}`}
              </Button>
            </Link>
          </div>
        </Card>
      </header>

      {GROUPS.map((group) => (
        <DynamicDrillLab
          key={group.title}
          title={group.title}
          description={group.description}
          drills={group.drillIds.map((id) => toCard(DRILLS.find((drill) => drill.id === id)!))}
        />
      ))}
    </article>
  );
}
