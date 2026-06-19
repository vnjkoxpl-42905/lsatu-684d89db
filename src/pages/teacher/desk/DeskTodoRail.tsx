import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeskTask } from './deskTasks';

/**
 * Light task/to-do list for the Teacher Desk right rail. A flat, priority-sorted
 * view of pending reply/review/assign work — no mode switcher, no heavy panel.
 * Each row opens its source surface.
 */
export function DeskTodoRail({
  tasks,
  loading,
  onOpen,
}: {
  tasks: DeskTask[];
  loading: boolean;
  onOpen: (path: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">To-do</span>
        {!loading && tasks.length > 0 ? (
          <span className="text-[11px] tabular-nums text-black/40">{tasks.length}</span>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 border border-black/12 bg-white/20 px-3 py-3 text-sm text-black/50">
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
          Loading tasks
        </div>
      ) : tasks.length === 0 ? (
        <p className="border border-dashed border-black/18 bg-white/15 px-3 py-3 text-xs leading-5 text-black/48">
          Nothing waiting. Replies, reviews, and assignments will land here.
        </p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpen(task.openPath)}
              className="group w-full border border-black/12 bg-white/15 px-3 py-2.5 text-left text-black transition hover:border-black/25 hover:bg-white/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">{task.verb}</span>
                <span className="text-[11px] tabular-nums text-black/42">{task.timing}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">{task.subject}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-black/30 transition group-hover:text-black/60" strokeWidth={1.6} />
              </div>
              <div className="mt-0.5 truncate text-xs text-black/48">{task.reason}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
