import { cn } from '@/lib/utils';
import { DESK_WORKSPACES, type WorkspaceKey } from './deskTasks';

/**
 * The "Forms" row from the reference: a compact icon rail for top-level
 * teacher workspace selection inside the desk.
 */
export function GlobalRail({ active, onSelect }: { active: WorkspaceKey; onSelect: (key: WorkspaceKey) => void }) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Workspace</div>
      <nav className="flex items-center gap-2" aria-label="Teacher workspace">
        {DESK_WORKSPACES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            title={item.label}
            aria-label={item.label}
            aria-current={active === item.key ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center border transition',
              active === item.key
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
