/**
 * Argument Structure Lab — multi-step structure dissection.
 * Source mechanic: structuredrill (3 steps per item):
 *   1) click the main conclusion
 *   2) classify as First-Sentence or Rebuttal
 *   3) click the support claim (first) or the opposing viewpoint (rebuttal)
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { STRUCTURE_QUESTIONS, type StructureItem } from '@/bootcamps/main-conclusion/content/newDrills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { IndicatorText } from './structureUtils';

interface Props {
  /** Override the question pool — used by Mixed Structure Check. */
  questions?: StructureItem[];
  drillId: string;
  title: string;
  eyebrow: string;
  description: string;
}

type Step = 1 | 2 | 3 | 4;

export function ArgumentStructureLab({ questions, drillId, title, eyebrow, description }: Props) {
  const pool = questions ?? STRUCTURE_QUESTIONS;
  const user = useUser();
  const navigate = useNavigate();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<Step>(1);
  const [selectedC, setSelectedC] = useState<string | null>(null);
  const [classification, setClassification] = useState<'first' | 'rebuttal' | null>(null);
  const [selectedSupport, setSelectedSupport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const q = pool[idx]!;
  const isLast = idx + 1 >= pool.length;
  const conclusionId = useMemo(() => q.parts.find((p) => p.isC)?.id ?? '', [q]);
  const needsSupportKind: 'support' | 'opposing' = q.type === 'first' ? 'support' : 'opposing';

  function reset() {
    setStep(1);
    setSelectedC(null);
    setClassification(null);
    setSelectedSupport(null);
    setError(null);
  }

  function nextQuestion() {
    if (isLast) {
      markDrillComplete?.(drillId);
      navigate('/bootcamp/intro-to-lr/drills');
      return;
    }
    setIdx((i) => i + 1);
    reset();
  }

  function handlePartClick(partId: string) {
    setError(null);
    const part = q.parts.find((p) => p.id === partId)!;
    if (step === 1) {
      if (part.isC) {
        setSelectedC(partId);
        setStep(2);
      } else {
        setError('That is not the main conclusion. Look for the claim the author is trying to prove.');
      }
    } else if (step === 3) {
      const ok = needsSupportKind === 'support' ? part.isS : part.isO;
      if (ok) {
        setSelectedSupport(partId);
        setStep(4);
      } else {
        setError(needsSupportKind === 'support'
          ? 'That is not a supporting claim. Look for a premise that gives evidence for the conclusion.'
          : 'That is not the opposing viewpoint. Look for the position the author is pushing back against.');
      }
    }
  }

  function handleClassify(value: 'first' | 'rebuttal') {
    setError(null);
    if (value === q.type) {
      setClassification(value);
      setStep(3);
    } else {
      setError(value === 'first'
        ? 'Not first-sentence. The conclusion here is not at the very top — the author is responding to something.'
        : 'Not a rebuttal. The author leads with their own claim rather than pushing back on someone.');
    }
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="flex items-center justify-between font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
        <span>{String(idx + 1).padStart(2, '0')} / {String(pool.length).padStart(2, '0')}</span>
        <Badge tone="neutral">Step {Math.min(step, 3)} of 3</Badge>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[rgb(var(--border)/0.18)]">
        <div className="h-full bg-[rgb(var(--accent))] transition-all" style={{ width: `${(idx / pool.length) * 100}%` }} />
      </div>

      <Card variant="elev" className="p-6 text-body-prose leading-relaxed text-ink">
        {q.parts.map((p) => {
          const isClickable = (step === 1 || step === 3);
          const isSelected = (p.id === selectedC) || (p.id === selectedSupport);
          const revealedRole = step === 4
            ? p.isC ? 'conclusion' : p.isO ? 'opposing' : p.isS ? 'support' : 'neutral'
            : null;
          return (
            <span
              key={p.id}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : -1}
              onClick={() => isClickable && handlePartClick(p.id)}
              onKeyDown={(e) => {
                if (!isClickable) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handlePartClick(p.id);
                }
              }}
              className={cn(
                'rounded px-0.5 transition-colors',
                isClickable && 'cursor-pointer hover:bg-[rgb(var(--border)/0.10)]',
                isSelected && step <= 3 && 'bg-[rgb(var(--accent)/0.14)] border-b-2 border-[rgb(var(--accent))]',
                revealedRole === 'conclusion' && 'text-emerald-700 font-semibold border-b-2 border-emerald-500 bg-emerald-50/60',
                revealedRole === 'support' && 'text-sky-700',
                revealedRole === 'opposing' && 'text-rose-700 italic',
              )}
            >
              <IndicatorText html={p.text} />
            </span>
          );
        })}
      </Card>

      {error && (
        <div className="rounded-md border-l-2 border-rose-500 bg-rose-50 px-3 py-2 font-mc-mono text-xs text-rose-700">
          {`> ${error}`}
        </div>
      )}

      {step === 1 && (
        <Card variant="surface" className="p-4 text-body text-ink-soft">
          <strong className="font-mc-mono text-xs uppercase tracking-widest text-ink">Step 1.</strong>{' '}
          Click the sentence that contains the author's <em>main conclusion</em>.
        </Card>
      )}

      {step === 2 && (
        <Card variant="surface" className="space-y-3 p-4 text-body text-ink-soft">
          <p>
            <strong className="font-mc-mono text-xs uppercase tracking-widest text-ink">Step 2.</strong>{' '}
            Classify the structure of this argument.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="subtle" onClick={() => handleClassify('first')}>First-Sentence</Button>
            <Button variant="subtle" onClick={() => handleClassify('rebuttal')}>Rebuttal</Button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card variant="surface" className="p-4 text-body text-ink-soft">
          <strong className="font-mc-mono text-xs uppercase tracking-widest text-ink">Step 3.</strong>{' '}
          {needsSupportKind === 'support'
            ? 'Click a supporting claim — a premise the author uses as evidence.'
            : 'Click the opposing viewpoint the author is rebutting.'}
        </Card>
      )}

      {step === 4 && (
        <Card variant="surface" accent className="space-y-3 p-5 text-body text-ink-soft">
          <Badge tone="accent">Cleared</Badge>
          <p>{q.feedback}</p>
          <div className="flex gap-4 text-[10px] font-mc-mono uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Conclusion</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />Support</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Opposing</span>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={nextQuestion}>{isLast ? 'Finish lab' : 'Next argument'}</Button>
          </div>
        </Card>
      )}
    </article>
  );
}
