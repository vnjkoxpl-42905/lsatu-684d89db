/**
 * Drill 3.1 · Indicator Recognition.
 * StageGateTracker stays as the progression shell; the interaction is rendered
 * by the shared Dynamic Drill Lab runner.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import { adaptIndicatorQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import {
  DRILL_3_1_STAGE_1,
  DRILL_3_1_STAGE_2,
  DRILL_3_1_STAGE_3,
  DRILL_3_1_STAGE_4,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<InteractiveDrillItem>[] = [
  {
    number: 1,
    title: 'Signal Basics',
    hint: 'Learn the core jobs signals perform: support, conclusion, contrast, concession, opinion, and opposing view.',
    questions: DRILL_3_1_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptIndicatorQuestion(q) })),
  },
  {
    number: 2,
    title: 'Signal Phrases',
    hint: 'Some signals are phrases. Read what the phrase is doing, not just what words it contains.',
    questions: DRILL_3_1_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptIndicatorQuestion(q) })),
  },
  {
    number: 3,
    title: 'Contrast and Concession',
    hint: 'When a sentence contains more than one signal, ask which side the author ultimately supports.',
    questions: DRILL_3_1_STAGE_3.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptIndicatorQuestion(q) })),
  },
  {
    number: 4,
    title: 'Recognition Sprint',
    hint: 'Make the same call faster without losing precision.',
    questions: DRILL_3_1_STAGE_4.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptIndicatorQuestion(q) })),
  },
];

const protocol = {
  title: 'Indicator Recognition',
  goal: 'Identify the job of the highlighted signal phrase.',
  interaction: 'Choose premise, conclusion, pivot, concession, opposing view, or opinion.',
  afterSubmit: 'Wrong choices coach the function; correct choices reveal why the phrase works that way.',
};

export function Drill3_1() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 desktop:px-12 desktop:py-16">
      <StageGateTracker
        drillId="MC-DRL-3.1"
        eyebrow="Guided Drill"
        title="Indicator Recognition"
        subtitle="Classify what each signal phrase is doing before the argument structure gets more crowded."
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <InteractiveDrillRunner item={q.payload} state={state} protocol={protocol} onAnswer={onAnswer} />
        )}
        onDrillComplete={() => markDrillComplete?.('MC-DRL-3.1')}
      />
    </article>
  );
}
