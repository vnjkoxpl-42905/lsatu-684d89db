/**
 * X-Ray Review Mode — annotated reveal drill for review/demo.
 * Source mechanic: lrfoundational X-Ray buttons (Stock Analysts, Indicator
 * Pivot, Concession/Pivot). Toggling X-Ray colors each role span.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { XRAY_ITEMS } from '@/bootcamps/main-conclusion/content/newDrills.source';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

const KIND_CLASSES: Record<string, string> = {
  premise: 'text-sky-700 bg-sky-50 border-b-2 border-sky-400 px-1 rounded',
  conclusion: 'text-emerald-700 font-semibold bg-emerald-50 border-b-2 border-emerald-500 px-1 rounded',
  opposing: 'text-rose-700 italic bg-rose-50 border-b-2 border-rose-400 px-1 rounded',
  indicator: 'text-amber-600 font-bold',
  plain: '',
};

export function XRayReview() {
  const user = useUser();
  const navigate = useNavigate();
  const { markDrillComplete } = useModuleProgress(user?.id);
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>({});

  const allOn = XRAY_ITEMS.every((it) => activeMap[it.id]);

  function finish() {
    markDrillComplete?.('MC-DRL-XRY');
    navigate('/bootcamp/intro-to-lr/drills');
  }

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-6 py-12 desktop:px-12 desktop:py-16">
      <PageHeader
        eyebrow="Drill · X-Ray Review"
        title="X-Ray review mode"
        description="Three canonical stimuli with role-by-role X-Ray reveals. Toggle X-Ray to see how conclusion, premise, opposing view, and indicators map onto the text."
      />

      <div className="space-y-5">
        {XRAY_ITEMS.map((item) => {
          const on = !!activeMap[item.id];
          return (
            <Card key={item.id} variant="elev" className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone="neutral">{item.tag}</Badge>
                  <h2 className="font-mc-serif mt-2 text-2xl italic text-ink">{item.title}</h2>
                </div>
                <Button
                  variant={on ? 'primary' : 'subtle'}
                  size="sm"
                  onClick={() => setActiveMap((m) => ({ ...m, [item.id]: !on }))}
                >
                  {on ? 'Hide X-Ray' : 'X-Ray scan'}
                </Button>
              </div>

              <blockquote
                className={cn(
                  'rounded-md border-l-4 px-4 py-3 text-body-prose leading-relaxed transition-colors',
                  on ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent)/0.06)] text-ink' : 'border-[rgb(var(--border)/0.18)] text-ink-soft',
                )}
              >
                {item.segments.map((seg, i) => (
                  <span key={i} className={on ? KIND_CLASSES[seg.kind] : ''}>
                    {seg.text}
                  </span>
                ))}
              </blockquote>

              {item.stem && (
                <p className="font-mc-mono text-xs uppercase tracking-widest text-ink-faint">
                  Stem · {item.stem}
                </p>
              )}

              {on && (
                <p className="rounded-md border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.7)] p-3 text-body text-ink-soft">
                  {item.insight}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={finish} disabled={!allOn}>
          {allOn ? 'Mark X-Ray review complete' : 'Reveal every X-Ray to continue'}
        </Button>
      </div>
    </article>
  );
}
