/**
 * Placeholder page used for surfaces beyond Lesson 1.1 in the v1 vertical slice.
 * Per Joshua's Gate 4 sequencing directive: no production code on Modules 2-6
 * until Lesson 1.1 is locked. These keep the router green during review.
 */
import { Link } from 'react-router-dom';

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
    <div className="px-6 py-12 max-w-prose mx-auto">
      <div className="font-mc-mono text-label uppercase tracking-wider text-mc-accent">{moduleId}</div>
      <h1 className="font-mc-serif text-h1 font-semibold mt-2">{surfaceLabel}</h1>
      <p className="font-mc-serif text-body-prose mt-4 text-ink-soft">
        Specced at Gate 3, scaffolded for Gate 4. Production content lands in this surface
        once Lesson 1.1 review is locked and Module 1's per-lesson template is approved.
      </p>
      {inventoryHint && (
        <p className="font-mc-mono text-mono text-ink-faint mt-4">{inventoryHint}</p>
      )}
      <Link to="/bootcamp/intro-to-lr" className="font-mc-mono text-mono text-mc-accent mt-6 inline-block">← Module index</Link>
    </div>
  );
}
