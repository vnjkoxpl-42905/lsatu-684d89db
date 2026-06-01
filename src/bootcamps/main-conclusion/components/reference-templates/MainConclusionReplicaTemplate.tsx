import { useMemo, useState } from 'react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import type { CanonicalStructureQuestion } from '@/bootcamps/main-conclusion/data/reference-drills/types';
import { ReplicaShell, RoleKey, StimulusLine } from './shared';

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
      eyebrow="Intro to LR · Replica Drill"
      title={title}
      description="Full stimulus first. Click the sentence you think the author is trying to prove, then analyze your choice."
    >
      <Card variant="elev" className="space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">
              Question {index + 1} of {questions.length}
            </p>
            <p className="font-mc-serif text-xl text-ink">Find the main conclusion.</p>
          </div>
          {status === 'correct' ? <RoleKey /> : null}
        </div>

        <div className="space-y-3">
          {(status === 'correct' ? roleReveal : current.chunks.map((chunk) => ({ chunk, accent: 'ink' as const }))).map(
            ({ chunk, accent }, chunkIndex) => (
              <StimulusLine
                key={`${current.id}-${chunkIndex}`}
                html={chunk}
                selected={selectedIndex === chunkIndex || status === 'correct'}
                accent={status === 'correct' ? accent : selectedIndex === chunkIndex ? 'ink' : 'ink'}
                onClick={status === 'correct' ? undefined : () => setSelectedIndex(chunkIndex)}
              />
            ),
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {status === 'correct' ? (
            <Button onClick={nextQuestion}>{isLast ? 'Finish Lab' : 'Next Question'}</Button>
          ) : (
            <Button onClick={analyzeSelection} disabled={selectedIndex == null}>
              Analyze Selection
            </Button>
          )}
          {status === 'wrong' ? (
            <p className="font-mc-serif text-body text-mc-error">{current.hint}</p>
          ) : null}
        </div>

        {status === 'correct' ? (
          <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-[16px] leading-[1.7] text-emerald-950">
            {current.revealExplanation}
          </div>
        ) : null}
      </Card>
    </ReplicaShell>
  );
}

