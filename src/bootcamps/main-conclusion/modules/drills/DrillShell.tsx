/**
 * DrillShell — routes /drills/:drillId to the new student-facing labs.
 *
 * New slugs (canonical):
 *   main-conclusion-lab   → MainConclusionLab        (drill 1)
 *   argument-structure-lab → ArgumentStructureLab    (drill 2)
 *   first-sentence-vs-rebuttal-lab → StructureClassification (drill 2)
 *   structure-reveal-review        → XRayReview               (drill 4)
 *   final-mixed-structure-check    → MixedStructureCheck      (drill 5, gates Simulator)
 *
 * Legacy 3.x slugs silently redirect to the closest new lab so any stale
 * bookmarks, lesson links, or path-rail entries keep working.
 */

import { useParams, Navigate } from 'react-router-dom';
import { DynamicIslandTOC } from '@/components/ui/dynamic-island-toc';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { MainConclusionLab } from './labs/MainConclusionLab';
import { ArgumentStructureLab } from './labs/ArgumentStructureLab';
import { StructureClassification } from './labs/StructureClassification';
import { XRayReview } from './labs/XRayReview';
import { MixedStructureCheck } from './labs/MixedStructureCheck';

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

export function DrillShell() {
  const { drillId } = useParams<{ drillId: string }>();

  if (drillId && drillId in LEGACY_REDIRECT) {
    return <Navigate to={`/bootcamp/intro-to-lr/drills/${LEGACY_REDIRECT[drillId]}`} replace />;
  }

  let content: React.ReactNode;
  switch (drillId) {
    case 'main-conclusion-lab':
      content = <MainConclusionLab />;
      break;
    case 'argument-structure-lab':
      content = (
        <ArgumentStructureLab
          drillId="MC-DRL-ASL"
          eyebrow="Drill · Argument Structure Lab"
          title="Dissect the argument"
          description="Three steps per item: click the main conclusion, classify the structure, then locate the supporting claim or the opposing viewpoint."
        />
      );
      break;
    case 'first-sentence-vs-rebuttal-lab':
      content = <StructureClassification />;
      break;
    case 'structure-reveal-review':
      content = <XRayReview />;
      break;
    case 'final-mixed-structure-check':
      content = <MixedStructureCheck />;
      break;
    default:
      content = (
        <EmptyState
          title="Drill not found"
          body="Pick a drill from the Drill Lab to get started."
          surfaceId={`drill/${drillId ?? '?'}`}
        />
      );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-6 py-8 md:px-10 md:py-10 desktop:px-12 desktop:py-12">
      <div className="min-w-0">
        {content}
        <DynamicIslandTOC />
      </div>
    </div>
  );
}
