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
            This surface is on the way. Use the lessons sequence and the Tool Lab in the meantime —
            both are available now and feed straight into what arrives here.
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
