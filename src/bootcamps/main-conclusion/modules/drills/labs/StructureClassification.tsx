/**
 * Structure Classification — First-Sentence vs Rebuttal classifier reps.
 * Source mechanic: structuredrill (step 2 only, focused).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { STRUCTURE_QUESTIONS } from '@/bootcamps/main-conclusion/content/newDrills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { IndicatorText } from './structureUtils';

export function StructureClassification() {
  const user = useUser();
  const navigate = useNavigate();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<'first' | 'rebuttal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = STRUCTURE_QUESTIONS[idx]!;
  const isLast = idx + 1 >= STRUCTURE_QUESTIONS.length;

  function choose(value: 'first' | 'rebuttal') {
    if (pick) return;
    if (value === q.type) {
      setPick(value);
      setError(null);
    } else {
      setError(value === 'first'
        ? 'Not first-sentence. The conclusion is not at the very top — the author is pushing back on a prior view.'
        : 'Not a rebuttal. The author leads with their own claim and supports it directly.');
    }
  }

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-CLS');
      navigate('/bootcamp/intro-to-lr/drills');
      return;
    }
    setIdx((i) => i + 1);
    setPick(null);
    setError(null);
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill · Structure Classification"
        title="First-Sentence vs Rebuttal"
        description="Snap-classify each argument's structure. Build the reflex before you put the full Structure Lab back together."
      />
      <div className="flex items-center justify-between font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
        <span>{String(idx + 1).padStart(2, '0')} / {String(STRUCTURE_QUESTIONS.length).padStart(2, '0')}</span>
        <Badge tone={pick ? 'accent' : 'neutral'}>{pick ? 'Correct' : 'Classify'}</Badge>
      </div>

      <Card variant="elev" className="p-6 text-body-prose leading-relaxed text-ink">
        {q.parts.map((p) => (
          <span key={p.id} className={p.isC && pick ? 'text-emerald-700 font-semibold border-b-2 border-emerald-500 bg-emerald-50/60' : ''}>
            <IndicatorText html={p.text} />
          </span>
        ))}
      </Card>

      {error && (
        <div className="rounded-md border-l-2 border-rose-500 bg-rose-50 px-3 py-2 font-mc-mono text-xs text-rose-700">
          {`> ${error}`}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          variant={pick === 'first' ? 'primary' : 'subtle'}
          disabled={pick !== null}
          onClick={() => choose('first')}
        >
          First-Sentence
        </Button>
        <Button
          variant={pick === 'rebuttal' ? 'primary' : 'subtle'}
          disabled={pick !== null}
          onClick={() => choose('rebuttal')}
        >
          Rebuttal
        </Button>
      </div>

      {pick && (
        <Card variant="surface" accent className="space-y-3 p-5 text-body text-ink-soft">
          <p>{q.feedback}</p>
          <div className="flex justify-end">
            <Button onClick={next}>{isLast ? 'Finish lab' : 'Next argument'}</Button>
          </div>
        </Card>
      )}
    </article>
  );
}
