/**
 * Drill 3.2 · Structure Reading.
 * Clickable sentence conclusion spotting with coached hints and role reveal.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import { adaptXRayQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import {
  DRILL_3_2_STAGE_1,
  DRILL_3_2_STAGE_2,
  DRILL_3_2_STAGE_3,
  DRILL_3_2_STAGE_4,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<InteractiveDrillItem>[] = [
  {
    number: 1,
    title: 'Find the conclusion',
    hint: 'Click the exact sentence that states the author’s main conclusion.',
    questions: DRILL_3_2_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptXRayQuestion(q) })),
  },
  {
    number: 2,
    title: 'With distractors',
    hint: 'Distractors are stronger here. Click the claim the other sentences support.',
    questions: DRILL_3_2_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptXRayQuestion(q) })),
  },
  {
    number: 3,
    title: 'Multi-claim with intermediate',
    hint: 'Do not stop at the intermediate conclusion. Click the main conclusion.',
    questions: DRILL_3_2_STAGE_3.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptXRayQuestion(q) })),
  },
  {
    number: 4,
    title: 'Speed run',
    hint: 'Compressed stimuli. Click the conclusion fast, then read the revealed map.',
    questions: DRILL_3_2_STAGE_4.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptXRayQuestion(q) })),
  },
];

const protocol = {
  title: 'Structure Reading',
  goal: 'Click the exact sentence that is the author’s main conclusion.',
  interaction: 'Tap directly inside the stimulus. Do not choose from detached answer buttons.',
  afterSubmit: 'Wrong clicks give a hint; a correct click reveals the role map for every sentence.',
};

export function Drill3_2() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 desktop:px-12 desktop:py-16">
      <StageGateTracker
        drillId="MC-DRL-3.2"
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <InteractiveDrillRunner item={q.payload} state={state} protocol={protocol} onAnswer={onAnswer} />
        )}
        onDrillComplete={() => markDrillComplete?.('MC-DRL-3.2')}
      />
    </article>
  );
}
