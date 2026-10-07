import { useModuleStore } from '../../lib/store';
import { catalog } from '../../content/note-2-catalog';
import { groupMeta } from '../../lib/tokens';
import { cn } from '../../lib/utils';

const GROUP_FILTERS = [
  { id: 'all' as const, label: 'All 15' },
  { id: 'g1' as const, label: 'G1 · Real Flaw' },
  { id: 'g2' as const, label: 'G2 · Distractor' },
  { id: 'g3' as const, label: 'G3 · House-Named' },
];

export function CatalogGrid() {
  const filter = useModuleStore((s) => s.catalogFilter);
  const setFilter = useModuleStore((s) => s.setCatalogFilter);
  const items = filter === 'all' ? catalog : catalog.filter((c) => c.group === filter);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-rule-soft pb-4">
        <span className="protocol mr-2 text-ink-mute">filter</span>
        {GROUP_FILTERS.map((g) => {
          const active = filter === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setFilter(g.id)}
              className={cn(
                'protocol border px-3 py-1.5 text-xs transition-colors',
                active
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule hover:border-ink',
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((flaw) => {
          const meta = groupMeta[flaw.group];
          return (
            <li key={flaw.slug}>
              <div className="group block h-full border border-rule bg-paper-bright/40">
                <div
                  className="h-1.5"
                  style={{ backgroundColor: meta.color }}
                  aria-hidden
                />
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="display-title text-3xl italic text-ink-mute">
                      {String(flaw.number).padStart(2, '0')}
                    </span>
                    <span
                      className="protocol text-[0.65rem]"
                      style={{ color: meta.color }}
                    >
                      {meta.short} · {flaw.frequency}
                    </span>
                  </div>
                  <h3 className="mt-2 display-title text-xl text-ink">
                    {flaw.name}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
                    {flaw.definition}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
