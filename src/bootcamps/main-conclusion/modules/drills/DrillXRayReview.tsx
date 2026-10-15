/**
 * DrillXRayReview - X-Ray Review Mode
 */

import { useState } from 'react';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_2_STAGE_1, type XRayQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { adaptXRayQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'X-Ray Review Mode',
  goal: 'Toggle X-Ray on three canonical arguments.',
  interaction: 'See conclusion, premise, opposing view, and indicators laid out in colour.',
  afterSubmit: 'Reveal analysis.',
};

export function DrillXRayReview() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_2_STAGE_1[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_2_STAGE_1.length;

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-LAB-XRAY');
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  const item: InteractiveDrillItem = {
    ...adaptXRayQuestion(q),
    mode: 'conclusion_click',
    title: 'X-Ray Review Mode'
  };

  return (
    <InteractiveDrillRunner
      item={item}
      protocol={protocol}
      state={{ answered: false, correct: null, questionIndex: qIndex, totalQuestions: DRILL_3_2_STAGE_1.length }}
      onComplete={next}
    />
  );
}
