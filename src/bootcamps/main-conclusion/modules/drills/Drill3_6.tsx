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
  interaction: 'First mark what each premise gives you, then construct the valid and tempting invalid claims.',
  afterSubmit: 'The reveal classifies both attempts and maps P1, P2, the forced conclusion, and the trap.',
};

function adaptQuestion(q: DesignConclusionQuestion): InteractiveDrillItem {
  return {
    id: q.id,
    mode: 'conclusion_construction',
    title: 'Build the Conclusion',
    prompt: 'Write a valid conclusion and a tempting invalid conclusion.',
    payload: q,
    constructionReveal: q.construction_reveal
      ? {
          p1Contribution: q.construction_reveal.p1_contribution,
          p2Contribution: q.construction_reveal.p2_contribution,
          forcedConclusion: q.construction_reveal.forced_conclusion,
          temptingWrongMove: q.construction_reveal.tempting_wrong_move,
          wrongMoveFailure: q.construction_reveal.wrong_move_failure,
        }
      : undefined,
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
