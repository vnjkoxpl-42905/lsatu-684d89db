import { Link } from 'react-router-dom';
import { Check, ArrowRight, Lock } from 'lucide-react';
import lessons from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface LessonRow {
  id: string;
  number: string;
  title: string;
}

export function LessonsIndex(): JSX.Element {
  const { progress } = useModuleProgress();
  const all = (lessons as LessonRow[]).filter((lesson) => lesson.number !== '1.13');
  const completedCount = all.filter((lesson) => progress?.completed_lessons.includes(lesson.id) ?? false).length;
  const totalCount = all.length;

  return (
    <div className="mx-auto max-w-[860px] px-6 py-12 desktop:px-12 desktop:py-16">
      <Header completedCount={completedCount} totalCount={totalCount} />

      <ul className="mt-10 overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface)/0.82)] shadow-[var(--shadow-1)]">
        {all.map((l, idx) => {
          const completed = progress?.completed_lessons.includes(l.id) ?? false;
          const unlocked = true;
          const isLast = idx === all.length - 1;
          return (
            <li key={l.id} className={cn(!isLast && 'border-b border-[rgb(var(--border)/0.06)]')}>
              <Link
                to={`/bootcamp/intro-to-lr/lessons/${l.number}`}
                className={cn(
                  'group flex items-center gap-4 px-5 py-4',
                  'transition-colors duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-[-2px]',
                  unlocked ? 'hover:bg-[rgb(var(--surface)/1)]' : 'opacity-40 cursor-not-allowed pointer-events-none',
                )}
              >
                <StatusIcon completed={completed} unlocked={unlocked} />
                <span
                  className={cn(
                    'shrink-0 w-12 font-mc-mono text-mono',
                    completed ? 'text-ink-soft' : 'text-ink-faint',
                  )}
                >
                  {l.number}
                </span>
                <span
                  className={cn(
                    'grow font-mc-serif text-h3 leading-tight transition-colors duration-150 ease-eased',
                    completed ? 'text-ink-soft' : 'text-ink',
                    unlocked && 'group-hover:text-ink',
                  )}
                >
                  {l.title}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 h-4 w-4 transition-transform duration-220 ease-eased',
                    'text-ink-faint group-hover:text-ink group-hover:translate-x-0.5',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Header({
  completedCount,
  totalCount,
}: {
  completedCount: number;
  totalCount: number;
}): JSX.Element {
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  return (
    <header>
      <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.28em] text-ink-faint">
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]" />
        Lessons
      </div>
      <h1 className="mt-3 font-mc-serif text-[clamp(3rem,6vw,4.8rem)] font-medium italic text-ink leading-[0.92] tracking-[-0.06em]">
        Twelve guided lessons
      </h1>
      <p className="mt-4 max-w-[60ch] font-mc-sans text-body-prose leading-relaxed text-ink-soft">
        Each lesson is a guided session: briefing, demo, your attempt, reveal, coach&apos;s note,
        checkpoint. You answer before the explanation, then move forward one clear step at a time.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <div className="font-mc-mono text-mono text-ink-faint">
          {completedCount} / {totalCount} complete
        </div>
        <div
          className="relative h-1.5 w-40 overflow-hidden rounded-full bg-[rgb(var(--surface-elev))]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="absolute inset-0 origin-left bg-[image:var(--grad-accent-strong)] transition-transform duration-300 ease-eased motion-reduce:transition-none"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <div className="font-mc-mono text-mono text-ink">{pct}%</div>
      </div>
    </header>
  );
}

function StatusIcon({
  completed,
  unlocked,
}: {
  completed: boolean;
  unlocked: boolean;
}): JSX.Element {
  if (completed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          'border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.92)] text-ink shadow-[var(--soft-shadow)]',
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
      </span>
    );
  }
  if (!unlocked) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          'border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev))] text-ink-faint',
        )}
      >
        <Lock className="h-3 w-3" strokeWidth={2.2} />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        'border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev))]',
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink-faint))]" />
    </span>
  );
}
