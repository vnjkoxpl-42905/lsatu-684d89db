import { useState } from 'react';

import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { FOUNDATIONAL_REVEAL_DEMOS } from '@/bootcamps/main-conclusion/data/reference-drills/canonicalStructureQuestions';
import { ReplicaShell } from './shared';

export function FoundationalRevealDemoTemplate({
  title,
  onComplete,
}: {
  title: string;
  onComplete?: () => void;
}) {
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [gapBroken, setGapBroken] = useState(false);

  const allRevealed = revealedIds.length === FOUNDATIONAL_REVEAL_DEMOS.length && gapBroken;

  return (
    <ReplicaShell
      eyebrow="Intro to LR"
      title={title}
      description="Review the argument skeleton directly: X-ray the roles, expose the pivot, and watch the logical gap break the structure."
    >
      <div className="grid gap-6">
        {FOUNDATIONAL_REVEAL_DEMOS.map((demo) => {
          const revealed = revealedIds.includes(demo.id);
          return (
            <Card key={demo.id} variant="elev" className="space-y-5 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">{demo.tag}</p>
                  <h2 className="mt-1 font-mc-serif text-[28px] italic text-ink">{demo.title}</h2>
                </div>
                <Button
                  variant="subtle"
                  onClick={() =>
                    setRevealedIds((current) => (current.includes(demo.id) ? current : [...current, demo.id]))
                  }
                >
                  {revealed ? 'Revealed' : 'Reveal Structure'}
                </Button>
              </div>
              <div className="rounded-[20px] border border-[rgba(26,26,26,0.08)] bg-white px-5 py-4 text-[18px] leading-[1.75] text-ink">
                {demo.segments.map((segment, index) => {
                  const accent =
                    !revealed || segment.kind === 'plain'
                      ? ''
                      : segment.kind === 'conclusion'
                        ? 'bg-emerald-100 text-emerald-900'
                        : segment.kind === 'premise'
                          ? 'bg-sky-100 text-sky-900'
                          : segment.kind === 'opposing'
                            ? 'bg-violet-100 text-violet-900'
                            : 'bg-amber-100 text-amber-900';
                  return (
                    <span key={`${demo.id}-${index}`} className={accent ? `rounded px-1 ${accent}` : undefined}>
                      {segment.text}
                    </span>
                  );
                })}
              </div>
              {revealed ? (
                <div className="rounded-[18px] border border-[rgba(26,26,26,0.08)] bg-[#fffdf9] px-4 py-3 text-[16px] leading-[1.7] text-ink-soft">
                  {demo.insight}
                </div>
              ) : null}
            </Card>
          );
        })}

        <Card variant="surface" className="space-y-5 p-6 md:p-8">
          <div>
            <p className="font-mc-mono text-[11px] uppercase tracking-[0.22em] text-ink-soft">Logical Gap Simulator</p>
            <h2 className="mt-1 font-mc-serif text-[28px] italic text-ink">Break one premise. Watch the conclusion wobble.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className={gapBroken ? 'rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-900' : 'rounded-[18px] border border-sky-200 bg-sky-50 px-5 py-4 text-sky-900'}>
              Premise block
            </div>
            <div className="text-center font-mc-mono text-[12px] uppercase tracking-[0.22em] text-ink-soft">supports</div>
            <div className={gapBroken ? 'rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900' : 'rounded-[18px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900'}>
              Conclusion block
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="subtle" onClick={() => setGapBroken((value) => !value)}>
              {gapBroken ? 'Rebuild Argument' : 'Simulate Logical Gap'}
            </Button>
            {allRevealed ? <Button onClick={() => onComplete?.()}>Finish Review Mode</Button> : null}
          </div>
          <p className="text-[16px] leading-[1.7] text-ink-soft">
            {gapBroken
              ? 'Without the support block, the conclusion loses its guarantee. That is the gap you attack on LR.'
              : 'Keep the structure intact first. Then look for the one support move that the conclusion cannot survive without.'}
          </p>
        </Card>
      </div>
    </ReplicaShell>
  );
}
