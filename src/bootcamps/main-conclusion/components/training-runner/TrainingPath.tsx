import { Link } from 'react-router-dom';
import { Check, Award } from 'lucide-react';
import { Tooltip } from '@/bootcamps/main-conclusion/components/primitives/Tooltip';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { PathDot } from '@/bootcamps/main-conclusion/lib/runner';

interface Props {
  dots: PathDot[];
}

export function TrainingPath({ dots }: Props): JSX.Element {
  const doneCount = dots.filter((d) => d.status === 'done').length;
  const total = dots.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <section
      className={cn(
        'rounded-4 p-5',
        'bg-[image:var(--grad-surface-soft)]',
        'border border-[rgb(var(--border)/0.08)]',
        'shadow-[var(--shadow-1)]',
      )}
      aria-label="Lesson path"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">
          Lesson path
        </div>
        <div className="flex items-center gap-2 font-mc-mono text-mono text-ink-faint">
          <span>
            {doneCount} / {total}
          </span>
          <span
            className="relative h-1.5 w-24 rounded-full bg-[rgb(var(--surface-elev))] overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="absolute inset-y-0 left-0 bg-[image:var(--grad-accent-strong)] shadow-[var(--glow-accent-soft)] transition-[width] duration-300 ease-eased"
              style={{ width: `${pct}%` }}
            />
          </span>
        </div>
      </div>
      <ol className="flex flex-wrap items-center gap-1.5">
        {dots.map((d, i) => {
          const label = d.capstone
            ? `Capstone — ${d.title}`
            : `Lesson ${d.number.split('.')[1]} — ${d.title}`;
          return (
            <li key={d.number} className="flex items-center">
              <Tooltip content={label} side="top">
                <Link
                  to={d.href}
                  aria-label={label}
                  className={cn(
                    'group/dot relative inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-1.5',
                    'font-mc-mono text-[11px] font-semibold',
                    'transition-[background,color,border-color,transform,box-shadow] duration-150 ease-eased',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                    d.status === 'done' &&
                      'bg-[rgb(var(--accent)/0.16)] text-mc-accent border border-[color:var(--border-accent-mid)] hover:-translate-y-[1px] shadow-[var(--glow-accent-soft)]',
                    d.status === 'active' &&
                      'bg-[image:var(--grad-accent-strong)] text-mc-accent border border-[color:var(--border-accent-strong)] shadow-[var(--glow-accent-soft),inset_0_1px_0_rgb(255_255_255/0.10)]',
                    d.status === 'upcoming' &&
                      'bg-[rgb(var(--surface-elev))] text-ink-faint border border-[rgb(var(--border)/0.10)] hover:text-ink-soft hover:border-[color:var(--border-accent-soft)]',
                  )}
                >
                  {d.capstone ? (
                    <Award className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
                  ) : d.status === 'done' ? (
                    <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                  ) : (
                    d.number.split('.')[1]
                  )}
                  {d.status === 'active' ? (
                    <span
                      aria-hidden="true"
                      className="absolute -inset-1 rounded-full ring-1 ring-[color:var(--border-accent-strong)] motion-safe:animate-pulse motion-reduce:animate-none"
                    />
                  ) : null}
                </Link>
              </Tooltip>
              {i < dots.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-0.5 h-px w-3',
                    d.status === 'done' || dots[i + 1]?.status === 'done'
                      ? 'bg-[color:var(--border-accent-soft)]'
                      : 'bg-[rgb(var(--border)/0.10)]',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
