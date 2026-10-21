/**
 * DrillMainConclusionLab - Main Conclusion Analysis Lab
 */

import { useState } from 'react';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_2_STAGE_4, type XRayQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { adaptXRayQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Main Conclusion Lab',
  goal: 'Tap the sentence the author is trying to prove.',
  interaction: 'Wrong picks get a hint; right picks reveal the full role map.',
  afterSubmit: 'Reveal full analysis.',
};

export function DrillMainConclusionLab() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_2_STAGE_4[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_2_STAGE_4.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-LAB-MC');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  const item: InteractiveDrillItem = {
    ...adaptXRayQuestion(q),
    mode: 'conclusion_click',
    title: 'Main Conclusion Lab'
  };

  return (
    <InteractiveDrillRunner
      item={item}
      protocol={protocol}
      state={{ answered: false, correct: null, questionIndex: qIndex, totalQuestions: DRILL_3_2_STAGE_4.length }}
      onComplete={next}
    />
  );
}
