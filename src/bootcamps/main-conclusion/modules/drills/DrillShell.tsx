import { Navigate, useParams } from 'react-router-dom';

import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { IntroDrillPage } from './IntroDrillPage';
import { getIntroDrillBySlug } from './introDrills';

const LEGACY_REDIRECT: Record<string, string> = {
  '3.1': 'main-conclusion-lab',
  '3.2': 'main-conclusion-lab',
  '3.3': 'first-sentence-vs-rebuttal-lab',
  '3.7': 'first-sentence-vs-rebuttal-lab',
  'mixed-classification': 'first-sentence-vs-rebuttal-lab',
};

export function DrillShell() {
  const { drillId } = useParams<{ drillId: string }>();

  if (drillId && drillId in LEGACY_REDIRECT) {
    return <Navigate to={`/bootcamp/intro-to-lr/drills/${LEGACY_REDIRECT[drillId]}`} replace />;
  }

  const drill = getIntroDrillBySlug(drillId);
  if (!drill) {
    return (
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10 md:py-10 desktop:px-12 desktop:py-12">
        <EmptyState
          title="Drill not found"
          body="Pick a drill from the Drill Lab to get started."
          surfaceId={`drill/${drillId ?? '?'}`}
        />
      </div>
    );
  }

  return <IntroDrillPage drill={drill} />;
}
