/**
 * Cluster Decomposer — interactive specifier-tap UI.
 * Each specifier renders as a tap-able pill. Tapping lifts it off; the sentence
 * re-renders with the specifier struck through. The "Resolved thought" card shows
 * the live core (sentence with all currently-removed specifiers gone).
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, Check } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';

export interface ClusterSentence {
  id: string;
  sentence: string;
  specifiers: string[];
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
      <div className="flex items-center justify-between gap-2">
        <span className="font-mc-mono text-mono text-ink-faint">
          Sentence {index + 1} of {sentences.length}
        </span>
        <div className="flex gap-2">
          <Button
            variant="subtle"
            size="sm"
            disabled={index === 0}
            leftIcon={<ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />}
            onClick={() => setIndex(index - 1)}
          >
            Prev
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={index >= sentences.length - 1}
            rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}
            onClick={() => setIndex(index + 1)}
          >
            Next
          </Button>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={cur.id}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          <ClusterStation sentence={cur} />
        </motion.div>
      </AnimatePresence>
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

  let working = sentence.sentence;
  const parts: Array<{ kind: 'text'; text: string } | { kind: 'spec'; index: number; text: string }> = [];
  for (let i = 0; i < sentence.specifiers.length; i++) {
    const spec = sentence.specifiers[i]!;
    const at = working.indexOf(spec);
    if (at === -1) continue;
    if (at > 0) parts.push({ kind: 'text', text: working.slice(0, at) });
    parts.push({ kind: 'spec', index: i, text: spec });
    working = working.slice(at + spec.length);
  }
  if (working) parts.push({ kind: 'text', text: working });

  let liveCore = sentence.sentence;
  Array.from(removed)
    .sort((a, b) => b - a)
    .forEach((i) => {
      const spec = sentence.specifiers[i]!;
      liveCore = liveCore
        .replace(spec, '')
        .replace(/\s+/g, ' ')
        .replace(/\s,/g, ',')
        .replace(/,\s,/g, ',')
        .trim();
    });

  const allRemoved = removed.size === sentence.specifiers.length;
  const matchesCore =
    liveCore.replace(/[.,\s]+$/, '').trim().toLowerCase() ===
    sentence.core.replace(/[.,\s]+$/, '').trim().toLowerCase();

  return (
    <Card variant="surface" className="space-y-5">
      <div>
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">Sentence</div>
        <p className="font-mc-serif text-body-prose text-ink mt-2.5 leading-relaxed">
          {parts.map((p, i) =>
            p.kind === 'text' ? (
              <span key={i}>{p.text}</span>
            ) : (
              <button
                key={i}
                onClick={() => toggle(p.index)}
                aria-pressed={removed.has(p.index)}
                className={cn(
                  'inline-block rounded-2 px-1.5 mx-px transition-[background,color,opacity] duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent',
                  removed.has(p.index)
                    ? 'line-through text-ink-faint opacity-60'
                    : 'bg-[rgb(var(--role-pivot)/0.16)] text-[rgb(var(--role-pivot))] border-b border-[rgb(var(--role-pivot)/0.45)] hover:bg-[rgb(var(--role-pivot)/0.26)]',
                )}
              >
                {p.text}
              </button>
            ),
          )}
        </p>
      </div>

      <div
        className={cn(
          'rounded-3 p-4 border',
          'bg-[image:var(--grad-surface-soft)]',
          matchesCore && removed.size > 0
            ? 'border-[rgb(var(--success)/0.40)] shadow-[0_0_24px_-4px_rgb(16_185_129/0.20)]'
            : 'border-[rgb(var(--border)/0.10)]',
        )}
      >
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
          Resolved thought
        </div>
        <p className="font-mc-serif text-body-prose text-ink mt-2 italic leading-relaxed">
          {liveCore || '— (everything stripped)'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Chip
            tone={
              removed.size === 0
                ? 'background'
                : matchesCore
                ? 'conclusion'
                : allRemoved
                ? 'concession'
                : 'pivot'
            }
          >
            {removed.size} / {sentence.specifiers.length} lifted
          </Chip>
          {matchesCore && removed.size > 0 ? (
            <Chip tone="conclusion">
              <Check className="h-3 w-3 -ml-0.5" strokeWidth={2.4} aria-hidden="true" />
              core matched
            </Chip>
          ) : null}
          {!matchesCore && allRemoved ? <Chip tone="concession">over-stripped</Chip> : null}
        </div>
      </div>

      <details className="border-t border-[rgb(var(--border)/0.08)] pt-3 group/reveal">
        <summary
          className={cn(
            'cursor-pointer font-mc-mono text-mono uppercase tracking-wider text-ink-faint',
            'inline-flex items-center gap-1.5 select-none',
            'hover:text-mc-accent transition-colors duration-150 ease-eased',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2',
          )}
        >
          <Eye className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
          Reveal target core
        </summary>
        <p className="font-mc-serif text-body-prose text-ink mt-2 leading-relaxed">{sentence.core}</p>
      </details>
    </Card>
  );
}
