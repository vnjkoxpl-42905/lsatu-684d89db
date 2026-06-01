/**
 * DrillArgStructureLab - Argument Structure Lab
 */

import { useState } from 'react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { InteractiveDrillRunner } from '@/bootcamps/main-conclusion/components/interactive-drills/InteractiveDrillRunner';
import type { InteractiveDrillItem } from '@/bootcamps/main-conclusion/components/interactive-drills/types';
import { DRILL_3_4_STAGE_1, type FamilyQuestion } from '@/bootcamps/main-conclusion/content/drills.source';
import { adaptFamilyQuestion } from '@/bootcamps/main-conclusion/components/interactive-drills/adapters';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const protocol = {
  title: 'Argument Structure Lab',
  goal: 'Decompose each argument: select the main conclusion, classify the shape, then locate support.',
  interaction: '3-step flow: Click MC -> Classify -> Click Support',
  afterSubmit: 'Reveal full analysis.',
};

interface Props {
  drillId: string;
  eyebrow: string;
  title: string;
  description: string;
}

export function ArgumentStructureLab({ drillId, eyebrow, title, description }: Props) {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [qIndex, setQIndex] = useState(0);
  const q = DRILL_3_4_STAGE_1[qIndex]!;
  const isLast = qIndex + 1 >= DRILL_3_4_STAGE_1.length;

  function next() {
    if (isLast) {
      markDrillComplete?.(drillId);
      return;
    }
    setQIndex((prev) => prev + 1);
  }

  const item: InteractiveDrillItem = {
    ...adaptFamilyQuestion(q),
    mode: 'rebuttal_dissection',
    title: title
  };

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <InteractiveDrillRunner
        item={item}
        protocol={protocol}
        state={{ answered: false, correct: null, questionIndex: qIndex, totalQuestions: DRILL_3_4_STAGE_1.length }}
        onComplete={next}
      />
    </>
  );
}
