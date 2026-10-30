/**
 * DrillMixedClassification - Mixed Classification Lab
 */

import { useState } from 'react';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_4_STAGE_3, type FamilyQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { adaptFamilyQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'First-Sentence vs Rebuttal',
  goal: 'Identify argument families to predict the author’s move.',
  interaction: 'Build the reflex: is the conclusion at the top of the stimulus, or is the author pushing back on a prior view?',
  afterSubmit: 'Reveal classification.',
};

export function DrillMixedClassification() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_4_STAGE_3[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_4_STAGE_3.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-LAB-MIXED');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  const item: InteractiveDrillItem = {
    ...adaptFamilyQuestion(q),
    mode: 'rebuttal_dissection',
    title: 'First-Sentence vs Rebuttal'
  };

  return (
    <InteractiveDrillRunner
      item={item}
      protocol={protocol}
      state={{ answered: false, correct: null, questionIndex: qIndex, totalQuestions: DRILL_3_4_STAGE_3.length }}
      onComplete={next}
    />
  );
}
