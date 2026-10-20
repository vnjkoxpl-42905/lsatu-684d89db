import { MainConclusionReplicaTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/MainConclusionReplicaTemplate';
import { ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { useAuth } from '@/contexts/AuthContext';

export function MainConclusionLab() {
  const { user: authUser } = useAuth();
  const { markDrillComplete, loadError, retryLoad } = useModuleProgress(authUser?.id);
  if (loadError) return <div role="alert"><p>{loadError}</p><button className="min-h-11 underline" onClick={retryLoad}>Try again</button></div>;

  return (
    <MainConclusionReplicaTemplate
      key={authUser?.id ?? 'signed-out'}
      title="Main Conclusion Lab"
      questions={ORDERED_CANONICAL_MAIN_CONCLUSION_QUESTIONS}
      saveNativeAnswers
      nativeUserId={authUser?.id}
      onComplete={() => markDrillComplete?.('MC-DRL-MCL')}
    />
  );
}
