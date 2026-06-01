import { StructuredDrillReplicaTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/StructuredDrillReplicaTemplate';
import { CANONICAL_STRUCTURED_DRILL_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

interface Props {
  drillId: string;
  title: string;
}

export function ArgumentStructureLab({ drillId, title }: Props) {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <StructuredDrillReplicaTemplate
      title={title}
      questions={CANONICAL_STRUCTURED_DRILL_QUESTIONS}
      onComplete={() => markDrillComplete?.(drillId)}
      key={drillId}
    />
  );
}
