import {
  DOCK_CATALOG,
  ORBITAL_CATALOG,
  SIDEBAR_CATALOG,
  findCatalogItem,
  type CatalogItem,
} from "@/lib/layoutCatalog";
import type { LayoutPrefs } from "@/lib/layoutPresets";
import { cn } from "@/lib/utils";

interface Props {
  prefs: LayoutPrefs;
  userHasAccess: (item: CatalogItem) => boolean;
}

/**
 * Scaled-down mock of the three Foyer surfaces driven by `prefs`. Drives
 * directly from the catalog + the same access predicate the real Foyer uses
 * so the preview can't lie about what the user will see.
 *
 * Intentionally not the real surfaces — the orbital ring is a 3D component
 * and the gooey dock has heavy SVG filters; rendering them at scale would
 * be expensive and visually muddy. A clean iconographic mock reads better.
 */
export default function LayoutPreview({ prefs, userHasAccess }: Props) {
  const orbital = prefs.orbital
    .map((id) => findCatalogItem(ORBITAL_CATALOG, id))
    .filter((c): c is CatalogItem => !!c && userHasAccess(c));
  const dock = prefs.dock
    .map((id) => findCatalogItem(DOCK_CATALOG, id))
    .filter((c): c is CatalogItem => !!c && userHasAccess(c));
  const sidebar = prefs.sidebar
    .map((id) => findCatalogItem(SIDEBAR_CATALOG, id))
    .filter((c): c is CatalogItem => !!c && userHasAccess(c));

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
        Preview
      </div>

      <div className="rounded-lg bg-zinc-950 text-zinc-100 p-4 grid grid-cols-[140px_1fr] gap-3 min-h-[180px] overflow-hidden">
        {/* Sidebar mock */}
        <div className="flex flex-col gap-1 border-r border-zinc-800 pr-3">
          <div className="text-[8px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Sidebar</div>
          {sidebar.length === 0 ? (
            <div className="text-[10px] text-zinc-500 italic">Empty</div>
          ) : (
            sidebar.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 text-[10px] text-zinc-300 truncate"
                title={item.label}
              >
                <item.icon className="h-3 w-3 shrink-0 text-zinc-500" />
                <span className="truncate">{item.label}</span>
              </div>
            ))
          )}
          {sidebar.length > 8 && (
            <div className="text-[10px] text-zinc-500">+{sidebar.length - 8} more</div>
          )}
        </div>

        {/* Stage: orbital + dock */}
        <div className="flex flex-col items-center justify-between min-h-[150px] py-2">
          {/* Orbital mock — three icons in a triangle */}
          <div className="relative w-[120px] h-[80px]">
            {orbital.length === 0 ? (
              <div className="text-[10px] text-zinc-500 italic absolute inset-0 flex items-center justify-center">
                Empty orbital
              </div>
            ) : (
              orbital.slice(0, 3).map((item, idx) => {
                const total = Math.min(orbital.length, 3);
                const offsets =
                  total === 1
                    ? [{ left: 50, top: 35 }]
                    : total === 2
                    ? [
                        { left: 22, top: 35 },
                        { left: 78, top: 35 },
                      ]
                    : [
                        { left: 50, top: 5 },
                        { left: 12, top: 65 },
                        { left: 88, top: 65 },
                      ];
                const o = offsets[idx];
                return (
                  <div
                    key={item.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
                    style={{ left: `${o.left}%`, top: `${o.top}%` }}
                  >
                    <div className="h-7 w-7 rounded-full bg-zinc-800 ring-1 ring-zinc-700 flex items-center justify-center">
                      <item.icon className="h-3.5 w-3.5 text-zinc-300" />
                    </div>
                    <span className="text-[8px] text-zinc-500 whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Dock mock */}
          <div
            className={cn(
              "rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-1 flex items-center gap-1.5",
              dock.length === 0 && "border-dashed",
            )}
          >
            {dock.length === 0 ? (
              <span className="text-[9px] text-zinc-500 italic px-1">Empty dock</span>
            ) : (
              dock.map((item) => (
                <div
                  key={item.id}
                  className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center"
                  title={item.label}
                >
                  <item.icon className="h-3 w-3 text-zinc-300" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Updates as you edit. Items you don't have access to are filtered.
      </p>
    </section>
  );
}
