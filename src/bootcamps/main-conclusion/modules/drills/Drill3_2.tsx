/**
 * Drill 3.2 · X-Ray Drill — pick the conclusion sentence from a stimulus.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { DRILL_3_2_STAGE_1, DRILL_3_2_STAGE_2, type XRayQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<XRayQuestion>[] = [
  {
    number: 1,
    title: 'Find the conclusion',
    hint: 'Read each stimulus. Tap the sentence that is the author’s main conclusion.',
    questions: DRILL_3_2_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 2,
    title: 'With distractors',
    hint: 'Read the stimulus. Pick the conclusion sentence — distractors are stronger here.',
    questions: DRILL_3_2_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  { number: 3, title: 'Speed run', hint: 'Stage 3 content authors at C.10.', questions: [] },
  { number: 4, title: 'Mixed difficulty', hint: 'Stage 4 content authors at C.10.', questions: [] },
];

export function Drill3_2() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <StageGateTracker
        drillId="MC-DRL-3.2"
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <XRayQuestionView q={q.payload} state={state} onAnswer={onAnswer} />
        )}
        onDrillComplete={() => markDrillComplete?.('MC-DRL-3.2')}
      />
    </article>
  );
}

function XRayQuestionView({
  q,
  state,
  onAnswer,
}: {
  q: XRayQuestion;
  state: { answered: boolean; correct: boolean | null };
  onAnswer: (correct: boolean) => void;
}) {
  return (
    <Card variant="surface">
      <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{q.id}</p>
      <p className="font-mc-serif text-body text-ink-soft italic mt-1">{q.prompt}</p>
      <p className="font-mc-serif text-body-prose text-ink mt-3 leading-relaxed">{q.stimulus}</p>
      <ol className="mt-3 space-y-1.5">
        {q.candidates.map((c) => (
          <li key={c.letter}>
            <Button
              variant="subtle"
              size="md"
              disabled={state.answered}
              onClick={() => onAnswer(c.is_correct)}
              className="w-full justify-start"
            >
              <span className="font-mc-mono text-mono text-ink-faint mr-2">{c.letter}</span>
              <span className="font-mc-serif text-body text-ink">{c.text}</span>
            </Button>
          </li>
        ))}
      </ol>
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
