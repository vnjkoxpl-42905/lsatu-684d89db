/**
 * Drill 3.9 · Nested Claims.
 * Advanced hierarchy version of Chain Mapping.
 */

import { useState } from 'react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import { adaptNestedQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { DRILL_3_9_QUESTIONS } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Nested Claims',
  goal: 'Find the main conclusion without confusing it for an intermediate conclusion.',
  interaction: 'Tag each claim in the hierarchy: premise, intermediate, or main.',
  afterSubmit: 'The reveal shows how support climbs into an intermediate claim and then into the main point.',
};

export function Drill3_9() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_9_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_9_QUESTIONS.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.9');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill 3.9"
        title="Nested Claims"
        description="This is the advanced hierarchy lab: identify main conclusion, intermediate conclusion, and bottom-layer support."
      />
      <InteractiveDrillRunner
        item={adaptNestedQuestion(q)}
        protocol={protocol}
        state={{
          answered: false,
          correct: null,
          selectedAnswer: null,
          questionIndex: qIndex,
          totalQuestions: DRILL_3_9_QUESTIONS.length,
        }}
        onComplete={next}
        completeLabel={isLast ? 'Finish drill' : 'Next'}
      />
    </article>
  );
}
