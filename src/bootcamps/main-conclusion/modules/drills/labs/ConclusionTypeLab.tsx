/**
 * ConclusionTypeLab — runnable drill for naming the type of a conclusion.
 *
 * Loops the student through the Conclusion Type question bank one item at a
 * time via ConclusionTypePicker, tracks a running score, and marks the drill
 * complete (MC-DRL-CT) when the final question is reached.
 */

import { useState } from 'react';
import { ArrowRight, RefreshCcw } from 'lucide-react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { ConclusionTypePicker } from '@/bootcamps/main-conclusion/components/conclusion-type-picker/ConclusionTypePicker';
import { ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/conclusionTypeQuestions';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const QUESTIONS = ORDERED_CANONICAL_CONCLUSION_TYPE_QUESTIONS;

export function ConclusionTypeLab() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  const [index, setIndex] = useState(0);
  const [resolved, setResolved] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const question = QUESTIONS[index];
  const isResolved = question.id in resolved;
  const isLast = index === QUESTIONS.length - 1;
  const correctCount = Object.values(resolved).filter(Boolean).length;
  const answeredCount = Object.keys(resolved).length;
  const progressPercent = Math.round((answeredCount / QUESTIONS.length) * 100);

  function handleResolved(id: string, correct: boolean) {
    setResolved((current) => (id in current ? current : { ...current, [id]: correct }));
  }

  function advance() {
    if (!isResolved) return;
    if (isLast) {
      setFinished(true);
      markDrillComplete?.('MC-DRL-CT');
      return;
    }
    setIndex((current) => current + 1);
  }

  function restart() {
    setIndex(0);
    setResolved({});
    setFinished(false);
  }

  if (finished) {
    return (
      <div className="mc-bootcamp mx-auto w-full max-w-[760px] space-y-6">
        <Card variant="elev" accent className="space-y-4 p-8 text-center">
          <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Conclusion Type Lab</p>
          <h2 className="font-mc-serif text-h1 font-semibold text-ink">
            {correctCount} of {QUESTIONS.length} named correctly
          </h2>
          <p className="mx-auto max-w-md font-mc-serif text-body-prose leading-relaxed text-ink-soft">
            Once you can name the type, you already know the weakness to look for. Re-run any time to sharpen the reflex.
          </p>
          <div className="flex justify-center pt-2">
            <Button onClick={restart} leftIcon={<RefreshCcw className="h-4 w-4" strokeWidth={2.2} />}>
              Run it again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mc-bootcamp mx-auto w-full max-w-[760px] space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            Conclusion Type Lab
          </p>
          <p className="font-mc-mono text-mono uppercase tracking-[0.16em] text-ink-faint">
            {index + 1} / {QUESTIONS.length} · {correctCount} right
          </p>
        </div>
        <h1 className="font-mc-serif text-h2 font-semibold leading-tight text-ink">
          Name the kind of claim the author is making
        </h1>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--border)/0.18)]">
          <div
            className="h-full rounded-full bg-[image:var(--grad-accent-strong)] transition-[width] duration-300 ease-eased"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <ConclusionTypePicker
        key={question.id}
        question={question}
        onResolved={({ correct }) => handleResolved(question.id, correct)}
      />

      <div className="flex items-center justify-end">
        <Button onClick={advance} disabled={!isResolved} rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}>
          {isLast ? 'Finish drill' : 'Next question'}
        </Button>
      </div>
    </div>
  );
}
