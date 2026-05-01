/**
 * MC-DIA-6.5 · Trait Diagnostic.
 * Per-trait accuracy + picked-when-wrong + link to deep-dive.
 */

import { Link } from 'react-router-dom';
import traps from '@/bootcamps/main-conclusion/data/traps.generated.json';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { aggregateTraitStats } from '@/bootcamps/main-conclusion/lib/diagnostics';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';

interface Trait {
  id: string;
  name: string;
  what: string;
}

export function TraitProfile() {
  const d = useDiagnostics();
  if (d.loading) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }
  const stats = aggregateTraitStats(d.trapsTags);
  const meta = traps as Trait[];
  const sorted = [...stats].sort((a, b) => {
    if (a.attempts === 0 && b.attempts === 0) return 0;
    if (a.attempts === 0) return 1;
    if (b.attempts === 0) return -1;
    return a.accuracy - b.accuracy;
  });

  return (
    <article className="px-6 py-10 max-w-3xl mx-auto space-y-4">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">MC-DIA-6.5</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Trait Diagnostic</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-2">
          Seven traits. Sorted by which trips you up most. Tap a trait to read the deep-dive.
        </p>
      </header>

      <ul className="space-y-3">
        {sorted.map((s) => {
          const m = meta.find((t) => t.id === s.trait);
          return (
            <li key={s.trait}>
              <Card variant="surface">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Chip tone="accent">{s.trait}</Chip>
                      <span className="font-mc-serif text-h3 font-semibold">{m?.name ?? s.trait}</span>
                    </div>
                    {m ? <p className="font-mc-serif text-body text-ink-soft mt-2">{m.what}</p> : null}
                  </div>
                  <div className="text-right">
                    <Badge tone={s.attempts === 0 ? 'neutral' : s.accuracy >= 0.6 ? 'success' : 'error'}>
                      {s.attempts === 0 ? 'no data' : `${Math.round(s.accuracy * 100)}%`}
                    </Badge>
                    <p className="font-mc-mono text-mono text-ink-faint mt-1">
                      {s.correct}/{s.attempts}
                    </p>
                    {s.picked_when_wrong > 0 ? (
                      <p className="font-mc-mono text-mono text-ink-faint">
                        picked {s.picked_when_wrong}× when wrong
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link to={`/simulator/trap-master/${s.trait}`} className="font-mc-mono text-mono text-mc-accent hover:underline mt-3 inline-block">
                  Read trait deep-dive →
                </Link>
              </Card>
            </li>
          );
        })}
      </ul>
    </article>
  );
}
