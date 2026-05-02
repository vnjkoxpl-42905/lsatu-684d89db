/**
 * MC-DIA-6.7 · SRS Queue.
 * SM-2 algorithm. Reviews missed simulator questions and flagged drill items.
 */

import { useState } from 'react';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { review, isDue, type SrsState } from '@/bootcamps/main-conclusion/lib/srs';
import { getPersistence } from '@/bootcamps/main-conclusion/persistence/factory';
import { TABLES, type SrsQueueItem } from '@/bootcamps/main-conclusion/persistence/records';
import { useUser } from '@/bootcamps/main-conclusion/hooks/useUser';
import { now } from '@/bootcamps/main-conclusion/lib/ids';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

export function SrsQueue() {
  const d = useDiagnostics();
  const user = useUser();
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

  if (d.loading) {
    return (
      <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }

  const dueItems = d.srsItems.filter((s) => {
    if (reviewedIds.has(s.id)) return false;
    return isDue(toState(s));
  });
  const upcoming = d.srsItems.filter((s) => !isDue(toState(s)));

  async function grade(item: SrsQueueItem, q: number) {
    if (!user) return;
    const next = review(toState(item), q);
    const merged: SrsQueueItem = {
      ...item,
      ease: next.ease,
      interval_days: next.interval_days,
      lapses: next.lapses,
      due_at: next.due_at_iso,
      last_grade: next.last_grade,
      last_reviewed_at: now(),
    };
    const persist = getPersistence(user.id);
    await persist.set(TABLES.srs_queue, item.id, merged);
    setReviewedIds((s) => new Set(s).add(item.id));
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Diagnostics"
        title="SRS Queue"
        description="Spaced-repetition queue (SM-2). Grade your recall on each item; the algorithm schedules the next review."
        actions={
          <>
            <Badge tone="accent" dot pulse={dueItems.length > 0}>
              {dueItems.length} due
            </Badge>
            <Badge tone="neutral">{upcoming.length} upcoming</Badge>
          </>
        }
      />

      {d.srsItems.length === 0 ? (
        <EmptyState
          title="Queue is empty"
          body="Items add to the queue as you miss questions in the Simulator and capstones."
          surfaceId="MC-DIA-6.7"
        />
      ) : null}

      {dueItems.length > 0 ? (
        <section>
          <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Due now</h2>
          <ul className="mt-3 space-y-3">
            {dueItems.map((item) => (
              <li key={item.id}>
                <Card variant="surface">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mc-mono text-mono text-ink-faint">{item.surface_id}</div>
                      <p className="font-mc-serif text-body text-ink mt-1">
                        ease {item.ease.toFixed(2)} · interval {item.interval_days}d · lapses {item.lapses}
                      </p>
                    </div>
                    <Chip tone="accent">due</Chip>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {([0, 1, 2, 3, 4, 5] as const).map((q) => (
                      <Button key={q} variant={q < 3 ? 'danger' : 'subtle'} size="sm" onClick={() => grade(item, q)}>
                        {q}
                      </Button>
                    ))}
                  </div>
                  <p className="font-mc-mono text-mono text-ink-faint mt-2">
                    Grades: 0–2 = failed (resets) · 3 = hard · 4 = good · 5 = easy
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Upcoming</h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((item) => (
              <li key={item.id}>
                <Card variant="ghost">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mc-mono text-mono text-ink-faint">{item.surface_id}</span>
                    <span className="font-mc-mono text-mono text-ink-soft">
                      due {new Date(item.due_at).toLocaleDateString()}
                    </span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function toState(s: SrsQueueItem): SrsState {
  return {
    ease: s.ease,
    interval_days: s.interval_days,
    lapses: s.lapses,
    reps: 0,
    due_at_iso: s.due_at,
    last_grade: s.last_grade ?? 0,
  };
}
