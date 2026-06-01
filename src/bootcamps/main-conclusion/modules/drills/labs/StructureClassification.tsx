import { RebuttalVsFirstReplicaTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/RebuttalVsFirstReplicaTemplate';
import { CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function StructureClassification() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <RebuttalVsFirstReplicaTemplate
      title="First-Sentence vs Rebuttal Lab"
      stages={CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS}
      onComplete={() => markDrillComplete?.('MC-DRL-CLS')}
    />
  );
}
