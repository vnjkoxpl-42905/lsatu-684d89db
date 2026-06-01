/**
 * Main Conclusion Lab — click-the-conclusion drill.
 * Source mechanic: introconclusiondrill (20-question reveal flow).
 * Wrong → hint. Right → structural role reveal + breakdown.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { MAIN_CONCLUSION_QUESTIONS } from '@/bootcamps/main-conclusion/content/newDrills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const ROLE_CLASSES: Record<string, string> = {
  conclusion: 'text-emerald-700 font-semibold border-b-2 border-emerald-500 bg-emerald-50/60',
  premise: 'text-sky-700',
  opposing: 'text-purple-700 italic',
};

export function MainConclusionLab() {
  const user = useUser();
  const navigate = useNavigate();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const q = MAIN_CONCLUSION_QUESTIONS[idx]!;
  const isLast = idx + 1 >= MAIN_CONCLUSION_QUESTIONS.length;
  const total = MAIN_CONCLUSION_QUESTIONS.length;

  function submit() {
    if (selected === null) return;
    if (selected === q.ans) {
      setRevealed(true);
      setHint(null);
    } else {
      setHint(q.hint);
      setSelected(null);
    }
  }

  function next() {
    if (isLast) {
      markDrillComplete?.('MC-DRL-MCL');
      navigate('/bootcamp/intro-to-lr/drills');
      return;
    }
    setIdx((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    setHint(null);
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill · Main Conclusion Lab"
        title="Click the main conclusion"
        description="Twenty arguments. Tap the sentence that the author is trying to prove. Wrong picks get a hint; right picks reveal the full structure."
      />
      <div className="flex items-center justify-between font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
        <span>{String(idx + 1).padStart(2, '0')} / {total}</span>
        <Badge tone={revealed ? 'accent' : 'neutral'}>{revealed ? 'Revealed' : 'Awaiting selection'}</Badge>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[rgb(var(--border)/0.18)]">
        <div className="h-full bg-[rgb(var(--accent))] transition-all" style={{ width: `${(idx / total) * 100}%` }} />
      </div>

      <Card variant="elev" className="p-6 text-body-prose leading-relaxed text-ink">
        {q.sentences.map((s, i) => {
          const isSelected = selected === i;
          const roleClass = revealed ? ROLE_CLASSES[q.roles[i]] ?? '' : '';
          return (
            <span
              key={i}
              role="button"
              tabIndex={revealed ? -1 : 0}
              onClick={() => !revealed && setSelected(i)}
              onKeyDown={(e) => {
                if (revealed) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelected(i);
                }
              }}
              className={cn(
                'cursor-pointer rounded px-0.5 transition-colors',
                !revealed && isSelected && 'bg-[rgb(var(--accent)/0.14)] border-b-2 border-[rgb(var(--accent))]',
                !revealed && !isSelected && 'hover:bg-[rgb(var(--border)/0.10)]',
                revealed && roleClass,
                revealed && 'cursor-default',
              )}
            >
              {s}
            </span>
          );
        })}
      </Card>

      {hint && !revealed && (
        <div className="rounded-md border-l-2 border-rose-500 bg-rose-50 px-3 py-2 font-mc-mono text-xs text-rose-700">
          {`> Not the main conclusion: ${hint}`}
        </div>
      )}

      {revealed && (
        <Card variant="surface" accent className="space-y-3 p-5 text-body text-ink-soft">
          <div className="flex gap-4 text-[10px] font-mc-mono uppercase tracking-widest">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Conclusion</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" />Premise</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" />Opposing</span>
          </div>
          <div dangerouslySetInnerHTML={{ __html: q.breakdown }} />
        </Card>
      )}

      <div className="flex justify-end">
        {!revealed ? (
          <Button onClick={submit} disabled={selected === null}>
            Underline selection
          </Button>
        ) : (
          <Button onClick={next}>{isLast ? 'Finish lab' : 'Next argument'}</Button>
        )}
      </div>
    </article>
  );
}
