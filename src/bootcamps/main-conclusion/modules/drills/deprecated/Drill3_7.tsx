/**
 * Drill 3.7 · Pronoun Replacement.
 */

import { useState } from 'react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_7_QUESTIONS, type PronounReplacementQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Pronoun Replacement',
  goal: 'Turn vague conclusion language into a clean standalone claim.',
  interaction: 'Click the vague phrase, identify its antecedent, then rewrite the conclusion.',
  afterSubmit: 'The reveal shows the clean replacement and why it preserves the author’s target.',
};

function adaptQuestion(q: PronounReplacementQuestion): InteractiveDrillItem {
  return {
    id: q.id,
    mode: 'pronoun_replacement',
    title: 'Pronoun Replacement',
    prompt: 'Replace the vague phrase with its antecedent.',
    payload: q,
  };
}

export function Drill3_7() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_7_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_7_QUESTIONS.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.7');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill 3.7"
        title="Pronoun Replacement"
        description="Replace the vague pronoun or referential phrase before you trust the conclusion."
      />
      <InteractiveDrillRunner
        item={adaptQuestion(q)}
        protocol={protocol}
        state={{
          answered: false,
          correct: null,
          selectedAnswer: null,
          questionIndex: qIndex,
          totalQuestions: DRILL_3_7_QUESTIONS.length,
        }}
        onComplete={next}
        completeLabel={isLast ? 'Finish drill' : 'Next'}
      />
    </article>
  );
}
