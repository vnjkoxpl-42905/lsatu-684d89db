/**
 * Module 3: secondary Drill Lab hub.
 * The IntegratedPathRail remains the primary course path; this page is a
 * direct-access library for revisiting drill mechanics by skill family.
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
  title: string;
  route: string;
  skill: string;
  interaction: string;
  why: string;
  gates_simulator?: boolean;
}

export const DRILLS: DrillRow[] = [
  {
    id: 'MC-DRL-3.1',
    number: '3.1',
    title: 'Indicator Recognition',
    route: '/drills/3.1',
    skill: 'Signal Recognition',
    interaction: 'classification',
    why: 'Learn what signal phrases are doing before you trust the surface grammar.',
  },
  {
    id: 'MC-DRL-3.2',
    number: '3.2',
    title: 'Structure Reading',
    route: '/drills/3.2',
    skill: 'Structure Lab',
    interaction: 'click conclusion',
    why: 'Click the conclusion inside the stimulus, then inspect the full role map.',
  },
  {
    id: 'MC-DRL-3.3',
    number: '3.3',
    title: 'First-Sentence Conclusions',
    route: '/drills/3.3',
    skill: 'Structure Lab',
    interaction: 'click + check',
    why: 'Train the difference between a real first-sentence conclusion and an opener trap.',
  },
  {
    id: 'MC-DRL-3.4',
    number: '3.4',
    title: 'Rebuttal Conclusions',
    route: '/drills/3.4',
    skill: 'Rebuttal Lab',
    interaction: 'multi-step dissection',
    why: 'Separate author view from rejected view. Passing this drill unlocks the Simulator.',
    gates_simulator: true,
  },
  {
    id: 'MC-DRL-3.7',
    number: '3.7',
    title: 'Pronoun Replacement',
    route: '/drills/3.7',
    skill: 'Translation Lab',
    interaction: 'rewrite',
    why: 'Replace vague referential language before you paraphrase the conclusion.',
  },
];

const GROUPS = [
  {
    title: 'Signal Recognition',
    description: 'Signals are not answers; they are instructions for how to read the next claim.',
    drillIds: ['MC-DRL-3.1'],
  },
  {
    title: 'Structure Lab',
    description: 'Conclusion spotting by clicking directly in the stimulus.',
    drillIds: ['MC-DRL-3.2', 'MC-DRL-3.3'],
  },
  {
    title: 'Rebuttal Lab',
    description: 'Author view versus rejected view, with the simulator gate preserved.',
    drillIds: ['MC-DRL-3.4'],
  },
  {
    title: 'Translation Lab',
    description: 'Turn the argument into a precise standalone claim.',
    drillIds: ['MC-DRL-3.7'],
  },
];

export function DrillsIndex() {
  const { progress } = useModuleProgress();
  const completed = new Set(progress?.completed_drills ?? []);
  const next = nextDrillStep(
    progress
      ? { completed_lessons: progress.completed_lessons, completed_drills: progress.completed_drills }
      : null,
    DRILLS,
  );
  const doneCount = DRILLS.filter((d) => completed.has(d.id)).length;
  const pct = Math.round((doneCount / DRILLS.length) * 100);

  function toCard(drill: DrillRow): DrillLabCard {
    const href = drill.route.startsWith('/bootcamp/intro-to-lr') ? drill.route : `/bootcamp/intro-to-lr${drill.route}`;
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
      gatesSimulator: drill.gates_simulator,
      progressLabel: drill.gates_simulator && !completed.has(drill.id) ? 'gate' : 'available',
    };
  }

  return (
    <article className="mx-auto max-w-4xl space-y-8 px-6 py-12 pb-32 desktop:px-12 desktop:py-16">
      <header className="space-y-4">
        <div>
          <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Secondary Drill Lab</p>
          <h1 className="mt-2 font-mc-serif text-h1 font-semibold leading-tight text-ink">
            Practice library, not the path
          </h1>
          <p className="mt-3 max-w-2xl font-mc-serif text-body-prose leading-relaxed text-ink-soft">
            The rail still owns the course sequence. This hub groups the Intro to LR drills by the skill they train so you can jump back into a lab directly.
          </p>
        </div>
        <Card variant="elev" accent>
          <div className="flex flex-col gap-4 desktop:flex-row desktop:items-center desktop:justify-between">
            <div>
              <Badge tone={next.isGate ? 'accent' : 'neutral'} dot={next.isGate} pulse={next.isGate}>
                {doneCount}/{DRILLS.length} cleared · {pct}%
              </Badge>
              <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">{next.title}</h2>
              <p className="mt-1 font-mc-serif text-body text-ink-soft">{next.subtitle}</p>
            </div>
            <Link to={next.href} className="shrink-0 rounded-[4px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2">
              <Button rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}>{next.cta}</Button>
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
