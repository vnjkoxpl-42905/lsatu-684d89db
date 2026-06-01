/**
 * Drill 3.3 · First-Sentence Conclusions.
 * Click the real conclusion first, then make the first-sentence call.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import { adaptFirstSentenceQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import {
  DRILL_3_3_STAGE_1,
  DRILL_3_3_STAGE_2,
  DRILL_3_3_STAGE_3,
  DRILL_3_3_STAGE_4,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<InteractiveDrillItem>[] = [
  {
    number: 1,
    title: 'Yes or no',
    hint: 'Click the conclusion first, then decide whether it was sentence one.',
    questions: DRILL_3_3_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFirstSentenceQuestion(q) })),
  },
  {
    number: 2,
    title: 'Tricky openings',
    hint: 'The first sentence may look like a claim. Read all the way through.',
    questions: DRILL_3_3_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFirstSentenceQuestion(q) })),
  },
  {
    number: 3,
    title: 'Concession openers',
    hint: 'Concessions and rejected views can occupy sentence one.',
    questions: DRILL_3_3_STAGE_3.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFirstSentenceQuestion(q) })),
  },
  {
    number: 4,
    title: 'Speed run',
    hint: 'Two-sentence stimuli. Click, classify, reveal.',
    questions: DRILL_3_3_STAGE_4.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFirstSentenceQuestion(q) })),
  },
];

const protocol = {
  title: 'First-Sentence Conclusions',
  goal: 'Train the difference between first-sentence conclusions and first-sentence traps.',
  interaction: 'First click the actual conclusion. Then answer whether it was the first sentence.',
  afterSubmit: 'The reveal names whether sentence one was conclusion, support, setup, concession, or opposing view.',
};

export function Drill3_3() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 desktop:px-12 desktop:py-16">
      <StageGateTracker
        drillId="MC-DRL-3.3"
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <InteractiveDrillRunner item={q.payload} state={state} protocol={protocol} onAnswer={onAnswer} />
        )}
        onDrillComplete={() => markDrillComplete?.('MC-DRL-3.3')}
      />
    </article>
  );
}
