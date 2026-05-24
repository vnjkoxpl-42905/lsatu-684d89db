/**
 * Drill 3.1 · Indicator Word ID — Stage-Gate frame.
 * Stage 1 carries 5 authored items. Stages 2-4 stub pending Joshua's authoring pass.
 */

import { StageGateTracker, type Stage } from '@/bootcamps/main-conclusion/components/stage-gate/StageGateTracker';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import {
  DRILL_3_1_STAGE_1,
  DRILL_3_1_STAGE_2,
  DRILL_3_1_STAGE_3,
  DRILL_3_1_STAGE_4,
  type IndicatorIdQuestion,
} from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

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

export function Drill3_1() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-2xl mx-auto">
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
  state: { 
    answered: boolean; 
    correct: boolean | null; 
    selectedAnswer?: string | null; 
  };
  onAnswer: (correct: boolean, selectedAnswer?: string) => void;
}

function IndicatorQuestionView({ q, state, onAnswer }: ViewProps) {
  function pick(category: string) {
    if (state.answered) return;
    onAnswer(category === q.correct_category, category);
  }

  const parts = q.text.split(new RegExp(`(${q.highlighted_word})`, 'g'));

  return (
    <div className="space-y-6">
      <Card variant="surface" className="p-6">
        <p className="font-mc-mono text-xs uppercase tracking-widest text-ink-faint">{q.id}</p>
        <p className="font-mc-serif text-h3 text-ink mt-4 leading-relaxed">
          {parts.map((p, i) =>
            p === q.highlighted_word ? (
              <mark key={i} className="bg-[#F3D27A]/35 text-[#1a1a1a] border-b border-[#D6A82E] rounded-sm px-1 not-italic">
                {p}
              </mark>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </p>
        <p className="font-mc-serif text-body text-ink-soft italic mt-4">{q.prompt}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {q.category_options.map((cat) => {
          const isSelected = state.selectedAnswer === cat;
          const isCorrect = cat === q.correct_category;
          
          let tone: 'subtle' | 'success' | 'error' = 'subtle';
          if (state.answered) {
            if (isCorrect) tone = 'success';
            else if (isSelected) tone = 'error';
          }

          return (
            <Button
              key={cat}
              variant={tone === 'subtle' ? 'subtle' : 'filled'}
              tone={tone !== 'subtle' ? tone : undefined}
              className={cn(
                'h-auto py-3 text-body font-semibold justify-center',
                state.answered && !isSelected && !isCorrect && 'opacity-30'
              )}
              disabled={state.answered}
              onClick={() => pick(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          );
        })}
      </div>

      {state.answered && (
        <div className={cn(
          'p-4 rounded-3 border font-mc-serif text-body-prose',
          state.correct 
            ? 'bg-[rgb(var(--success)/0.08)] border-[rgb(var(--success)/0.2)] text-ink'
            : 'bg-[rgb(var(--error)/0.08)] border-[rgb(var(--error)/0.2)] text-ink'
        )}>
          <p className="font-semibold mb-1">
            {state.correct ? 'Correct.' : 'Not quite.'}
          </p>
          <p className="text-ink-soft">{q.rationale}</p>
        </div>
      )}
    </div>
  );
}
