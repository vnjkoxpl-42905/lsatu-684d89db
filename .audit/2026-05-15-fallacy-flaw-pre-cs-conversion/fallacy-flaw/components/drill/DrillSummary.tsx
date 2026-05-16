import { catalog } from '../../content/note-2-catalog';
import { pct } from '../../lib/utils';

export function DrillSummary({
  drillId,
  total,
  correct,
  missedQuestionIds,
  flawSlugByQuestion,
}: {
  drillId: string;
  total: number;
  correct: number;
  missedQuestionIds: string[];
  flawSlugByQuestion?: Record<string, string>;
}) {
  const score = pct(correct, total);
  const calibrated = score >= 80;

  const weak: { slug: string; count: number }[] = [];
  if (flawSlugByQuestion) {
    const tally: Record<string, number> = {};
    for (const q of missedQuestionIds) {
      const slug = flawSlugByQuestion[q];
      if (slug) tally[slug] = (tally[slug] ?? 0) + 1;
    }
    for (const [slug, count] of Object.entries(tally)) weak.push({ slug, count });
    weak.sort((a, b) => b.count - a.count);
  }

  return (
    <section className="border border-ink bg-paper-bright/70 p-6">
      <header className="flex items-baseline justify-between border-b border-rule pb-3">
        <h3 className="display-title text-2xl text-ink">Calibration · {drillId}</h3>
        <span className="protocol text-ink-mute">post-drill profile</span>
      </header>
      <div className="mt-4 grid gap-6 md:grid-cols-[auto_1fr]">
        <div>
          <div className="display-title text-6xl italic text-verdigris-deep">{score}%</div>
          <div className="protocol mt-1 text-ink-mute">
            {correct} of {total} correct
          </div>
        </div>
        <div className="leading-relaxed text-ink-soft">
          {calibrated ? (
            <p>
              Calibrated. Move on to harder application — try the next drill, or browse the catalog for sharper edges on flaws you barely-passed.
            </p>
          ) : (
            <p>
              Catalog is loaded for review. Start with the most-missed flaws below; they are seeded into spaced repetition. This is calibration, not a grade.
            </p>
          )}
        </div>
      </div>

      {weak.length > 0 && (
        <div className="mt-6">
          <h4 className="protocol text-ink-mute">Most-missed flaws</h4>
          <ul className="mt-2 space-y-1">
            {weak.map((w) => {
              const flaw = catalog.find((c) => c.slug === w.slug);
              if (!flaw) return null;
              return (
                <li key={w.slug} className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-ink">
                    {flaw.name}
                  </span>
                  <span className="protocol text-ink-mute">missed × {w.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
