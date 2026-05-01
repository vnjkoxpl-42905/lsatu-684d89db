/**
 * Placeholder page used for surfaces beyond Lesson 1.1 in the v1 vertical slice.
 * Per Joshua's Gate 4 sequencing directive: no production code on Modules 2-6
 * until Lesson 1.1 is locked. These keep the router green during review.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

export function Placeholder({
  moduleId,
  surfaceLabel,
  inventoryHint,
}: {
  moduleId: string;
  surfaceLabel: string;
  inventoryHint?: string;
}): JSX.Element {
  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-prose mx-auto">
      <PageHeader
        eyebrow={moduleId}
        title={surfaceLabel}
        description={
          <>
            Specced at Gate 3, scaffolded for Gate 4. Production content lands in this surface once
            Lesson 1.1 review is locked and Module 1's per-lesson template is approved.
          </>
        }
      />
      {inventoryHint && (
        <p className="font-mc-mono text-mono text-ink-faint">{inventoryHint}</p>
      )}
      <Link
        to="/bootcamp/intro-to-lr"
        className="mt-6 inline-flex items-center gap-1.5 font-mc-mono text-mono text-mc-accent hover:underline underline-offset-4 decoration-[rgb(var(--accent)/0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2 transition-colors duration-150 ease-eased"
      >
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
        Module index
      </Link>
    </div>
  );
}
