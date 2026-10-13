import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssistantScope, DeskTask } from './deskTasks';

/**
 * Quiet assistant command line. No assistant plumbing is wired to this surface
 * yet, so it ships in a truthful disabled state: the scope toggle is visible
 * but the input is inert and says so. It never fakes a reply or suggestion.
 */
export function AssistantCommandLine({
  scope,
  onScopeChange,
  task,
}: {
  scope: AssistantScope;
  onScopeChange: (scope: AssistantScope) => void;
  task: DeskTask | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[620px] items-center gap-2 border border-black/14 bg-white/14 px-2 py-1.5">
      <div className="flex border border-black/14 bg-white/30 p-0.5" role="group" aria-label="Assistant scope">
        {(['task', 'workspace'] as AssistantScope[]).map((next) => (
          <button
            key={next}
            type="button"
            onClick={() => onScopeChange(next)}
            className={cn(
              'px-2.5 py-1 text-[11px] font-semibold capitalize transition',
              scope === next ? 'bg-black text-white' : 'text-black/52 hover:text-black',
            )}
          >
            {next}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 text-sm text-black/42">
        <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">
          {task
            ? `Assistant is not connected to the desk yet (${scope} scope).`
            : 'Assistant command line. Select a task first.'}
        </span>
      </div>
    </div>
  );
}
