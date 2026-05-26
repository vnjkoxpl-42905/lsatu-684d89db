/**
 * Drill 3.6 · Build the Conclusion.
 */

import { useState } from 'react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_6_QUESTIONS, type DesignConclusionQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Build the Conclusion',
  goal: 'Write one conclusion that follows and one tempting conclusion that does not.',
  interaction: 'Use the two free-response boxes. Stay inside the exact premise pair.',
  afterSubmit: 'The reveal compares your work to a valid model and an invalid-but-tempting model.',
};

function adaptQuestion(q: DesignConclusionQuestion): InteractiveDrillItem {
  return {
    id: q.id,
    mode: 'conclusion_construction',
    title: 'Build the Conclusion',
    prompt: 'Write a valid conclusion and a tempting invalid conclusion.',
    payload: q,
  };
}

export function Drill3_6() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_6_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_6_QUESTIONS.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.6');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill 3.6"
        title="Build the Conclusion"
        description="Write one conclusion that follows from the premises and one attractive wrong answer that imports too much or reverses the logic."
      />
      <InteractiveDrillRunner
        item={adaptQuestion(q)}
        protocol={protocol}
        state={{
          answered: false,
          correct: null,
          selectedAnswer: null,
          questionIndex: qIndex,
          totalQuestions: DRILL_3_6_QUESTIONS.length,
        }}
        onComplete={next}
        completeLabel={isLast ? 'Finish drill' : 'Next'}
      />
    </article>
  );
}
