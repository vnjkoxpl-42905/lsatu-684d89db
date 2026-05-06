import { useNavigate } from 'react-router-dom';
import { format, differenceInCalendarDays, startOfDay, differenceInHours } from 'date-fns';
import { Flame, ArrowRight, CalendarDays, Sparkles } from 'lucide-react';
import { ClassroomSection } from './ClassroomSection';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';

interface Props {
  items: ClassroomItem[];
}

interface BootcampProgress {
  completedDays?: number[];
  totalDays?: number;
  percent?: number;
  lastDayAt?: string;
}

function readProgress(item: ClassroomItem): BootcampProgress {
  const meta = (item.metadata_json ?? {}) as Record<string, unknown>;
  const p = (meta.progress ?? {}) as BootcampProgress;
  return p;
}

function totalDaysOf(item: ClassroomItem): number {
  const meta = readProgress(item);
  if (typeof meta.totalDays === 'number') return meta.totalDays;
  if (item.unlock_at && item.due_at) {
    return Math.max(
      1,
      differenceInCalendarDays(new Date(item.due_at), new Date(item.unlock_at)) + 1,
    );
  }
  return 0;
}

export function BootcampsSection({ items }: Props) {
  const navigate = useNavigate();
  const today = startOfDay(new Date());
  const active = items.filter((i) => {
    if (i.type !== 'bootcamp_module') return false;
    if (i.status === 'archived' || i.status === 'completed') return false;
    if (i.unlock_at && new Date(i.unlock_at) > today) return false;
    return true;
  });

  if (active.length === 0) return null;

  return (
    <ClassroomSection title="Bootcamps">
      <div className="space-y-2.5">
        {active.map((it) => {
          const route = resolveItemRoute(it) ?? '/bootcamps';
          const prog = readProgress(it);
          const total = totalDaysOf(it);
          const done = prog.completedDays?.length ?? 0;
          const pct =
            typeof prog.percent === 'number'
              ? prog.percent
              : total > 0
                ? Math.round((done / total) * 100)
                : 0;
          const range =
            it.unlock_at && it.due_at
              ? `${format(new Date(it.unlock_at), 'MMM d')} – ${format(
                  new Date(it.due_at),
                  'MMM d',
                )}`
              : null;

          return (
            <div
              key={it.id}
              className="rounded-xl border border-border/70 bg-card/40 px-4 py-3.5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold leading-snug truncate">
                      {it.title}
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border border-border/60 text-muted-foreground">
                      {it.status === 'in_progress' ? 'In progress' : 'Assigned'}
                    </span>
                  </div>
                  {it.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {it.description}
                    </p>
                  )}
                  {range && (
                    <button
                      type="button"
                      onClick={() => navigate('/schedule')}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <CalendarDays className="w-3 h-3" />
                      {range} · in your calendar
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(route)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Open
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Day {Math.min(done + (done < total ? 1 : 0), total)} of {total}
                    </span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ClassroomSection>
  );
}
