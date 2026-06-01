/**
 * Drill 3.4 · Rebuttal vs First-Sentence Stage-Gate.
 * THE UNLOCK GATE for /simulator/* per G2.DRL-3.4.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import { adaptFamilyQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { StructuredStageQuestion } from '@/bootcamps/main-conclusion/components/structured-dissection/StructuredStageQuestion';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import {
  DRILL_3_4_STAGE_1,
  DRILL_3_4_STAGE_2,
  DRILL_3_4_STAGE_3,
  DRILL_3_4_STAGE_4,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<InteractiveDrillItem>[] = [
  {
    number: 1,
    title: 'First-sentence vs Rebuttal',
    hint: 'Click the main conclusion, classify the family, then identify support or the rejected view.',
    questions: DRILL_3_4_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFamilyQuestion(q) })),
  },
  {
    number: 2,
    title: 'Rebuttal-dominant set',
    hint: 'Most items here are Rebuttal under harder conditions. One First-sentence check item is mixed in.',
    questions: DRILL_3_4_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFamilyQuestion(q) })),
  },
  {
    number: 3,
    title: 'Mixed family',
    hint: 'Balanced mix. Read the structure, not the surface.',
    questions: DRILL_3_4_STAGE_3.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFamilyQuestion(q) })),
  },
  {
    number: 4,
    title: 'Canonical 20',
    hint: 'Five real LSAT stimuli from MCFIRST. The unlock gate. Read the structure — the surface will fight you.',
    questions: DRILL_3_4_STAGE_4.map((q) => ({ id: q.id, prompt: q.prompt, payload: adaptFamilyQuestion(q) })),
  },
];

const protocol = {
  title: 'Rebuttal Dissection',
  goal: 'Separate the author’s conclusion from the view the author rejects.',
  interaction: 'Click the conclusion, classify First-sentence or Rebuttal, then click support or the rejected view.',
  afterSubmit: 'The reveal shows conclusion, support, opposing view, and why the family label is correct.',
};

export function Drill3_4() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);
  const [stage4Started, setStage4Started] = useState(false);

  return (
    <article className="mx-auto max-w-3xl space-y-4 px-6 py-12 desktop:px-12 desktop:py-16">
      <Card variant="elev" className="border border-[color:var(--border-accent-mid)] bg-[rgb(var(--accent)/0.04)]">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">Unlock gate</div>
        <p className="mt-1 font-mc-serif text-body-prose text-ink">
          Completing this drill by passing all four stages unlocks the Question Simulator.
        </p>
      </Card>

      <StageGateTracker
        drillId="MC-DRL-3.4"
        stages={stages}
        renderQuestion={(q, onAnswer, state) =>
          q.id.startsWith('D34-S4-') ? (
            <StructuredStageQuestion
              item={q.payload}
              state={state}
              onAnswer={onAnswer}
              totalQuestions={stages[3].questions.length}
              started={stage4Started}
              onStart={() => setStage4Started(true)}
            />
          ) : (
            <InteractiveDrillRunner item={q.payload} state={state} protocol={protocol} onAnswer={onAnswer} />
          )
        }
        onDrillComplete={async () => {
          await markDrillComplete?.('MC-DRL-3.4');
          setCompleted(true);
        }}
      />

      {completed ? (
        <Card variant="elev" className="border border-[rgb(var(--success)/0.40)] bg-[rgb(var(--success)/0.04)]">
          <Badge tone="success">unlocked</Badge>
          <h2 className="mt-2 font-mc-serif text-h2 font-semibold">Simulator unlocked</h2>
          <p className="mt-2 font-mc-serif text-body-prose text-ink">
            The Question Simulator is now accessible. Twenty canonical questions, seven trap traits.
          </p>
          <Button onClick={() => navigate('/bootcamp/intro-to-lr/simulator')} className="mt-3">
            Go to Simulator
          </Button>
        </Card>
      ) : null}
    </article>
  );
}
