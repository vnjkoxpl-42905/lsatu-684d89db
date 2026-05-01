/**
 * MC-DIA-6.3 · Recommendations.
 * Rule-based engine over trait performance + SRS due-today + calibration seed.
 */

import { Link } from 'react-router-dom';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { aggregateTraitStats, buildRecommendations } from '@/bootcamps/main-conclusion/lib/diagnostics';
import { isDue } from '@/bootcamps/main-conclusion/lib/srs';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';

export function Recommendations() {
  const d = useDiagnostics();
  if (d.loading) {
    return (
      <div className="px-6 py-10 max-w-3xl mx-auto">
        <LoadingSkeleton lines={6} />
      </div>
    );
  }
  const traits = aggregateTraitStats(d.trapsTags);
  const dueCount = d.srsItems.filter((s) =>
    isDue({ ease: s.ease, interval_days: s.interval_days, lapses: s.lapses, reps: 0, due_at_iso: s.due_at, last_grade: s.last_grade ?? 0 }),
  ).length;
  const recs = buildRecommendations(traits, dueCount, d.calibrationAttempts.length > 0);

  return (
    <article className="px-6 py-10 max-w-3xl mx-auto space-y-5">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">MC-DIA-6.3</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Recommendations</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft mt-2">
          Targeted next moves, ranked by leverage. Surfaces from your trait performance, your SRS queue,
          and the calibration seed.
        </p>
      </header>

      {recs.length === 0 ? (
        <Card variant="elev">
          <p className="font-mc-serif text-body-prose text-ink">
            Nothing to recommend yet. Take the M1.13 capstone to seed the engine.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {recs.map((r) => (
            <li key={r.id}>
              <Card variant="surface">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mc-mono text-mono text-ink-faint">{r.kind}</div>
                    <h3 className="font-mc-serif text-h3 font-semibold mt-1">{r.title}</h3>
                    <p className="font-mc-serif text-body text-ink-soft mt-2">{r.reason}</p>
                  </div>
                  <Badge tone={r.priority === 1 ? 'accent' : 'neutral'}>P{r.priority}</Badge>
                </div>
                <Link to={r.href} className="inline-block mt-3">
                  <Button size="sm">Go →</Button>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
