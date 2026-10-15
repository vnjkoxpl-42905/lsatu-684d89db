import { RebuttalVsFirstReplicaTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/RebuttalVsFirstReplicaTemplate';
import { CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function StructureClassification() {
  const { user } = useAuth();
  const { markDrillComplete, loadError, retryLoad } = useModuleProgress(user?.id);
  if (loadError) return <div role="alert"><p>{loadError}</p><button className="min-h-11 underline" onClick={retryLoad}>Try again</button></div>;

  return (
    <RebuttalVsFirstReplicaTemplate
      key={user?.id ?? 'signed-out'}
      title="First-Sentence vs Rebuttal Lab"
      stages={CANONICAL_REBUTTAL_VS_FIRST_STAGE_SETS}
      saveNativeAnswers
      nativeUserId={user?.id}
      onComplete={() => markDrillComplete?.('MC-DRL-CLS')}
    />
  );
}
