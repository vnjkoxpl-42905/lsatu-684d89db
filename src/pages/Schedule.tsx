import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format, isSameDay, isSameMonth, isToday, startOfDay,
  startOfWeek, endOfWeek, eachDayOfInterval, addWeeks,
  subWeeks, addDays, subDays, addMonths, subMonths,
} from 'date-fns';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Flame,
  StickyNote,
  Megaphone,
  FileText,
  Loader2,
  PencilRuler,
  ListChecks,
  UploadCloud,
  Zap,
  Sparkles,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { DayContentProps } from 'react-day-picker';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';
import { useClassroomItems, type ClassroomItem, type ClassroomItemType } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';
import GoogleCalendarPanel from '@/components/schedule/GoogleCalendarPanel';

type CalView = 'month' | 'week' | 'day';

interface TypeMeta {
  label: string;
  short: string;
  dot: string;
  pill: string;
  badge: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TYPE_META: Record<ClassroomItemType, TypeMeta> = {
  homework:        { label: 'Homework',     short: 'HW',     dot: 'bg-rose-500',   pill: 'bg-rose-500/10 text-rose-600 border-rose-200',   badge: 'bg-rose-500/10 text-rose-600 border-rose-500/20',   Icon: BookOpen },
  bootcamp_module: { label: 'Bootcamp',     short: 'Bootcamp', dot: 'bg-amber-500',  pill: 'bg-amber-500/10 text-amber-600 border-amber-200', badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', Icon: Flame },
  note:            { label: 'Note',         short: 'Note',   dot: 'bg-sky-500',    pill: 'bg-sky-500/10 text-sky-600 border-sky-200',     badge: 'bg-sky-500/10 text-sky-600 border-sky-500/20',     Icon: StickyNote },
  announcement:    { label: 'Announcement', short: 'Note',   dot: 'bg-violet-500', pill: 'bg-violet-500/10 text-violet-600 border-violet-200', badge: 'bg-violet-500/10 text-violet-600 border-violet-500/20', Icon: Megaphone },
  session_recap:   { label: 'Recap',        short: 'Recap',  dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', Icon: FileText },
  weekly_plan_task:{ label: 'Weekly plan',  short: 'Plan',   dot: 'bg-indigo-500', pill: 'bg-indigo-500/10 text-indigo-600 border-indigo-200', badge: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', Icon: ListChecks },
  smartboard_recap:{ label: 'Smartboard',   short: 'Board',  dot: 'bg-fuchsia-500', pill: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200', badge: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20', Icon: PencilRuler },
  drill:           { label: 'Drill',        short: 'Drill',  dot: 'bg-cyan-500',   pill: 'bg-cyan-500/10 text-cyan-600 border-cyan-200',   badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',   Icon: Zap },
  activity:        { label: 'Activity',     short: 'Activity', dot: 'bg-emerald-500', pill: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', Icon: Sparkles },
  upload_summary:  { label: 'Upload',       short: 'Upload', dot: 'bg-zinc-500',   pill: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',   badge: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',   Icon: UploadCloud },
};

function itemDate(item: ClassroomItem): Date {
  const raw = item.due_at ?? item.unlock_at ?? item.created_at;
  return startOfDay(new Date(raw));
}

/**
 * For multi-day items (currently bootcamp_module with both unlock_at
 * and due_at), return every day in the range. Other items return a
 * single date.
 */
function itemDates(item: ClassroomItem): Date[] {
  if (item.type === 'bootcamp_module' && item.unlock_at && item.due_at) {
    const start = startOfDay(new Date(item.unlock_at));
    const end = startOfDay(new Date(item.due_at));
    if (end >= start) {
      return eachDayOfInterval({ start, end });
    }
  }
  return [itemDate(item)];
}

function itemMatchesDay(item: ClassroomItem, day: Date): boolean {
  return itemDates(item).some((d) => isSameDay(d, day));
}

interface ScheduleCtx { items: ClassroomItem[] }
const ScheduleContext = React.createContext<ScheduleCtx>({ items: [] });

function CustomDayContent({ date, displayMonth }: DayContentProps) {
  const { items } = React.useContext(ScheduleContext);
  const dayItems = items.filter((it) => itemMatchesDay(it, date));
  const isOutside = !isSameMonth(date, displayMonth);

  const inner = (
    <span className={cn('flex flex-col items-center leading-none', isOutside && 'opacity-25')}>
      <span className="tabular-nums text-sm">{date.getDate()}</span>
      <span className="flex gap-[3px] mt-1 min-h-[6px]">
        {dayItems.slice(0, 3).map((it) => (
          <span key={it.id} className={cn('w-[5px] h-[5px] rounded-full', TYPE_META[it.type].dot)} />
        ))}
      </span>
    </span>
  );

  if (dayItems.length === 0) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block">{inner}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] space-y-1 py-2 px-3">
        {dayItems.map((it) => (
          <div key={it.id} className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', TYPE_META[it.type].dot)} />
            <span className="text-xs">{it.title}</span>
          </div>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

function ViewToggle({ view, onChange }: { view: CalView; onChange: (v: CalView) => void }) {
  const opts: { value: CalView; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
  ];
  return (
    <div className="flex items-center p-0.5 bg-muted/50 rounded-lg border border-border/60 gap-0.5">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            view === o.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function WeekView({ weekAnchor, items, onDayClick }: { weekAnchor: Date; items: ClassroomItem[]; onDayClick: (d: Date) => void }) {
  const days = eachDayOfInterval({
    start: startOfWeek(weekAnchor, { weekStartsOn: 0 }),
    end: endOfWeek(weekAnchor, { weekStartsOn: 0 }),
  });
  return (
    <div className="grid grid-cols-7 gap-2 mt-2">
      {days.map((day) => {
        const dayItems = items.filter((it) => itemMatchesDay(it, day));
        const today = isToday(day);
        return (
          <div
            key={day.toISOString()}
            className="flex flex-col min-h-[160px] cursor-pointer group"
            onClick={() => onDayClick(day)}
          >
            <div className={cn(
              'flex flex-col items-center py-2 rounded-xl mb-2 transition-colors',
              today ? 'bg-foreground text-background' : 'bg-muted/30 text-muted-foreground group-hover:bg-accent',
            )}>
              <span className="text-[10px] uppercase tracking-widest font-medium">{format(day, 'EEE')}</span>
              <span className={cn('text-lg font-semibold tabular-nums leading-tight', today && 'text-background')}>
                {format(day, 'd')}
              </span>
            </div>
            <div className="flex-1 space-y-1 px-0.5">
              {dayItems.map((it) => (
                <div
                  key={it.id}
                  className={cn('px-2 py-1.5 rounded-lg border text-[11px] font-medium leading-tight truncate', TYPE_META[it.type].pill)}
                  onClick={(e) => { e.stopPropagation(); onDayClick(day); }}
                >
                  {it.title}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({ day, items, onItemClick }: { day: Date; items: ClassroomItem[]; onItemClick: (it: ClassroomItem) => void }) {
  const dayItems = items.filter((it) => itemMatchesDay(it, day));
  return (
    <div className="mt-4 space-y-4">
      <div className={cn(
        'px-5 py-4 rounded-2xl border',
        isToday(day) ? 'bg-foreground text-background border-transparent' : 'bg-muted/30 border-border',
      )}>
        <p className={cn('text-[11px] uppercase tracking-[0.2em] font-medium', isToday(day) ? 'text-background/60' : 'text-muted-foreground')}>
          {format(day, 'EEEE')}
        </p>
        <p className={cn('text-3xl font-bold tabular-nums leading-tight', isToday(day) ? 'text-background' : 'text-foreground')}>
          {format(day, 'MMMM d, yyyy')}
        </p>
        {isToday(day) && <p className="text-[11px] text-background/60 mt-0.5">Today</p>}
      </div>

      {dayItems.length > 0 ? (
        <div className="space-y-2.5">
          {dayItems.map((it) => {
            const meta = TYPE_META[it.type];
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onItemClick(it)}
                className={cn('w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-colors hover:bg-accent', meta.pill)}
              >
                <meta.Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{it.title}</p>
                  <p className="text-[11px] opacity-70 mt-0.5">
                    {meta.label}
                    {it.due_at ? ` · Due ${format(new Date(it.due_at), 'MMM d')}` : ''}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No scheduled work yet.</p>
        </div>
      )}
    </div>
  );
}

export default function Schedule() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useClassroomItems();

  const [view, setView] = React.useState<CalView>('month');
  const [monthAnchor, setMonthAnchor] = React.useState<Date>(new Date());
  const [weekAnchor, setWeekAnchor] = React.useState<Date>(new Date());
  const [dayAnchor, setDayAnchor] = React.useState<Date>(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDayAnchor(startOfDay(date));
    setWeekAnchor(date);
    setSheetOpen(true);
  };

  const itemsForSelected = selectedDate ? items.filter((it) => itemMatchesDay(it, selectedDate)) : [];

  const navLabel = React.useMemo(() => {
    if (view === 'month') return format(monthAnchor, 'MMMM yyyy');
    if (view === 'week') {
      const ws = startOfWeek(weekAnchor, { weekStartsOn: 0 });
      const we = endOfWeek(weekAnchor, { weekStartsOn: 0 });
      return isSameMonth(ws, we) ? `${format(ws, 'MMM d')} – ${format(we, 'd, yyyy')}` : `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(dayAnchor, 'EEEE, MMMM d');
  }, [view, monthAnchor, weekAnchor, dayAnchor]);

  const handlePrev = () => {
    if (view === 'month') setMonthAnchor((m) => subMonths(m, 1));
    if (view === 'week') setWeekAnchor((w) => subWeeks(w, 1));
    if (view === 'day') setDayAnchor((d) => subDays(d, 1));
  };
  const handleNext = () => {
    if (view === 'month') setMonthAnchor((m) => addMonths(m, 1));
    if (view === 'week') setWeekAnchor((w) => addWeeks(w, 1));
    if (view === 'day') setDayAnchor((d) => addDays(d, 1));
  };
  const handleToday = () => {
    const t = new Date();
    setMonthAnchor(t);
    setWeekAnchor(t);
    setDayAnchor(startOfDay(t));
  };

  const upcoming = React.useMemo(() => {
    const start = startOfDay(new Date());
    const end = addDays(start, 14);
    return items
      .filter((it) => {
        const d = itemDate(it);
        return d >= start && d <= end;
      })
      .sort((a, b) => itemDate(a).getTime() - itemDate(b).getTime());
  }, [items]);

  const openItem = (it: ClassroomItem) => {
    const route = resolveItemRoute(it);
    if (route) {
      setSheetOpen(false);
      navigate(route);
    }
  };

  return (
    <ScheduleContext.Provider value={{ items }}>
      <TooltipProvider delayDuration={180}>
        <div className="min-h-screen bg-background">
          <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
              <Button variant="ghost" size="sm" onClick={() => navigate('/mainhub')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2">
                <ArrowLeft className="w-4 h-4" />
                Return to Main Hub
              </Button>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Schedule</p>
              <div className="flex items-center gap-1">
                <LogoutButton />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 pb-20">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Study Schedule &amp; Agenda</h1>
                <p className="text-sm text-muted-foreground mt-1.5">Your assigned work, calendared by due date.</p>
              </div>
            </div>

            <div className="mb-8">
              <GoogleCalendarPanel />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center">
                <CalendarDays className="w-6 h-6 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No scheduled work yet.</p>
                <p className="text-xs text-muted-foreground mt-1">When Joshua assigns something it will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-8">
                <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button onClick={handlePrev} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={handleNext} className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border hover:bg-accent text-muted-foreground transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="text-base font-semibold tracking-tight ml-1">{navLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleToday} className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        Today
                      </button>
                      <ViewToggle view={view} onChange={setView} />
                    </div>
                  </div>

                  {view === 'month' && (
                    <DayPicker
                      month={monthAnchor}
                      onMonthChange={setMonthAnchor}
                      mode="single"
                      onDayClick={handleDayClick}
                      showOutsideDays
                      className="w-full"
                      classNames={{
                        months: 'w-full',
                        month: 'w-full',
                        caption: 'hidden',
                        caption_label: '',
                        nav: 'hidden',
                        table: 'w-full border-collapse',
                        head_row: 'grid grid-cols-7 mb-2',
                        head_cell: 'text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium text-center py-1',
                        row: 'grid grid-cols-7',
                        cell: 'text-center p-0.5',
                        day: cn(
                          'w-full h-12 flex items-center justify-center rounded-xl',
                          'cursor-pointer transition-colors duration-100',
                          'hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                        ),
                        day_selected: 'bg-foreground text-background hover:bg-foreground/90',
                        day_today: 'ring-1 ring-foreground/30 font-bold',
                        day_outside: 'opacity-25',
                        day_disabled: 'opacity-20 cursor-not-allowed',
                        day_hidden: 'invisible',
                      }}
                      components={{
                        DayContent: CustomDayContent,
                        IconLeft: () => null,
                        IconRight: () => null,
                      }}
                    />
                  )}

                  {view === 'week' && <WeekView weekAnchor={weekAnchor} items={items} onDayClick={handleDayClick} />}
                  {view === 'day' && <DayView day={dayAnchor} items={items} onItemClick={openItem} />}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">Next 14 Days</h2>
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center">
                      <p className="text-sm text-muted-foreground">Nothing in the next two weeks.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {upcoming.map((it) => {
                        const meta = TYPE_META[it.type];
                        const d = itemDate(it);
                        return (
                          <button
                            type="button"
                            key={it.id}
                            className="w-full text-left flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/40 transition-colors"
                            onClick={() => openItem(it)}
                          >
                            <span className={cn('w-2.5 h-2.5 rounded-full mt-[3px] shrink-0', meta.dot)} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-foreground leading-snug truncate">{it.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {isToday(d) ? 'Today' : format(d, 'EEE, MMM d')}
                              </p>
                            </div>
                            <span className={cn('shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md border', meta.badge)}>
                              {meta.short}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent className="w-full sm:max-w-[420px] flex flex-col gap-0 p-0 overflow-y-auto">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
                <SheetTitle className="text-base font-semibold">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Day'}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedDate ? format(selectedDate, 'yyyy') : ''}
                </p>
              </SheetHeader>

              <div className="flex-1 px-6 py-5 space-y-3">
                {itemsForSelected.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-6">No work assigned for this day.</p>
                ) : (
                  itemsForSelected.map((it) => {
                    const meta = TYPE_META[it.type];
                    const route = resolveItemRoute(it);
                    return (
                      <Card key={it.id} className="p-4 flex items-start gap-3 bg-card shadow-none border-border">
                        <meta.Icon className={cn('w-4 h-4 mt-0.5 shrink-0')} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium leading-snug">{it.title}</p>
                          <p className={cn('inline-block text-[10px] px-1.5 py-0 h-5 leading-5 rounded-md border', meta.badge)}>
                            {meta.label}
                          </p>
                          {it.due_at && (
                            <p className="text-[11px] text-muted-foreground">
                              Due {format(new Date(it.due_at), 'MMM d, h:mm a')}
                            </p>
                          )}
                          {it.unlock_at && (
                            <p className="text-[11px] text-muted-foreground">
                              Unlocks {format(new Date(it.unlock_at), 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                        {route ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSheetOpen(false);
                              navigate(route);
                            }}
                            className="shrink-0 h-8 px-2 text-xs"
                          >
                            Open
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        ) : (
                          <span className="shrink-0 text-[10px] text-muted-foreground italic">No link</span>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </TooltipProvider>
    </ScheduleContext.Provider>
  );
}
