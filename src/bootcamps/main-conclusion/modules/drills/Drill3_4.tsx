/**
 * Drill 3.4 · Rebuttal vs First-Sentence Stage-Gate.
 * THE UNLOCK GATE for /simulator/* per G2.DRL-3.4.
 * Stage 4 will reuse the canonical 20 stimuli at C.10. Stages 1-3 train family
 * recognition on non-canonical items.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import {
  DRILL_3_4_STAGE_1,
  DRILL_3_4_STAGE_2,
  DRILL_3_4_STAGE_3,
  DRILL_3_4_STAGE_4,
  type FamilyQuestion,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const stages: Stage<FamilyQuestion>[] = [
  {
    number: 1,
    title: 'First-sentence vs Rebuttal',
    hint: 'Read the stimulus. Choose the family.',
    questions: DRILL_3_4_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 2,
    title: 'Rebuttal-dominant set',
    hint: 'Most items here are Rebuttal under harder surface conditions. One First-sentence calibration item is mixed in.',
    questions: DRILL_3_4_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 3,
    title: 'Mixed family',
    hint: 'Balanced mix. Read the structure, not the surface — late pivots and concession openers will try to fool you.',
    questions: DRILL_3_4_STAGE_3.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 4,
    title: 'Canonical 20',
    hint: 'Five real LSAT stimuli from MCFIRST. The unlock gate. Read the structure — the surface will fight you.',
    questions: DRILL_3_4_STAGE_4.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
];

export function Drill3_4() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const navigate = useNavigate();
  const [completed, setCompleted] = useState(false);

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-4">
      <Card variant="elev" className="border-l-4 border-l-[rgb(var(--accent)/0.50)]">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">Unlock gate</div>
        <p className="font-mc-serif text-body-prose text-ink mt-1">
          Completing this drill (passing all four stages) unlocks the Question Simulator.
        </p>
      </Card>

      <StageGateTracker
        drillId="MC-DRL-3.4"
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <View q={q.payload} state={state} onAnswer={onAnswer} />
        )}
        onDrillComplete={async () => {
          await markDrillComplete?.('MC-DRL-3.4');
          setCompleted(true);
        }}
      />

      {completed ? (
        <Card variant="elev" className="border-l-4 border-l-[rgb(var(--success)/0.50)]">
          <Badge tone="success">unlocked</Badge>
          <h2 className="font-mc-serif text-h2 font-semibold mt-2">Simulator unlocked</h2>
          <p className="font-mc-serif text-body-prose text-ink mt-2">
            The Question Simulator is now accessible. Twenty canonical questions, seven trap traits.
          </p>
          <Button onClick={() => navigate('/bootcamp/intro-to-lr/simulator')} className="mt-3">
            Go to Simulator →
          </Button>
        </Card>
      ) : null}
    </article>
  );
}

function View({
  q,
  state,
  onAnswer,
}: {
  q: FamilyQuestion;
  state: { answered: boolean; correct: boolean | null };
  onAnswer: (correct: boolean) => void;
}) {
  function pick(family: 'First-sentence' | 'Rebuttal') {
    if (state.answered) return;
    onAnswer(family === q.family);
  }
  return (
    <Card variant="surface">
      <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{q.id}</p>
      <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{q.stimulus}</p>
      <p className="font-mc-serif text-body text-ink-soft italic mt-3">{q.prompt}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="subtle" disabled={state.answered} onClick={() => pick('First-sentence')}>
          First-sentence
        </Button>
        <Button variant="subtle" disabled={state.answered} onClick={() => pick('Rebuttal')}>
          Rebuttal
        </Button>
      </div>
      {state.answered ? (
        <p
          className={`mt-3 font-mc-serif text-body-prose ${
            state.correct ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--error))]'
          }`}
        >
          {state.correct ? '✓ ' : '✗ '}
          {q.rationale}
        </p>
      ) : null}
    </Card>
  );
}
