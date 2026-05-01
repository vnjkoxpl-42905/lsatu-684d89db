/**
 * Drill 3.3 · First-Sentence Reading — yes/no on whether the first sentence is the conclusion.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { DRILL_3_3_STAGE_1, type FirstSentenceQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<FirstSentenceQuestion>[] = [
  {
    number: 1,
    title: 'Yes or no',
    hint: 'Read the stimulus. Is the first sentence the conclusion?',
    questions: DRILL_3_3_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  { number: 2, title: 'Tricky openings', hint: 'Stage 2 content authors at C.10.', questions: [] },
  { number: 3, title: 'Concession openers', hint: 'Stage 3 content authors at C.10.', questions: [] },
  { number: 4, title: 'Mixed', hint: 'Stage 4 content authors at C.10.', questions: [] },
];

export function Drill3_3() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  return (
    <article className="px-6 py-10 max-w-3xl mx-auto">
      <StageGateTracker
        drillId="MC-DRL-3.3"
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <View q={q.payload} state={state} onAnswer={onAnswer} />
        )}
        onDrillComplete={() => markDrillComplete?.('MC-DRL-3.3')}
      />
    </article>
  );
}

function View({
  q,
  state,
  onAnswer,
}: {
  q: FirstSentenceQuestion;
  state: { answered: boolean; correct: boolean | null };
  onAnswer: (correct: boolean) => void;
}) {
  function pick(yes: boolean) {
    if (state.answered) return;
    onAnswer(yes === q.is_first_sentence_conclusion);
  }
  return (
    <Card variant="surface">
      <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{q.id}</p>
      <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{q.stimulus}</p>
      <p className="font-mc-serif text-body text-ink-soft italic mt-3">{q.prompt}</p>
      <div className="mt-3 flex gap-2">
        <Button variant="primary" disabled={state.answered} onClick={() => pick(true)}>
          Yes
        </Button>
        <Button variant="subtle" disabled={state.answered} onClick={() => pick(false)}>
          No
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
