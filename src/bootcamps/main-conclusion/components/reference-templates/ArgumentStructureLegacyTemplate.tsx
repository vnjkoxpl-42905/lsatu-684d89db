import { useMemo, useState } from 'react';

import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

function stripIndicatorMarkup(text: string): string {
  return text.replace(/<i-w t="[^"]+">([^<]+)<\/i-w>/g, '$1').replace(/\s+/g, ' ').trim();
}

function renderBreakdown(text: string) {
  return text.replace(/<i-w t="[^"]+">([^<]+)<\/i-w>/g, '$1');
}

function formatCounter(index: number, total: number) {
  return `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
}

function roleForChunk(question: CanonicalStructureQuestion, chunkIndex: number) {
  if (chunkIndex === question.correctMainConclusionIndex) return 'conclusion';
  if (question.opposingViewIndexes.includes(chunkIndex)) return 'opposing';
  if (question.supportIndexes.includes(chunkIndex)) return 'premise';
  return 'neutral';
}

export function ArgumentStructureLegacyTemplate({
  questions,
  onComplete,
}: {
  questions: CanonicalStructureQuestion[];
  onComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const current = questions[index]!;
  const isLast = index === questions.length - 1;
  const progressPercent = useMemo(() => (index / questions.length) * 100, [index, questions.length]);
  const hasOpposingView = current.opposingViewIndexes.length > 0;

  function selectChunk(chunkIndex: number) {
    if (revealed) return;
    setSelectedIndex(chunkIndex);
    setShowHint(false);
  }

  function handleAction() {
    if (revealed) {
      if (isLast) {
        onComplete?.();
        setIsFinished(true);
        return;
      }

      setIndex((value) => value + 1);
      setSelectedIndex(null);
      setRevealed(false);
      setShowHint(false);
      return;
    }

    if (selectedIndex == null) return;

    if (selectedIndex === current.correctMainConclusionIndex) {
      setRevealed(true);
      setShowHint(false);
      return;
    }

    setSelectedIndex(null);
    setShowHint(true);
  }

  if (isFinished) {
    return (
      <section className="mx-auto w-full max-w-[550px] space-y-5 pb-10">
        <div className="rounded-[32px] border border-white/10 bg-[#161b24] px-8 py-12 text-center text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="text-5xl">🏆</div>
          <h2 className="mt-5 font-mc-mono text-[24px] uppercase tracking-[0.14em] text-[#f1f5f9]">
            Excellent Work
          </h2>
          <p className="mt-3 text-[17px] leading-[1.8] text-[#94a3b8]">All structured nodes verified.</p>
          <div className="mt-6 rounded-[16px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 font-mc-mono text-[24px] text-emerald-300">
            #STRUCTURE_CERTIFIED
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[550px] space-y-5 pb-10 text-[#f1f5f9]">
      <div className="font-mc-mono text-[0.8rem] uppercase tracking-[0.1em] text-[#94a3b8]">
        <div className="mb-1 flex items-center justify-between">
          <span>Structural Analysis</span>
          <span>{formatCounter(index, questions.length)}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[#3b82f6] transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {revealed ? (
        <div className="inline-flex rounded bg-emerald-500 px-3 py-1 font-mc-mono text-[0.8rem] font-bold uppercase tracking-[0.08em] text-white">
          Analysis Successful
        </div>
      ) : (
        <div className="font-mc-mono text-[0.8rem] uppercase tracking-[0.08em] text-[#3b82f6]">
          &gt; Identify the Main Point
        </div>
      )}

      <div className="rounded-[24px] border border-white/8 bg-[#161b24] p-8 text-[1.15rem] leading-[1.8] shadow-[0_16px_50px_rgba(0,0,0,0.28)]">
        {current.chunks.map((chunk, chunkIndex) => {
          const role = roleForChunk(current, chunkIndex);
          const isSelected = selectedIndex === chunkIndex;
          const isOpposing = revealed && role === 'opposing';
          return (
            <button
              key={`${current.id}-${chunkIndex}`}
              type="button"
              onClick={() => selectChunk(chunkIndex)}
              className={cn(
                'mb-[14px] block w-full rounded-[18px] border px-5 py-[18px] text-center transition-all last:mb-0',
                revealed
                  ? role === 'conclusion'
                    ? 'border-emerald-500/45 bg-emerald-500/10 font-bold text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.16)]'
                    : role === 'premise'
                      ? 'border-sky-400/25 bg-sky-400/5 font-medium text-sky-300'
                      : isOpposing
                        ? 'border-violet-400/35 bg-violet-500/8 text-violet-300 shadow-[inset_4px_0_0_rgba(168,85,247,0.9)]'
                        : 'border-transparent bg-white/[0.02] text-[#f1f5f9]'
                  : isSelected
                    ? 'border-[#3b82f6] bg-[rgba(59,165,250,0.14)] text-[#f1f5f9] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.18)]'
                    : 'border-transparent bg-white/[0.02] text-[#f1f5f9] hover:border-[#3b82f6]/20 hover:bg-[#3b82f6]/8',
              )}
            >
              {stripIndicatorMarkup(chunk)}
            </button>
          );
        })}
      </div>

      {showHint ? (
        <div className="border-l-2 border-[#ef4444] px-[10px] py-[10px] font-mc-mono text-[0.9rem] text-[#ef4444]">
          {`> LOGIC MISMATCH: ${current.hint}`}
        </div>
      ) : null}

      {revealed ? (
        <div className="rounded-[20px] border border-emerald-500/20 bg-emerald-500/5 px-6 py-6 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
          <div className="flex flex-wrap gap-4 border-b border-white/5 pb-4 font-mc-mono text-[0.7rem] uppercase">
            <div className="flex items-center gap-2 text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Conclusion
            </div>
            <div className={cn('flex items-center gap-2 text-white', !current.supportIndexes.length && 'opacity-40')}>
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Support
            </div>
            <div className={cn('flex items-center gap-2 text-white', !hasOpposingView && 'opacity-40')}>
              <span className="h-2 w-2 rounded-full bg-violet-400" />
              Opposing
            </div>
          </div>

          {!hasOpposingView ? (
            <p className="mt-4 font-mc-mono text-[0.78rem] text-[#94a3b8]">
              &gt; This node has no opposing view. Purple appears only on rebuttal-style nodes.
            </p>
          ) : null}

          <div
            className="mt-4 text-[1rem] leading-[1.65] text-[#94a3b8]"
            dangerouslySetInnerHTML={{ __html: renderBreakdown(current.revealExplanation) }}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleAction}
        disabled={!revealed && selectedIndex == null}
        className={cn(
          'w-full rounded-[18px] px-6 py-[22px] font-mc-mono text-[1rem] font-bold uppercase tracking-[0.08em] transition-colors',
          !revealed && selectedIndex == null
            ? 'cursor-not-allowed bg-[#232a35] text-[#4b5563]'
            : revealed
              ? 'bg-emerald-500 text-white hover:bg-emerald-400'
              : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]',
        )}
      >
        {revealed ? (isLast ? 'View Certification' : 'Load Next Node') : 'Underline Selection'}
      </button>
    </section>
  );
}
