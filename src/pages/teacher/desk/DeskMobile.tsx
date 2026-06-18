import { useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { MODE_META, MODE_ORDER, type DeskMode, type DeskTask } from './deskTasks';

/**
 * Mobile chrome — assistant-first, not a 3-column stack. A compact mode/count
 * bar plus a selected-task chip sit above the assistant; the full queue lives in
 * a bottom drawer. The right context strip becomes card metadata (no third
 * column on phones).
 */
export function DeskMobile({
  mode,
  counts,
  tasks,
  selectedTask,
  loading,
  onSelectMode,
  onSelectTask,
}: {
  mode: DeskMode;
  counts: Record<DeskMode, number>;
  tasks: DeskTask[];
  selectedTask: DeskTask | null;
  loading: boolean;
  onSelectMode: (mode: DeskMode) => void;
  onSelectTask: (taskId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 lg:hidden">
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 border border-black/14 bg-white/20" role="group" aria-label="Task mode">
          {MODE_ORDER.map((key) => {
            const active = key === mode;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectMode(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[12px] font-semibold transition',
                  active ? 'bg-black text-white' : 'text-black/55',
                )}
              >
                {MODE_META[key].label}
                <span className={cn('tabular-nums', active ? 'text-white/70' : 'text-black/40')}>{counts[key]}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 border border-black/16 bg-white/20 px-3 text-[12px] font-semibold text-black/65"
        >
          <Layers className="h-4 w-4" strokeWidth={1.5} /> Queue
        </button>
      </div>

      {selectedTask ? (
        <div className="mt-2 truncate border border-black/12 bg-white/25 px-3 py-1.5 text-[12px] font-semibold text-black/70">
          {selectedTask.verb}: {selectedTask.subject}
        </div>
      ) : null}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#c3cace] text-[#11181c]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-sm font-semibold uppercase tracking-[0.14em] text-black/55">
              {MODE_META[mode].label} queue
            </DrawerTitle>
          </DrawerHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 pb-8">
            {loading ? (
              <div className="flex items-center gap-2 border border-black/12 bg-white/20 px-3 py-3 text-sm text-black/50">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> Loading tasks
              </div>
            ) : tasks.length === 0 ? (
              <div className="border border-dashed border-black/18 bg-white/15 px-3 py-4 text-sm text-black/50">
                {MODE_META[mode].empty}
              </div>
            ) : (
              tasks.map((task) => (
                <DrawerClose asChild key={task.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className={cn(
                      'w-full border px-3 py-2.5 text-left transition',
                      selectedTask?.id === task.id
                        ? 'border-black bg-black text-white'
                        : 'border-black/12 bg-white/20 hover:bg-white/35',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{task.verb}</span>
                      <span className={cn('text-[11px] tabular-nums', selectedTask?.id === task.id ? 'text-white/65' : 'text-black/42')}>
                        {task.timing}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold">{task.subject}</div>
                    <div className={cn('mt-0.5 truncate text-xs', selectedTask?.id === task.id ? 'text-white/60' : 'text-black/48')}>
                      {task.reason}
                    </div>
                  </button>
                </DrawerClose>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
