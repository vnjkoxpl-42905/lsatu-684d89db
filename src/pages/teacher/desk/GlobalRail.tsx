import { cn } from '@/lib/utils';
import { GLOBAL_RAIL } from './deskTasks';

/**
 * The "Forms" row from the reference: a compact icon rail for top-level
 * teacher navigation. Today is the active surface; the rest navigate out.
 */
export function GlobalRail({ onOpen }: { onOpen: (path: string) => void }) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Workspace</div>
      <nav className="flex items-center gap-2" aria-label="Teacher workspace">
        {GLOBAL_RAIL.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onOpen(item.path)}
            title={item.label}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center border transition',
              item.active
                ? 'border-black bg-black text-white'
                : 'border-black/15 text-black/55 hover:border-black/40 hover:text-black',
            )}
          >
            <item.Icon className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ))}
      </nav>
    </div>
  );
}
