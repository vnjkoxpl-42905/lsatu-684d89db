import { cn } from '../../lib/utils';

const PIPS = [
  { label: 'Approach', id: 'approach' },
  { label: 'Catalog', id: 'catalog' },
  { label: 'Drill', id: 'drill' },
  { label: 'Bootcamp', id: 'bootcamp' },
];

/** In the sub-app context this is purely decorative — no routing. */
export function SubBar({ activeId }: { activeId?: string }) {
  return (
    <nav className="border-b border-rule-soft bg-paper-bright/40 backdrop-blur-sm">
      <ol className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-3 protocol text-ink-mute">
        {PIPS.map((p, i) => {
          const active = p.id === activeId;
          return (
            <li key={p.id} className="flex items-center gap-1">
              <span
                className={cn(
                  'rounded-sm px-2 py-1',
                  active
                    ? 'bg-verdigris-tint text-verdigris-deep'
                    : '',
                )}
              >
                {String(i + 1).padStart(2, '0')} · {p.label}
              </span>
              {i < PIPS.length - 1 && <span aria-hidden className="text-rule">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
