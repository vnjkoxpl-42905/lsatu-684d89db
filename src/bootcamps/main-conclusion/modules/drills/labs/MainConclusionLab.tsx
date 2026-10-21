import { MainConclusionReplicaTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/MainConclusionReplicaTemplate';
import { ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function MainConclusionLab() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <MainConclusionReplicaTemplate
      title="Main Conclusion Lab"
      questions={ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS}
      onComplete={() => markDrillComplete?.('MC-DRL-MCL')}
    />
  );
}
