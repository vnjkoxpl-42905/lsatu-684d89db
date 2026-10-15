/**
 * Cluster Decomposer v2 (letterpress generation).
 *
 * Tap specifiers to lift them off a hard sentence. Submit grades by selection
 * set: correct means every decoration specifier is lifted and every
 * load-bearing specifier is kept. The reveal teaches per specifier (kind,
 * verdict, rationale) instead of a bare answer.
 *
 * Modes:
 * - guided: hint always available, "Try again" after checking.
 * - graded: one submit per item; the parent records the result via onGraded.
 */

import { useMemo, useRef, useState } from 'react';
import { Check, Eye, Lightbulb, RotateCcw, X } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { ClusterItem, ClusterSpecifier, SpecifierKind } from '@/bootcamps/main-conclusion/content/hard-sentences-drill.source';

export type SpecifierVerdict = 'lifted-correct' | 'kept-correct' | 'kept-decoration' | 'over-strip';

export interface ClusterGradeResult {
  itemId: string;
  correct: boolean;
  liftedIds: string[];
  perSpecifier: Array<{ id: string; verdict: SpecifierVerdict }>;
  timeMs: number;
}

interface ClusterDecomposerV2Props {
  item: ClusterItem;
  mode: 'guided' | 'graded';
  onGraded?: (result: ClusterGradeResult) => void;
  className?: string;
}

const KIND_LABEL: Record<SpecifierKind, string> = {
  possessive: 'Possessive',
  prepositional: 'Prepositional',
  relative: 'Relative clause',
  parenthetical: 'Parenthetical',
  'reduced-relative': 'Reduced relative',
  appositive: 'Appositive',
};

type Part =
  | { kind: 'text'; text: string }
  | { kind: 'spec'; spec: ClusterSpecifier };

function splitParts(item: ClusterItem): Part[] {
  const parts: Part[] = [];
  let working = item.sentence;
  for (const spec of item.specifiers) {
    const at = working.indexOf(spec.text);
    if (at === -1) continue;
    if (at > 0) parts.push({ kind: 'text', text: working.slice(0, at) });
    parts.push({ kind: 'spec', spec });
    working = working.slice(at + spec.text.length);
  }
  if (working) parts.push({ kind: 'text', text: working });
  return parts;
}

/** Rebuild the sentence with lifted specifiers removed and comma pairs healed. */
function resolvedThought(parts: Part[], lifted: Set<string>): string {
  const local = parts.map((p) => ({ ...p }));
  const kept: string[] = [];
  for (let i = 0; i < local.length; i++) {
    const p = local[i]!;
    if (p.kind === 'text') {
      kept.push(p.text);
      continue;
    }
    if (!lifted.has(p.spec.id)) {
      kept.push(p.spec.text);
      continue;
    }
    // Dropping this specifier. If it was wrapped in a comma pair, remove both.
    const prevIdx = kept.length - 1;
    const next = local[i + 1];
    const prevEndsComma = prevIdx >= 0 && /,\s*$/.test(kept[prevIdx]!);
    const nextStartsComma = !!next && next.kind === 'text' && /^\s*,/.test(next.text);
    if (prevEndsComma && nextStartsComma && next.kind === 'text') {
      kept[prevIdx] = kept[prevIdx]!.replace(/,\s*$/, ' ');
      next.text = next.text.replace(/^\s*,\s*/, ' ');
    }
  }
  return kept
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/,\s*,/g, ',')
    .trim();
}

function gradeAttempt(item: ClusterItem, lifted: Set<string>): { correct: boolean; perSpecifier: Array<{ id: string; verdict: SpecifierVerdict }> } {
  const perSpecifier = item.specifiers.map((spec) => {
    const isLifted = lifted.has(spec.id);
    let verdict: SpecifierVerdict;
    if (isLifted && !spec.loadBearing) verdict = 'lifted-correct';
    else if (isLifted && spec.loadBearing) verdict = 'over-strip';
    else if (!isLifted && spec.loadBearing) verdict = 'kept-correct';
    else verdict = 'kept-decoration';
    return { id: spec.id, verdict };
  });
  const correct = perSpecifier.every((v) => v.verdict === 'lifted-correct' || v.verdict === 'kept-correct');
  return { correct, perSpecifier };
}

const VERDICT_COPY: Record<SpecifierVerdict, { label: string; tone: 'good' | 'bad' }> = {
  'lifted-correct': { label: 'Lifted, correctly', tone: 'good' },
  'kept-correct': { label: 'Kept, correctly (load-bearing)', tone: 'good' },
  'kept-decoration': { label: 'Decoration you kept', tone: 'bad' },
  'over-strip': { label: 'Load-bearing, you stripped it', tone: 'bad' },
};

export function ClusterDecomposerV2({ item, mode, onGraded, className }: ClusterDecomposerV2Props) {
  const [lifted, setLifted] = useState<Set<string>>(new Set());
  const [graded, setGraded] = useState<ClusterGradeResult | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const startedAt = useRef<number>(performance.now());

  const parts = useMemo(() => splitParts(item), [item]);
  const live = resolvedThought(parts, lifted);

  function toggle(id: string) {
    if (graded) return;
    setLifted((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function submit() {
    if (graded || lifted.size === 0) return;
    const { correct, perSpecifier } = gradeAttempt(item, lifted);
    const result: ClusterGradeResult = {
      itemId: item.id,
      correct,
      liftedIds: Array.from(lifted),
      perSpecifier,
      timeMs: Math.round(performance.now() - startedAt.current),
    };
    setGraded(result);
    onGraded?.(result);
  }

  function reset() {
    setLifted(new Set());
    setGraded(null);
    setHintOpen(false);
    startedAt.current = performance.now();
  }

  const overStripped = graded ? graded.perSpecifier.some((v) => v.verdict === 'over-strip') : false;

  return (
    <div className={cn('rounded-[10px] border border-[rgba(26,26,26,0.12)] bg-white', className)}>
      {/* Sentence */}
      <div className="border-b border-[rgba(26,26,26,0.08)] p-6 md:p-8">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">
          Tap a specifier to lift it off
        </div>
        <p className="font-serif text-[22px] italic leading-[1.7] text-[#1a1a1a]">
          {parts.map((p, i) =>
            p.kind === 'text' ? (
              <span key={i}>{p.text}</span>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => toggle(p.spec.id)}
                aria-pressed={lifted.has(p.spec.id)}
                disabled={!!graded}
                className={cn(
                  'inline rounded-[4px] px-1 transition-colors duration-150 ease-eased',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)]',
                  lifted.has(p.spec.id)
                    ? 'text-[rgba(26,26,26,0.32)] line-through decoration-[rgba(26,26,26,0.32)]'
                    : 'bg-[#F7EBC9] text-[#1a1a1a] underline decoration-[#C5A059] decoration-2 underline-offset-4 hover:bg-[#F2DF9A]',
                  graded ? 'cursor-default' : 'cursor-pointer',
                )}
              >
                {p.spec.text}
              </button>
            ),
          )}
        </p>
      </div>

      {/* Resolved thought */}
      <div className="border-b border-[rgba(26,26,26,0.08)] bg-[#FBF8F1] p-6 md:p-8">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">
          Resolved thought
        </div>
        <p className="font-serif text-[20px] italic leading-[1.6] text-[#1a1a1a]">
          {live || '(everything stripped)'}
        </p>
        <div className="mt-3 text-[13px] font-medium text-[rgba(26,26,26,0.5)]">
          {lifted.size} of {item.specifiers.length} specifiers lifted
        </div>
      </div>

      {/* Controls */}
      {!graded ? (
        <div className="flex flex-wrap items-center gap-3 p-6 md:px-8">
          <button
            type="button"
            onClick={submit}
            disabled={lifted.size === 0}
            className={cn(
              'rounded-full px-6 py-3 text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ease-eased',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)] focus-visible:ring-offset-2',
              lifted.size === 0
                ? 'cursor-not-allowed bg-[rgba(26,26,26,0.06)] text-[rgba(26,26,26,0.35)]'
                : 'bg-[#1a1a1a] text-[#F5F2ED] hover:bg-black',
            )}
          >
            {mode === 'guided' ? 'Check my lift' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => setHintOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.15)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(26,26,26,0.6)] transition-colors duration-300 hover:border-[rgba(26,26,26,0.3)] hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)]"
          >
            <Lightbulb className="h-3.5 w-3.5" strokeWidth={2.2} />
            Stuck?
          </button>
          {hintOpen ? (
            <p className="w-full rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] p-4 text-[15px] leading-relaxed text-[rgba(26,26,26,0.75)]">
              Try the Jordan move: find the verb of the main clause first. The subject sits just to
              its left. Everything else is a candidate for lifting, unless the claim changes without it.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="p-6 md:p-8">
          {/* Verdict banner */}
          <div
            className={cn(
              'mb-5 flex items-center gap-3 rounded-[8px] border p-4',
              graded.correct
                ? 'border-emerald-600/25 bg-emerald-50 text-emerald-800'
                : 'border-amber-600/25 bg-amber-50 text-amber-900',
            )}
          >
            {graded.correct ? (
              <Check className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            ) : (
              <X className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            )}
            <p className="text-[15px] font-medium leading-relaxed">
              {graded.correct
                ? 'Clean lift. Decoration off, core intact.'
                : overStripped
                ? 'You stripped a load-bearing specifier. The sentence is still grammatical, but it now makes a different claim.'
                : 'Almost. Some decoration is still on the statue. Walk through each specifier below.'}
            </p>
          </div>

          {/* Per-specifier teaching */}
          <div className="space-y-3">
            {item.specifiers.map((spec) => {
              const verdict = graded.perSpecifier.find((v) => v.id === spec.id)?.verdict ?? 'kept-decoration';
              const copy = VERDICT_COPY[verdict];
              return (
                <div key={spec.id} className="rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-white p-4 md:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[rgba(26,26,26,0.12)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(26,26,26,0.48)]">
                      {KIND_LABEL[spec.kind]}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]',
                        copy.tone === 'good'
                          ? 'border border-emerald-600/25 bg-emerald-50 text-emerald-700'
                          : 'border border-amber-600/30 bg-amber-50 text-amber-800',
                      )}
                    >
                      {copy.label}
                    </span>
                  </div>
                  <p className="mt-2 font-serif text-[17px] italic leading-relaxed text-[#1a1a1a]">
                    &ldquo;{spec.text}&rdquo;
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[rgba(26,26,26,0.65)]">{spec.rationale}</p>
                </div>
              );
            })}
          </div>

          {/* Target core + coach note */}
          <div className="mt-5 rounded-[8px] border border-[rgba(26,26,26,0.10)] bg-[#FBF8F1] p-5 md:p-6">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-[rgba(26,26,26,0.48)]">
              <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
              Target core
            </div>
            <p className="font-serif text-[20px] italic leading-[1.6] text-[#1a1a1a]">{item.core}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-[rgba(26,26,26,0.65)]">{item.coachNote}</p>
          </div>

          {mode === 'guided' ? (
            <button
              type="button"
              onClick={reset}
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(26,26,26,0.15)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[rgba(26,26,26,0.6)] transition-colors duration-300 hover:border-[rgba(26,26,26,0.3)] hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(26,26,26,0.3)]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
              Try again
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
