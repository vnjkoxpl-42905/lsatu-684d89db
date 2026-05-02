import { Link } from 'react-router-dom';
import { Check, ArrowRight, Lock } from 'lucide-react';
import lessons from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

interface LessonRow {
  id: string;
  number: string;
  title: string;
}

export function LessonsIndex(): JSX.Element {
  const { progress } = useModuleProgress();
  const all = lessons as LessonRow[];
  const completedCount = progress?.completed_lessons.length ?? 0;
  const totalCount = all.length;

  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[860px] mx-auto">
      <Header completedCount={completedCount} totalCount={totalCount} />

      <ul className="mt-10 rounded-4 border border-[rgb(var(--border)/0.08)] overflow-hidden bg-[image:var(--grad-surface-soft)] shadow-[var(--shadow-1)]">
        {all.map((l, idx) => {
          const completed = progress?.completed_lessons.includes(l.id) ?? false;
          // Preview mode: every lesson is walkable.
          const unlocked = true;
          const isLast = idx === all.length - 1;
          return (
            <li
              key={l.id}
              className={cn(!isLast && 'border-b border-[rgb(var(--border)/0.06)]')}
            >
              <Link
                to={`/bootcamp/intro-to-lr/lessons/${l.number}`}
                className={cn(
                  'group flex items-center gap-4 px-5 py-4',
                  'transition-colors duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-[-2px]',
                  unlocked
                    ? 'hover:bg-[rgb(var(--surface-elev)/0.6)]'
                    : 'opacity-40 cursor-not-allowed pointer-events-none',
                )}
              >
                <StatusIcon completed={completed} unlocked={unlocked} />
                <span
                  className={cn(
                    'shrink-0 w-12 font-mc-mono text-mono',
                    completed ? 'text-mc-accent/70' : 'text-ink-faint',
                  )}
                >
                  {l.number}
                </span>
                <span
                  className={cn(
                    'font-mc-serif text-h3 grow leading-tight transition-colors duration-150 ease-eased',
                    completed ? 'text-ink-soft' : 'text-ink',
                    unlocked && 'group-hover:text-mc-accent',
                  )}
                >
                  {l.title}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={cn(
                    'shrink-0 h-4 w-4 transition-transform duration-220 ease-eased',
                    'text-ink-faint group-hover:text-mc-accent group-hover:translate-x-0.5',
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>

      <Footer />
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
      <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
        />
        Lessons
      </div>
      <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-tight">
        Thirteen lessons, then your first calibration
      </h1>
      <p className="font-mc-serif text-body-prose mt-4 text-ink-soft max-w-[60ch] leading-relaxed">
        Each lesson is a guided session: briefing, demo, your attempt, reveal, coach&apos;s note,
        checkpoint. You answer before the explanation. Calibration follows the lessons; you take it after the teaching, not before.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <div className="font-mc-mono text-mono text-ink-faint">
          {completedCount} / {totalCount} complete
        </div>
        <div
          className="relative h-1.5 w-40 rounded-full bg-[rgb(var(--surface-elev))] overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="absolute inset-0 bg-[image:var(--grad-accent-strong)] shadow-[var(--glow-accent-soft)] origin-left transition-transform duration-300 ease-eased motion-reduce:transition-none"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <div className="font-mc-mono text-mono text-mc-accent">{pct}%</div>
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
          'bg-[rgb(var(--accent)/0.16)] text-mc-accent',
          'border border-[color:var(--border-accent-mid)]',
          'shadow-[var(--glow-accent-soft)]',
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
          'bg-[rgb(var(--surface-elev))] text-ink-faint',
          'border border-[rgb(var(--border)/0.10)]',
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
        'bg-[rgb(var(--surface-elev))]',
        'border border-[rgb(var(--border)/0.10)]',
      )}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink-faint))]" />
    </span>
  );
}

function Footer(): JSX.Element {
  return (
    <p className="mt-10 font-mc-mono text-mono text-ink-faint flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
      />
      Calibration follows the lessons. Taken after the teaching, not before. That&apos;s when the dashboard turns on.
    </p>
  );
}
