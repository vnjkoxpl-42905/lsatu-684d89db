import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODE_META, MODE_ORDER, type DeskMode, type DeskTask } from './deskTasks';

/**
 * The "Tools" list from the reference: the three Today modes as a vertical
 * list with a strong black selected bar, quiet counts, a tiny urgency marker,
 * then the top-3 ranked task rows for the selected mode and a View all link.
 */
export function ModeList({
  mode,
  counts,
  tasksByMode,
  visibleTasks,
  selectedTaskId,
  loading,
  onSelectMode,
  onSelectTask,
  onViewAll,
}: {
  mode: DeskMode;
  counts: Record<DeskMode, number>;
  tasksByMode: Record<DeskMode, DeskTask[]>;
  visibleTasks: DeskTask[];
  selectedTaskId?: string;
  loading: boolean;
  onSelectMode: (mode: DeskMode) => void;
  onSelectTask: (taskId: string) => void;
  onViewAll: () => void;
}) {
  return (
    <div>
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-black/40">Tools</div>

      <div className="space-y-1.5">
        {MODE_ORDER.map((key) => {
          const meta = MODE_META[key];
          const active = key === mode;
          const urgent = key !== mode && counts[key] > 0 && (tasksByMode[key][0]?.priority ?? 0) >= 95;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectMode(key)}
              className={cn(
                'grid w-full grid-cols-[24px_minmax(0,1fr)_28px] items-center gap-2.5 border px-3 py-2.5 text-left transition',
                active
                  ? 'border-black bg-black text-white'
                  : 'border-transparent text-black/65 hover:border-black/15 hover:bg-white/25',
              )}
            >
              <meta.Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="truncate text-sm font-semibold">{meta.label}</span>
              <span
                className={cn(
                  'relative justify-self-end text-xs tabular-nums',
                  active ? 'text-white/80' : 'text-black/50',
                )}
              >
                {counts[key]}
                {urgent && (
                  <span className="absolute -right-2 -top-1 h-1.5 w-1.5 rounded-full bg-[#c8841f]" aria-hidden />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-7 text-[10px] uppercase tracking-[0.2em] text-black/38">Next</div>
      <div className="mt-2.5 space-y-1.5">
        {loading ? (
          <div className="flex items-center gap-2 border border-black/12 bg-white/20 px-3 py-3 text-sm text-black/50">
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            Loading tasks
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="border border-dashed border-black/18 bg-white/15 px-3 py-3">
            <div className="text-sm font-semibold">{MODE_META[mode].empty}</div>
            <p className="mt-1 text-xs leading-5 text-black/48">No current teacher move.</p>
          </div>
        ) : (
          visibleTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedTaskId === task.id}
              onSelect={() => onSelectTask(task.id)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-black/55 transition hover:text-black"
      >
        {MODE_META[mode].viewAllLabel}
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function TaskRow({ task, selected, onSelect }: { task: DeskTask; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full border px-3 py-2.5 text-left transition',
        selected ? 'border-black bg-black text-white' : 'border-black/12 bg-white/15 text-black hover:bg-white/30',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{task.verb}</span>
        <span className={cn('text-[11px] tabular-nums', selected ? 'text-white/65' : 'text-black/42')}>
          {task.timing}
        </span>
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{task.subject}</div>
      <div className={cn('mt-0.5 truncate text-xs', selected ? 'text-white/60' : 'text-black/48')}>{task.reason}</div>
      {task.suggested && (
        <div className={cn('mt-1 text-[9px] uppercase tracking-[0.16em]', selected ? 'text-white/50' : 'text-black/38')}>
          Suggested
        </div>
      )}
    </button>
  );
}
