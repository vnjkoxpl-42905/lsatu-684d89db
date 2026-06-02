import { Navigate, Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { MainConclusionLab } from './labs/MainConclusionLab';
import { ReferenceDrillFrame } from './labs/ReferenceDrillFrame';
import { getIntroDrillBySlug } from './introDrills';

const LEGACY_REDIRECT: Record<string, string> = {
  '3.1': 'main-conclusion-lab',
  '3.2': 'main-conclusion-lab',
  '3.3': 'first-sentence-vs-rebuttal-lab',
  '3.4': 'final-mixed-structure-check',
  '3.5': 'argument-structure-lab',
  '3.6': 'argument-structure-lab',
  '3.7': 'first-sentence-vs-rebuttal-lab',
  '3.8': 'argument-structure-lab',
  '3.9': 'argument-structure-lab',
  'mixed-classification': 'first-sentence-vs-rebuttal-lab',
  'x-ray-review': 'structure-reveal-review',
  'final-structure-check': 'final-mixed-structure-check',
  'mixed-structure-check': 'final-mixed-structure-check',
};

export function ActiveDrillShell() {
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
          surfaceId={`drill/${drillId ?? '?'}/run`}
        />
      </div>
    );
  }

  let content: React.ReactNode;
  switch (drill.slug) {
    case 'main-conclusion-lab':
      content = <MainConclusionLab />;
      break;
    case 'argument-structure-lab':
    case 'first-sentence-vs-rebuttal-lab':
    case 'structure-reveal-review':
    case 'final-mixed-structure-check':
      content = (
        <ReferenceDrillFrame
          drillId={drill.completionId}
          title={drill.title}
          hash="drills-view"
        />
      );
      break;
    default:
      content = (
        <EmptyState
          title="Drill not found"
          body="Pick a drill from the Drill Lab to get started."
          surfaceId={`drill/${drillId ?? '?'}/run`}
        />
      );
  }

  const backTarget =
    drill.slug === 'first-sentence-vs-rebuttal-lab'
      ? '/bootcamp/intro-to-lr/drills'
      : drill.route;

  if (drill.slug === 'main-conclusion-lab' || drill.slug === 'first-sentence-vs-rebuttal-lab') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.10)_0%,transparent_50%),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_100%,20px_20px,20px_20px] bg-[#0b1120] px-5 py-5 md:px-8">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="mb-5">
            <Link
              to={backTarget}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(15,23,42,0.68)] px-4 py-2 font-mc-mono text-[11px] uppercase tracking-[0.18em] text-[#94a3b8] transition-colors hover:bg-[rgba(15,23,42,0.84)] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {drill.slug === 'first-sentence-vs-rebuttal-lab' ? 'Back to Drill Lab' : 'Back to Drill Page'}
            </Link>
          </div>
          <div className="min-w-0">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10 md:py-10 desktop:px-12 desktop:py-12">
      <div className="mb-6">
        <Link
          to={drill.route}
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.1)] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.56)] transition-colors hover:bg-[#fffdf9]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Drill Page
        </Link>
      </div>
      <div className="min-w-0">{content}</div>
    </div>
  );
}
