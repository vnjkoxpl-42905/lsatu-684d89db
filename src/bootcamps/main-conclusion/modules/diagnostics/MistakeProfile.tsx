/**
 * MC-DIA-6.6 · Mistake Profile.
 * Surfaces the patterns under wrong answers — by trait + by surface.
 */

import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { aggregateTraitStats } from '@/bootcamps/main-conclusion/lib/diagnostics';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';
import { EmptyState } from '@/bootcamps/main-conclusion/components/primitives/EmptyState';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

export function MistakeProfile() {
  const d = useDiagnostics();
  if (d.loading) {
    return (
      <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }

  const wrong = d.trapsTags.filter((t) => t.picked && !t.correct);
  const bySurface = new Map<string, typeof wrong>();
  for (const t of wrong) {
    const arr = bySurface.get(t.surface_id) ?? [];
    arr.push(t);
    bySurface.set(t.surface_id, arr);
  }

  const stats = aggregateTraitStats(d.trapsTags);
  const topTraps = stats
    .filter((s) => s.picked_when_wrong > 0)
    .sort((a, b) => b.picked_when_wrong - a.picked_when_wrong)
    .slice(0, 3);

  if (wrong.length === 0) {
    return (
      <EmptyState
        title="No mistakes recorded yet"
        body="The Mistake Profile populates as you make wrong-answer choices in the Simulator and capstones."
        surfaceId="MC-DIA-6.6"
      />
    );
  }

  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-3xl mx-auto space-y-5">
      <PageHeader eyebrow="MC-DIA-6.6" title="Mistake Profile" compact />

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Top traps you fall for</h2>
        <ul className="mt-3 space-y-2">
          {topTraps.map((t) => (
            <li key={t.trait}>
              <Card variant="surface">
                <div className="flex items-center justify-between">
                  <Chip tone="accent">{t.trait}</Chip>
                  <span className="font-mc-mono text-mono text-ink-faint">picked {t.picked_when_wrong}×</span>
                </div>
                <p className="font-mc-serif text-body text-ink mt-2">
                  {t.attempts > 0 ? `${Math.round(t.accuracy * 100)}% accuracy across ${t.attempts} encounters.` : 'No accuracy data.'}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">By surface</h2>
        <ul className="mt-3 space-y-2">
          {Array.from(bySurface.entries()).map(([surface, hits]) => (
            <li key={surface}>
              <Card variant="surface">
                <div className="flex items-center justify-between">
                  <span className="font-mc-mono text-mono text-ink-faint">{surface}</span>
                  <span className="font-mc-mono text-mono">{hits.length} miss{hits.length === 1 ? '' : 'es'}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {hits.map((h, i) => (
                    <Chip key={i} tone="opposing">
                      {h.letter} · {h.trait_id ?? '—'}
                    </Chip>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
