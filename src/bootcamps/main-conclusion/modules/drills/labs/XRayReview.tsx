import { FoundationalRevealDemoTemplate } from '@/bootcamps/main-conclusion/components/reference-templates/FoundationalRevealDemoTemplate';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function XRayReview() {
  const user = useUser();
  const { markDrillComplete } = useModuleProgress(user?.id);

  return (
    <FoundationalRevealDemoTemplate
      title="Structure Reveal Review Mode"
      onComplete={() => markDrillComplete?.('MC-DRL-XRY')}
    />
  );
}
