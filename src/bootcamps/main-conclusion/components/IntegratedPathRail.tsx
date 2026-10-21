import { Check } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import {
  INTEGRATED_PATH,
  getActionTypeLabel,
  getCurrentAction,
  getCurrentActionIndex,
  getNextAction,
  type PathAction,
} from '@/bootcamps/main-conclusion/content/introToLrPath';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';

export function IntegratedPathRail() {
  const { pathname, hash } = useLocation();
  const currentPath = `${pathname}${hash}`;
  const currentAction = getCurrentAction(currentPath);
  const currentIndex = getCurrentActionIndex(currentPath);
  const nextAction = getNextAction(currentPath);
  const totalSteps = INTEGRATED_PATH.length;

  // Completion comes from persisted progress, not route position. A step is
  // "done" only when its completion id is actually recorded; untracked step
  // types (tools, references, capstones) fall back to the already-passed
  // heuristic so the rail still advances visually.
  const { progress } = useModuleProgress();
  const completedLessons = new Set(progress?.completed_lessons ?? []);
  const completedDrills = new Set(progress?.completed_drills ?? []);
  const isPersistedComplete = (action: PathAction): boolean => {
    if (!action.completionId) return false;
    if (action.type === 'note') return completedLessons.has(action.completionId);
    if (action.type === 'drill' || action.type === 'practice') {
      return completedDrills.has(action.completionId);
    }
    return false;
  };

  return (
    <>
      <aside className="hidden desktop:block w-[18.5rem] shrink-0 pr-8">
        <nav
          aria-label="Intro to LR course path"
          className={cn(
            'sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto rounded-5 border border-[rgb(var(--border)/0.10)]',
            'bg-[rgb(var(--surface)/0.92)] px-5 py-5 shadow-[0_18px_45px_rgba(26,26,26,0.08)] backdrop-blur-sm',
          )}
        >
          <div className="mb-5 border-b border-[rgb(var(--border)/0.08)] pb-4">
            <p className="font-mc-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint/75">
              Intro to LR Path
            </p>
            <p className="mt-2 font-mc-serif text-sm leading-relaxed text-ink-soft">
              Follow the full learning path across lessons, drills, practice, and capstones.
            </p>
          </div>

          <ol className="space-y-1">
            {INTEGRATED_PATH.map((action, index) => {
              const isCompleted =
                isPersistedComplete(action) ||
                (!action.completionId && currentIndex >= 0 && index < currentIndex);
              const isCurrent = currentIndex >= 0 && index === currentIndex;
              const isUpcoming = !isCompleted && !isCurrent;
              const isNext = currentIndex >= 0 && index === currentIndex + 1;

              return (
                <li key={action.id} className="relative pl-10">
                  {index < totalSteps - 1 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-[0.95rem] top-7 h-[calc(100%-0.25rem)] w-px -translate-x-1/2',
                        isCompleted ? 'bg-[rgb(var(--accent)/0.48)]' : 'bg-[rgb(var(--border)/0.14)]',
                      )}
                    />
                  ) : null}

                  <NavLink
                    to={action.route}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={cn(
                      'group block rounded-4 px-3 py-3 transition-[background-color,border-color,color,box-shadow] duration-150 ease-eased',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                      isCurrent && 'bg-[rgb(var(--accent)/0.10)] shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.18)]',
                      !isCurrent && 'hover:bg-[rgb(var(--surface-elev)/0.72)]',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-[0.95rem] top-[1.05rem] z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                        isCurrent && 'border-[rgb(var(--accent)/0.70)] bg-[rgb(var(--accent))] text-[rgb(var(--bg))] shadow-[0_0_0_4px_rgb(var(--accent)/0.12)]',
                        isCompleted && 'border-[rgb(var(--accent)/0.55)] bg-[rgb(var(--accent)/0.20)] text-[rgb(var(--accent-deep))]',
                        isUpcoming && 'border-[rgb(var(--border)/0.22)] bg-[rgb(var(--surface))] text-ink-faint',
                      )}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" strokeWidth={2.6} /> : index + 1}
                    </span>

                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-mc-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint/80">
                          {getActionTypeLabel(action.type)}
                        </span>
                        <span
                          className={cn(
                            'mt-1 block font-mc-serif text-[15px] italic leading-snug',
                            isCurrent ? 'text-ink' : 'text-ink-soft group-hover:text-ink',
                          )}
                        >
                          {action.title}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-ink-faint">
                          {action.description}
                        </span>
                        {action.estMinutes ? (
                          <span className="mt-1.5 block font-mc-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint/70">
                            ~{action.estMinutes} min
                          </span>
                        ) : null}
                        {action.constraint ? (
                          <span className="mt-2 block rounded-3 border-l-2 border-[rgb(var(--accent)/0.45)] bg-[rgb(var(--accent)/0.06)] px-2.5 py-1.5 text-[11px] leading-relaxed text-ink-soft">
                            {action.constraint}
                          </span>
                        ) : null}
                      </span>

                      {isNext ? (
                        <span className="mt-1 shrink-0 rounded-full border border-[rgb(var(--accent)/0.24)] bg-[rgb(var(--accent)/0.10)] px-2 py-1 font-mc-mono text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--accent-deep))]">
                          Next
                        </span>
                      ) : null}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>

      <nav
        aria-label="Intro to LR course path summary"
        className={cn(
          'desktop:hidden rounded-4 border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface)/0.92)] px-4 py-3',
          'shadow-[0_12px_30px_rgba(26,26,26,0.06)] backdrop-blur-sm',
        )}
      >
        {currentAction ? (
          <div className="space-y-1">
            <p className="font-mc-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint/80">
              Step {currentIndex + 1} of {totalSteps}
              {currentAction.estMinutes ? ` · ~${currentAction.estMinutes} min` : ''}
            </p>
            <p className="font-mc-serif text-lg italic leading-tight text-ink">{currentAction.title}</p>
            <p className="text-sm leading-relaxed text-ink-soft">
              {nextAction ? `Next: ${nextAction.title}` : 'Final step in this path.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="font-mc-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint/80">
              Intro to LR Path
            </p>
            <p className="font-mc-serif text-base italic leading-tight text-ink-soft">
              Course path navigation stays available here as you move through the bootcamp.
            </p>
          </div>
        )}
      </nav>
    </>
  );
}
