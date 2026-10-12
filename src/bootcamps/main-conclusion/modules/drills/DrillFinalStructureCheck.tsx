/**
 * DrillFinalStructureCheck - Final Mixed Structure Check
 */

import { useState } from 'react';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_4_STAGE_4, type FamilyQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { adaptFamilyQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Final Mixed Structure Check',
  goal: 'Stress-test the read on mixed structures.',
  interaction: 'Clear this drill to unlock the Question Simulator.',
  afterSubmit: 'Reveal full analysis.',
};

export function DrillFinalStructureCheck() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_4_STAGE_4[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_4_STAGE_4.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-LAB-FINAL');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  const item: InteractiveDrillItem = {
    ...adaptFamilyQuestion(q),
    mode: 'rebuttal_dissection',
    title: 'Final Mixed Structure Check'
  };

  return (
    <InteractiveDrillRunner
      item={item}
      protocol={protocol}
      state={{ answered: false, correct: null, questionIndex: qIndex, totalQuestions: DRILL_3_4_STAGE_4.length }}
      onComplete={next}
    />
  );
}
