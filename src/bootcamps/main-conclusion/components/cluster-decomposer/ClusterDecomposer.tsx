/**
 * Cluster Decomposer — interactive specifier-tap UI.
 * Per architecture-plan §1 + spec.html §5.7.
 *
 * Each specifier renders as a tap-able pill. Tapping lifts it off; the sentence
 * re-renders with the specifier struck through. The "Resolved thought" card shows
 * the live core (sentence with all currently-removed specifiers gone).
 */

import { useState } from 'react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

export interface ClusterSentence {
  id: string;
  sentence: string;
  specifiers: string[]; // exact substrings to lift
  core: string;
}

interface Props {
  sentences: ClusterSentence[];
}

export function ClusterDecomposer({ sentences }: Props) {
  const [index, setIndex] = useState(0);
  const cur = sentences[index]!;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mc-mono text-mono text-ink-faint">
          Sentence {index + 1} of {sentences.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="subtle"
            size="sm"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            ← Prev
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={index >= sentences.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Next →
          </Button>
        </div>
      </div>
      <ClusterStation key={cur.id} sentence={cur} />
    </div>
  );
}

function ClusterStation({ sentence }: { sentence: ClusterSentence }) {
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setRemoved((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  }

  // Render the sentence with each specifier wrapped in a tap target.
  // Strategy: split on each specifier substring, in order, replacing with placeholders.
  let working = sentence.sentence;
  const parts: Array<{ kind: 'text'; text: string } | { kind: 'spec'; index: number; text: string }> = [];
  for (let i = 0; i < sentence.specifiers.length; i++) {
    const spec = sentence.specifiers[i]!;
    const at = working.indexOf(spec);
    if (at === -1) continue; // spec not found verbatim — fall through (will render as plain text)
    if (at > 0) parts.push({ kind: 'text', text: working.slice(0, at) });
    parts.push({ kind: 'spec', index: i, text: spec });
    working = working.slice(at + spec.length);
  }
  if (working) parts.push({ kind: 'text', text: working });

  // Live core: sentence with removed specifiers stripped (keep punctuation graceful).
  let liveCore = sentence.sentence;
  Array.from(removed).sort((a, b) => b - a).forEach((i) => {
    const spec = sentence.specifiers[i]!;
    liveCore = liveCore.replace(spec, '').replace(/\s+/g, ' ').replace(/\s,/g, ',').replace(/,\s,/g, ',').trim();
  });

  const allRemoved = removed.size === sentence.specifiers.length;
  const matchesCore = liveCore.replace(/[.,\s]+$/, '').trim().toLowerCase() ===
    sentence.core.replace(/[.,\s]+$/, '').trim().toLowerCase();

  return (
    <Card variant="surface" className="space-y-4">
      <div>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Sentence</div>
        <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">
          {parts.map((p, i) =>
            p.kind === 'text' ? (
              <span key={i}>{p.text}</span>
            ) : (
              <button
                key={i}
                onClick={() => toggle(p.index)}
                aria-pressed={removed.has(p.index)}
                className={cn(
                  'inline rounded px-1 transition-colors duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                  removed.has(p.index)
                    ? 'line-through text-ink-faint bg-transparent'
                    : 'bg-[rgb(var(--role-pivot)/0.18)] text-[rgb(var(--role-pivot))] hover:bg-[rgb(var(--role-pivot)/0.28)]',
                )}
              >
                {p.text}
              </button>
            ),
          )}
        </p>
      </div>

      <div>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">Resolved thought</div>
        <p className="font-mc-serif text-body-prose text-ink mt-2 italic">{liveCore || '— (everything stripped)'}</p>
        <div className="mt-2 flex gap-2 items-center">
          <Chip tone={removed.size === 0 ? 'background' : matchesCore ? 'conclusion' : allRemoved ? 'concession' : 'pivot'}>
            {removed.size} / {sentence.specifiers.length} lifted
          </Chip>
          {matchesCore ? <Chip tone="conclusion">core matched</Chip> : null}
          {!matchesCore && allRemoved ? <Chip tone="concession">over-stripped</Chip> : null}
        </div>
      </div>

      <details className="border-t border-[rgb(var(--border)/0.08)] pt-3">
        <summary className="cursor-pointer font-mc-mono text-mono uppercase tracking-wider text-ink-faint">
          Reveal target core
        </summary>
        <p className="font-mc-serif text-body-prose text-ink mt-2">{sentence.core}</p>
      </details>
    </Card>
  );
}
