/**
 * Drill 3.1 · Indicator Word ID — Stage-Gate frame.
 * Stage 1 carries 5 authored items. Stages 2-4 stub pending Joshua's authoring pass.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import {
  DRILL_3_1_STAGE_1,
  DRILL_3_1_STAGE_2,
  DRILL_3_1_STAGE_3,
  DRILL_3_1_STAGE_4,
  type IndicatorIdQuestion,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const stages: Stage<IndicatorIdQuestion>[] = [
  {
    number: 1,
    title: 'Single-word identification',
    hint: 'Read the sentence. Tap the category for the highlighted word.',
    questions: DRILL_3_1_STAGE_1.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 2,
    title: 'Multi-word phrases',
    hint: 'Read the sentence. Tap the category for the highlighted phrase.',
    questions: DRILL_3_1_STAGE_2.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 3,
    title: 'Mixed signals',
    hint: 'Sentences with multiple cues. Read the whole context before choosing.',
    questions: DRILL_3_1_STAGE_3.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
  {
    number: 4,
    title: 'Speed run',
    hint: 'Compressed sentences. Aim for sub-3-second decisions.',
    questions: DRILL_3_1_STAGE_4.map((q) => ({ id: q.id, prompt: q.prompt, payload: q })),
  },
];

const TONE_BY_CAT: Record<string, 'conclusion' | 'premise' | 'pivot' | 'opposing' | 'concession' | 'background' | 'accent'> = {
  conclusion: 'conclusion',
  premise: 'premise',
  pivot: 'pivot',
  concession: 'concession',
  opposing: 'opposing',
  opinion: 'accent',
};

export function Drill3_1() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
      <StageGateTracker
        drillId="MC-DRL-3.1"
        stages={stages}
        renderQuestion={(q, onAnswer, state) => (
          <IndicatorQuestionView q={q.payload} state={state} onAnswer={onAnswer} />
        )}
        onDrillComplete={() => markDrillComplete?.('MC-DRL-3.1')}
      />
    </article>
  );
}

interface ViewProps {
  q: IndicatorIdQuestion;
  state: { answered: boolean; correct: boolean | null };
  onAnswer: (correct: boolean) => void;
}

function IndicatorQuestionView({ q, state, onAnswer }: ViewProps) {
  function pick(category: IndicatorIdQuestion['correct_category']) {
    if (state.answered) return;
    onAnswer(category === q.correct_category);
  }
  const highlighted = q.text.replace(
    q.highlighted_word,
    `__HIGHLIGHT__${q.highlighted_word}__/HIGHLIGHT__`,
  );
  const parts = highlighted.split(/__HIGHLIGHT__|__\/HIGHLIGHT__/);

  return (
    <Card variant="surface">
      <p className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">{q.id}</p>
      <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <mark key={i} className="bg-[rgb(var(--accent)/0.20)] text-mc-accent rounded px-1 py-0.5 not-italic">
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </p>
      <p className="font-mc-serif text-body text-ink-soft italic mt-3">{q.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {q.category_options.map((cat) => (
          <Button
            key={cat}
            variant="subtle"
            size="sm"
            disabled={state.answered}
            onClick={() => pick(cat)}
          >
            <Chip tone={TONE_BY_CAT[cat]}>{cat}</Chip>
          </Button>
        ))}
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
