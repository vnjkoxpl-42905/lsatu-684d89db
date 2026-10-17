import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CardCarousel } from '@/components/ui/card-carousel';
import { cn } from '@/lib/utils';
import type { LibraryView } from '@/hooks/useDeskLibraryView';

export interface LibraryItem {
  id: string;
  /** Small mono/uppercase eyebrow line, e.g. "W1.1". */
  eyebrow?: string;
  title: string;
  /** Category / short description under the title. */
  subtitle?: string;
  badges?: string[];
  /** Right-aligned meta on the card header, e.g. "pool 50/6". */
  meta?: ReactNode;
  /** Preview region. `live` is true only where a heavy mount is affordable
   *  (the single selected item in Columns/Gallery); false elsewhere. */
  renderPreview?: (opts: { live: boolean }) => ReactNode;
  /** Open / Assign buttons (tab-specific). */
  actions: ReactNode;
}

/**
 * Mounts its child only while on/near screen — used to bound heavy previews
 * (e.g. live bootcamp app mounts) to visible carousel slides.
 */
function LivePreviewSlot({
  render,
}: {
  render: (opts: { live: boolean }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setLive(entry.isIntersecting),
      { rootMargin: '100px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return <div ref={ref}>{render({ live })}</div>;
}

function Badges({ badges }: { badges?: string[] }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <span key={b} className="border border-black/15 bg-white/40 px-1.5 py-0.5 text-[10px] text-black/65">
          {b}
        </span>
      ))}
    </div>
  );
}

function CardHeader({ item }: { item: LibraryItem }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        {item.eyebrow && (
          <div className="text-[10px] font-mono uppercase tracking-wider text-black/45">{item.eyebrow}</div>
        )}
        {/* Two lines, then ellipsis, with the whole title on hover. A single
            truncated line turned "Principle" into "Princip…", which tells you
            nothing about which card you are looking at. */}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold text-black" title={item.title}>
          {item.title}
        </h3>
        {item.subtitle && <div className="text-[11px] text-black/55">{item.subtitle}</div>}
      </div>
      {item.meta != null && <span className="shrink-0 text-[11px] tabular-nums text-black/45">{item.meta}</span>}
    </div>
  );
}

function GridView({ items }: { items: LibraryItem[] }) {
  return (
    <CardCarousel
      items={items}
      getKey={(i) => i.id}
      slidesPerPage={3}
      slideClassName="h-auto"
      renderItem={(item) => (
        <article className="flex h-full flex-col gap-3 border border-black/12 bg-white/35 p-4 transition hover:border-black/30 hover:bg-white/55">
          <CardHeader item={item} />
          <Badges badges={item.badges} />
          {item.renderPreview && <LivePreviewSlot render={item.renderPreview} />}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">{item.actions}</div>
        </article>
      )}
    />
  );
}

function ListView({ items }: { items: LibraryItem[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 border border-black/12 bg-white/35 px-4 py-2.5 transition hover:border-black/30 hover:bg-white/55"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              {item.eyebrow && (
                <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-black/40">
                  {item.eyebrow}
                </span>
              )}
              <span className="truncate text-sm font-semibold text-black" title={item.title}>{item.title}</span>
              {item.subtitle && <span className="truncate text-[11px] text-black/50">· {item.subtitle}</span>}
            </div>
          </div>
          {item.meta != null && <span className="shrink-0 text-[11px] tabular-nums text-black/45">{item.meta}</span>}
          <div className="flex shrink-0 items-center gap-2">{item.actions}</div>
        </div>
      ))}
    </div>
  );
}

function Detail({ item }: { item: LibraryItem }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <CardHeader item={item} />
      <Badges badges={item.badges} />
      {/* The preview is `position: relative` with an aspect-ratio height, so it
          overflows this slot and — being positioned — paints over the static
          action row below it, swallowing the clicks. Clip it, and let the row
          paint last. */}
      {item.renderPreview && <div className="min-h-0 flex-1 overflow-hidden">{item.renderPreview({ live: true })}</div>}
      <div className="relative flex shrink-0 flex-wrap items-center gap-2 pt-1">{item.actions}</div>
    </div>
  );
}

function ColumnsView({ items }: { items: LibraryItem[] }) {
  const [selected, setSelected] = useState(items[0]?.id);
  const active = items.find((i) => i.id === selected) ?? items[0];
  if (!active) return null;
  return (
    <div className="flex h-full min-h-0 gap-4">
      <div className="w-64 shrink-0 overflow-y-auto border border-black/12 bg-white/35">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={cn(
              'flex w-full flex-col items-start border-b border-black/8 px-3 py-2 text-left transition',
              item.id === active.id ? 'bg-black text-white' : 'hover:bg-white/60',
            )}
          >
            {item.eyebrow && (
              <span className={cn('text-[9px] font-mono uppercase tracking-wider', item.id === active.id ? 'text-white/60' : 'text-black/40')}>
                {item.eyebrow}
              </span>
            )}
            <span className="truncate text-xs font-semibold" title={item.title}>{item.title}</span>
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Detail item={active} />
      </div>
    </div>
  );
}

function GalleryView({ items }: { items: LibraryItem[] }) {
  const [selected, setSelected] = useState(items[0]?.id);
  const active = items.find((i) => i.id === selected) ?? items[0];
  if (!active) return null;
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Detail item={active} />
      </div>
      <div className="flex shrink-0 gap-2 overflow-x-auto border-t border-black/10 pt-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            className={cn(
              'w-40 shrink-0 border px-3 py-2 text-left transition',
              item.id === active.id
                ? 'border-teacher-accent bg-white/70'
                : 'border-black/12 bg-white/35 hover:border-black/30',
            )}
          >
            {item.eyebrow && (
              <span className="block text-[9px] font-mono uppercase tracking-wider text-black/40">{item.eyebrow}</span>
            )}
            <span className="block truncate text-xs font-semibold text-black" title={item.title}>{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LibraryViews({ items, view }: { items: LibraryItem[]; view: LibraryView }) {
  if (view === 'list') return <ListView items={items} />;
  if (view === 'columns') return <ColumnsView items={items} />;
  if (view === 'gallery') return <GalleryView items={items} />;
  return <GridView items={items} />;
}

export default LibraryViews;
