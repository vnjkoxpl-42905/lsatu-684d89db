import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

export interface DrillLabCard {
  id: string;
  number: string;
  title: string;
  route: string;
  skill: string;
  interaction: string;
  progressLabel: string;
  why: string;
  completed: boolean;
  active?: boolean;
  gatesSimulator?: boolean;
}

export function DynamicDrillLab({
  title,
  description,
  drills,
}: {
  title: string;
  description: string;
  drills: DrillLabCard[];
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="font-mc-mono text-label uppercase tracking-[0.18em] text-ink-faint">{title}</p>
        <p className="mt-1 font-mc-serif text-body text-ink-soft">{description}</p>
      </div>
      <div className="grid gap-3">
        {drills.map((drill) => (
          <Card
            key={drill.id}
            variant="surface"
            interactive
            accent={drill.active || drill.gatesSimulator}
            className="group"
          >
            <div className="flex flex-col gap-4 desktop:flex-row desktop:items-start desktop:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={drill.completed ? 'success' : drill.active ? 'accent' : 'neutral'} dot={drill.active} pulse={drill.active}>
                    {drill.completed ? 'cleared' : drill.progressLabel}
                  </Badge>
                  {drill.gatesSimulator ? <Badge tone="accent">unlocks simulator</Badge> : null}
                </div>
                <h3 className={cn('mt-2 font-mc-serif text-h3 font-semibold leading-tight', drill.active ? 'text-ink' : 'text-ink group-hover:text-mc-accent')}>
                  {drill.number} · {drill.title}
                </h3>
                <p className="mt-2 font-mc-serif text-body-prose leading-relaxed text-ink-soft">{drill.why}</p>
                <div className="mt-3 flex flex-wrap gap-2 font-mc-mono text-mono uppercase tracking-[0.16em] text-ink-faint">
                  <span>{drill.skill}</span>
                  <span aria-hidden="true">/</span>
                  <span>{drill.interaction}</span>
                </div>
              </div>
              <Link
                to={drill.route}
                className={cn(
                  'group/btn shrink-0 inline-flex h-7 items-center justify-center gap-1.5 rounded-[4px] px-3 font-mc-mono text-mono uppercase tracking-[0.18em]',
                  'transition-[transform,box-shadow,background,border-color] duration-150 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                  drill.active || !drill.completed
                    ? cn(
                        'mc-shine bg-[image:var(--grad-accent-strong)] text-[rgb(var(--bg))]',
                        'border border-[color:var(--border-accent-mid)]',
                        'shadow-[0_16px_34px_rgb(var(--bg)/0.4)]',
                        'hover:-translate-y-[2px] hover:border-[color:var(--border-accent-strong)] hover:shadow-[var(--glow-accent-strong)]',
                        'active:translate-y-[0.5px] active:shadow-[var(--shadow-press)]',
                      )
                    : cn(
                        'bg-[rgb(var(--surface-elev)/0.72)] text-[rgb(var(--ink))]',
                        'border border-[rgb(var(--border)/0.10)]',
                        'shadow-[var(--shadow-1)]',
                        'hover:-translate-y-[2px] hover:bg-[rgb(var(--surface-elev))] hover:border-[rgb(var(--border)/0.22)] hover:shadow-[var(--shadow-lift)]',
                        'active:translate-y-[0.5px] active:shadow-[var(--shadow-press)]',
                      ),
                )}
              >
                <span>Open Drill</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
