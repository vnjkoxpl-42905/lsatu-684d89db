import { useMemo, useState } from 'react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';
import { ReplicaShell, RoleKey, StimulusInlineSegment } from './shared';

export function MainConclusionReplicaTemplate({
  title,
  questions,
  onComplete,
}: {
  title: string;
  questions: CanonicalStructureQuestion[];
  onComplete?: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const current = questions[index]!;
  const isLast = index === questions.length - 1;

  const roleReveal = useMemo(
    () =>
      current.chunks.map((chunk, chunkIndex) => ({
        chunk,
        accent:
          chunkIndex === current.correctMainConclusionIndex
            ? 'conclusion'
            : current.opposingViewIndexes.includes(chunkIndex)
              ? 'opposing'
              : current.supportIndexes.includes(chunkIndex)
                ? 'support'
                : 'neutral',
      })),
    [current],
  );

  function analyzeSelection() {
    if (selectedIndex == null) return;
    setStatus(selectedIndex === current.correctMainConclusionIndex ? 'correct' : 'wrong');
  }

  function nextQuestion() {
    if (isLast) {
      onComplete?.();
      return;
    }
    setIndex((value) => value + 1);
    setSelectedIndex(null);
    setStatus('idle');
  }

  return (
    <ReplicaShell
      title={title}
      description="Read the full stimulus, click the sentence you think the author is trying to prove, then analyze your pick."
    >
      <Card variant="elev" className="overflow-hidden rounded-[28px] p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(250px,320px)_1fr]">
          <aside className="border-b border-[rgba(26,26,26,0.08)] bg-[#fffaf0] p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
                  {index + 1} of {questions.length}
                </p>
                <h2 className="font-mc-serif text-[29px] leading-[1.04] text-ink">Find the main conclusion.</h2>
                <p className="text-[15px] leading-7 text-ink-soft">
                  Choose the sentence that the rest of the stimulus is trying to prove.
                </p>
              </div>

              <div className="rounded-[20px] border border-[rgba(26,26,26,0.08)] bg-white px-4 py-4">
                <p className="font-mc-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">Task</p>
                <p className="mt-3 text-[15px] leading-7 text-ink">
                  Click one sentence in the workspace, then press <span className="font-semibold">Analyze Selection</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {status === 'correct' ? (
                  <Button onClick={nextQuestion}>{isLast ? 'Finish Lab' : 'Next Question'}</Button>
                ) : (
                  <Button onClick={analyzeSelection} disabled={selectedIndex == null}>
                    Analyze Selection
                  </Button>
                )}
              </div>

              {status === 'wrong' ? (
                <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-[15px] leading-7 text-rose-950">
                  <p className="font-mc-mono text-[10px] uppercase tracking-[0.2em] text-rose-700">Hint</p>
                  <p className="mt-2">{current.hint}</p>
                </div>
              ) : null}

              {status === 'correct' ? <RoleKey /> : null}
            </div>
          </aside>

          <div className="space-y-5 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mc-mono text-[10px] uppercase tracking-[0.24em] text-ink-soft">Stimulus Workspace</p>
              </div>
              <div className="rounded-full border border-[rgba(26,26,26,0.08)] bg-white px-3 py-1 font-mc-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                Question {index + 1}
              </div>
            </div>

            <div className="rounded-[24px] border border-[rgba(26,26,26,0.08)] bg-[#fffdfa] px-5 py-5 md:px-7 md:py-6">
              <div className="text-[18px] leading-[2] text-ink md:text-[19px]">
                {(status === 'correct' ? roleReveal : current.chunks.map((chunk) => ({ chunk, accent: 'ink' as const }))).map(
                  ({ chunk, accent }, chunkIndex) => (
                    <StimulusInlineSegment
                      key={`${current.id}-${chunkIndex}`}
                      html={chunk}
                      selected={selectedIndex === chunkIndex || status === 'correct'}
                      accent={status === 'correct' ? accent : selectedIndex === chunkIndex ? 'conclusion' : 'ink'}
                      onClick={status === 'correct' ? undefined : () => setSelectedIndex(chunkIndex)}
                    />
                  ),
                )}
              </div>
            </div>

            {status === 'correct' ? (
              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[16px] leading-[1.75] text-emerald-950">
                <p className="font-mc-mono text-[10px] uppercase tracking-[0.2em] text-emerald-700">Role Reveal</p>
                <p className="mt-2">{current.revealExplanation}</p>
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-[rgba(26,26,26,0.12)] bg-white/70 px-5 py-4 text-[15px] leading-7 text-ink-soft">
                The reveal appears after you test a selection.
              </div>
            )}
          </div>
        </div>
      </Card>
    </ReplicaShell>
  );
}
