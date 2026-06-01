import { StructuredDrillReplicaTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/StructuredDrillReplicaTemplate';
import { CANONICAL_STRUCTURED_DRILL_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function MixedStructureCheck() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <StructuredDrillReplicaTemplate
      title="Final Mixed Structure Check"
      questions={CANONICAL_STRUCTURED_DRILL_QUESTIONS}
      onComplete={() => markDrillComplete?.('MC-DRL-MIX')}
    />
  );
}
