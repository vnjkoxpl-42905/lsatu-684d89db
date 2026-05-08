import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isSameDay, parseISO, isBefore, startOfDay } from 'date-fns';
import { CheckCircle2, Circle, ArrowRight, Lock } from 'lucide-react';
import { ClassroomSection, EmptyHint } from './ClassroomSection';
import { useCurrentWeeklyPlan, type WeeklyPlanItem } from '@/hooks/useWeeklyPlan';

const DAYS_OF_WEEK = 7;

function dayLabel(d: Date) {
  if (isSameDay(d, new Date())) return 'Today';
  return format(d, 'EEE, MMM d');
}

export function ThisWeekSection() {
  const navigate = useNavigate();
  const { data, isLoading } = useCurrentWeeklyPlan();

  const grouped = useMemo(() => {
    if (!data?.plan) return null;
    const start = parseISO(data.plan.week_start);
    const days: { date: Date; items: WeeklyPlanItem[] }[] = [];
    for (let i = 0; i < DAYS_OF_WEEK; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const items = data.items.filter((it) =>
        isSameDay(parseISO(it.day_date), date),
      );
      days.push({ date, items });
    }
    return days;
  }, [data]);

  return (
    <ClassroomSection
      title="This week"
      hint={data?.plan ? data.plan.title : undefined}
    >
      {isLoading ? (
        <EmptyHint>Loading your weekly plan…</EmptyHint>
      ) : !data?.plan ? (
        <EmptyHint>
          No published plan yet. Check back after Joshua publishes one.
        </EmptyHint>
      ) : (
        <div className="space-y-2">
          {grouped!.map(({ date, items }) => {
            const isPast = isBefore(date, startOfDay(new Date())) && !isSameDay(date, new Date());
            return (
            <div
              key={date.toISOString()}
              className={`rounded-lg border border-border/60 bg-card/30 px-4 py-3 transition-opacity ${isPast ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs font-semibold text-foreground/90">
                  {dayLabel(date)}
                </div>
                {items.length === 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    Rest day
                  </span>
                )}
              </div>
              {items.length > 0 && (
                <ul className="space-y-1">
                  {items.map((it) => {
                    const locked = it.unlock_at && new Date(it.unlock_at) > new Date();
                    const done = it.status === 'completed';
                    const Icon = done ? CheckCircle2 : locked ? Lock : Circle;
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          disabled={!!locked}
                          onClick={() =>
                            it.classroom_item_id &&
                            navigate(`/classroom/item/${encodeURIComponent(it.classroom_item_id)}`)
                          }
                          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-sm hover:bg-accent/40 disabled:opacity-60 disabled:cursor-not-allowed transition ease-out active:scale-[0.99]"
                        >
                          <Icon
                            className={
                              done
                                ? 'w-4 h-4 text-emerald-500 shrink-0'
                                : locked
                                  ? 'w-4 h-4 text-muted-foreground shrink-0'
                                  : 'w-4 h-4 text-muted-foreground shrink-0'
                            }
                          />
                          <span className="flex-1 truncate">{it.title}</span>
                          {it.estimated_minutes ? (
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {it.estimated_minutes}m
                            </span>
                          ) : null}
                          {it.classroom_item_id && !locked && (
                            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            );
          })}
        </div>
      )}
    </ClassroomSection>
  );
}
