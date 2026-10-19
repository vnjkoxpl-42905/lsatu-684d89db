

import { useState } from 'react';
import { cn } from '../../lib/utils';
import { catalog } from '../../content/note-2-catalog';
import type { FlawEntry } from '../../types/flaw';

/**
 * Lightweight click-to-select drill. v1 ships click-only (drag-drop with HTML5
 * is added in v1.5). prefers-reduced-motion users get the same UX. Matches the
 * brief's edge-case rule: replace drag with click-to-select for reduced motion.
 */
export function DragDropFlawDrill({
  stimulus,
  cite,
  correctSlug,
  binSlugs,
}: {
  stimulus: string;
  cite: string;
  correctSlug: string;
  /** 5 candidate slugs. */
  binSlugs: string[];
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const resolved = picked === correctSlug;
  const wrong = picked && picked !== correctSlug;

  const bins = binSlugs
    .map((s) => catalog.find((c) => c.slug === s))
    .filter((x): x is FlawEntry => Boolean(x));

  return (
    <section className="grid gap-6 border border-ink bg-paper-bright/60 p-6 md:grid-cols-[1fr_280px]">
      <div>
        <header className="protocol mb-2 text-ink-mute">stimulus · {cite}</header>
        <blockquote
          className={cn(
            'border-2 px-4 py-3 italic transition-colors',
            resolved
              ? 'border-verdigris bg-verdigris-tint text-verdigris-deep'
              : wrong
                ? 'border-strike bg-strike-tint text-strike'
                : 'border-rule bg-paper',
          )}
        >
          {stimulus}
        </blockquote>
        {resolved && (
          <p className="mt-3 protocol text-verdigris-deep">
            sustained · {catalog.find((c) => c.slug === correctSlug)?.name}
          </p>
        )}
        {wrong && (
          <p className="mt-3 protocol text-strike">overruled · re-classify</p>
        )}
      </div>
      <ul className="space-y-2">
        <li className="protocol text-ink-mute">candidate flaws</li>
        {bins.map((b) => (
          <li key={b.slug}>
            <button
              type="button"
              onClick={() => setPicked(b.slug)}
              className={cn(
                'w-full border px-3 py-2 text-left protocol text-xs transition-colors',
                resolved && b.slug === correctSlug
                  ? 'border-verdigris bg-verdigris text-paper'
                  : picked === b.slug
                    ? 'border-strike bg-strike-tint text-strike'
                    : 'border-rule hover:border-ink',
              )}
            >
              {b.name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
