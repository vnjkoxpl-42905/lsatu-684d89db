/**
 * Drill 3.5 · Chain Mapping.
 * Direct-runner drill: tag each sentence, then reveal the chain map.
 */

import { useState } from 'react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { CakeOnBlocks } from '@/bootcamps/main-conclusion/components/argument-structure-map/CakeOnBlocks';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import { adaptChainQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { DRILL_3_5_QUESTIONS } from '@/bootcamps/main-conclusion/content/drills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Chain Mapping',
  goal: 'Tag each claim as premise, intermediate conclusion, or main conclusion.',
  interaction: 'Assign a role to every sentence before revealing the structure.',
  afterSubmit: 'The reveal shows Premise -> Intermediate Conclusion -> Main Conclusion, or Premise -> Main Conclusion.',
};

export function Drill3_5() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_5_QUESTIONS[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_5_QUESTIONS.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-3.5');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  return (
    <article className="mx-auto max-w-3xl space-y-5 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill 3.5"
        title="Chain Mapping"
        description="Decompose the stimulus. Premises support the intermediate conclusion when present; the intermediate supports the main."
      />
      <CakeOnBlocks />
      <InteractiveDrillRunner
        item={adaptChainQuestion(q)}
        protocol={protocol}
        state={{
          answered: false,
          correct: null,
          selectedAnswer: null,
          questionIndex: qIndex,
          totalQuestions: DRILL_3_5_QUESTIONS.length,
        }}
        onComplete={next}
        completeLabel={isLast ? 'Finish drill' : 'Next'}
      />
    </article>
  );
}
